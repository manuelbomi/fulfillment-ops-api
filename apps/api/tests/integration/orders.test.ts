import request from "supertest";
import { createApp } from "../../src/app";
import { closeDatabase, insertSku, insertWarehouse, resetDatabase } from "./testDb";

const app = createApp();

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

describe("orders API", () => {
  it("creates an order with line items and returns them on fetch", async () => {
    const warehouse = await insertWarehouse();
    const sku = await insertSku();

    const createRes = await request(app)
      .post("/api/orders")
      .send({
        warehouseId: warehouse.id,
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        promisedShipDate: new Date(Date.now() + 86_400_000).toISOString(),
        lineItems: [{ skuId: sku.id, quantity: 2, unitPrice: 19.99 }],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe("pending");

    const getRes = await request(app).get(`/api/orders/${createRes.body.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.lineItems).toHaveLength(1);
    expect(getRes.body.lineItems[0]).toMatchObject({ skuId: sku.id, quantity: 2 });
  });

  it("rejects an order with no line items", async () => {
    const warehouse = await insertWarehouse();
    const res = await request(app)
      .post("/api/orders")
      .send({
        warehouseId: warehouse.id,
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        promisedShipDate: new Date().toISOString(),
        lineItems: [],
      });
    expect(res.status).toBe(400);
  });

  it("transitions order status and sets shippedAt when marked shipped", async () => {
    const warehouse = await insertWarehouse();
    const sku = await insertSku();
    const createRes = await request(app)
      .post("/api/orders")
      .send({
        warehouseId: warehouse.id,
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        promisedShipDate: new Date(Date.now() + 86_400_000).toISOString(),
        lineItems: [{ skuId: sku.id, quantity: 1, unitPrice: 9.99 }],
      });

    const statusRes = await request(app)
      .patch(`/api/orders/${createRes.body.id}/status`)
      .send({ status: "shipped" });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe("shipped");
    expect(statusRes.body.shippedAt).not.toBeNull();
  });

  it("filters orders by status", async () => {
    const warehouse = await insertWarehouse();
    const sku = await insertSku();
    await request(app)
      .post("/api/orders")
      .send({
        warehouseId: warehouse.id,
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        promisedShipDate: new Date(Date.now() + 86_400_000).toISOString(),
        lineItems: [{ skuId: sku.id, quantity: 1, unitPrice: 9.99 }],
      });

    const res = await request(app).get("/api/orders?status=pending");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((o: { status: string }) => o.status === "pending")).toBe(true);
  });
});
