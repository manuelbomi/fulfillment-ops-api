import request from "supertest";
import { pool } from "../../src/db/pool";
import { createApp } from "../../src/app";
import { closeDatabase, insertSku, insertWarehouse, resetDatabase } from "./testDb";

const app = createApp();

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

async function createOrder(opts: {
  warehouseId: number;
  status: string;
  promisedShipDate: Date;
  shippedAt?: Date | null;
}) {
  const orderNumber = `ORD-TEST-${Math.random().toString(36).slice(2, 10)}`;
  const result = await pool.query(
    `INSERT INTO orders (order_number, warehouse_id, customer_name, customer_email, status, promised_ship_date, shipped_at)
     VALUES ($1, $2, 'Test Customer', 'test@example.com', $3, $4, $5)
     RETURNING *`,
    [orderNumber, opts.warehouseId, opts.status, opts.promisedShipDate, opts.shippedAt ?? null],
  );
  return result.rows[0];
}

describe("analytics API", () => {
  it("flags an order whose promised ship date has already passed as breached", async () => {
    const warehouse = await insertWarehouse();
    await createOrder({
      warehouseId: warehouse.id,
      status: "processing",
      promisedShipDate: new Date(Date.now() - 60 * 60 * 1000),
    });

    const res = await request(app).get("/api/analytics/orders-at-risk");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].riskLevel).toBe("breached");
  });

  it("computes fulfillment rate per warehouse from shipped orders", async () => {
    const warehouse = await insertWarehouse();
    const now = new Date();
    // on-time: shipped before the promised date
    await createOrder({
      warehouseId: warehouse.id,
      status: "shipped",
      promisedShipDate: new Date(now.getTime() + 60 * 60 * 1000),
      shippedAt: now,
    });
    // breached: shipped after the promised date
    await createOrder({
      warehouseId: warehouse.id,
      status: "shipped",
      promisedShipDate: new Date(now.getTime() - 60 * 60 * 1000),
      shippedAt: now,
    });

    const res = await request(app).get("/api/analytics/fulfillment-rate?weeks=52");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].shippedOrders).toBe(2);
    expect(res.body[0].fulfillmentRatePct).toBe(50);
  });

  it("flags skus selling below their category average as slow movers", async () => {
    const warehouse = await insertWarehouse();
    const popularSku = await insertSku({ sku_code: "POP-1", category: "Electronics" });
    const slowSku = await insertSku({ sku_code: "SLOW-1", category: "Electronics" });

    const order = await createOrder({
      warehouseId: warehouse.id,
      status: "delivered",
      promisedShipDate: new Date(),
      shippedAt: new Date(),
    });

    await pool.query(
      `INSERT INTO order_line_items (order_id, sku_id, quantity, unit_price) VALUES ($1, $2, 100, 5)`,
      [order.id, popularSku.id],
    );
    await pool.query(
      `INSERT INTO order_line_items (order_id, sku_id, quantity, unit_price) VALUES ($1, $2, 1, 5)`,
      [order.id, slowSku.id],
    );

    const res = await request(app).get("/api/analytics/slow-moving-skus");
    expect(res.status).toBe(200);
    expect(res.body.some((row: { skuCode: string }) => row.skuCode === "SLOW-1")).toBe(true);
    expect(res.body.some((row: { skuCode: string }) => row.skuCode === "POP-1")).toBe(false);
  });

  it("reports warehouse capacity utilization based on in-flight orders", async () => {
    const warehouse = await insertWarehouse({ capacity_units: 10 });
    await createOrder({
      warehouseId: warehouse.id,
      status: "pending",
      promisedShipDate: new Date(Date.now() + 86_400_000),
    });

    const res = await request(app).get("/api/analytics/warehouse-capacity");
    expect(res.status).toBe(200);
    const row = res.body.find((r: { id: number }) => r.id === warehouse.id);
    expect(row.activeOrders).toBe(1);
    expect(row.utilizationPct).toBe(10);
  });
});
