/**
 * Generates a realistic, reasonably-sized synthetic dataset so the
 * analytics endpoints and the query-optimization work in the README mean
 * something. Safe to re-run: it truncates and regenerates every table.
 *
 * Usage: npm run seed --workspace apps/api
 */
import { faker } from "@faker-js/faker";
import { Pool } from "pg";
import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run the seed script");
}

const pool = new Pool({ connectionString: DATABASE_URL });

const WAREHOUSE_COUNT = 8;
const SKU_COUNT = 180;
const ORDER_COUNT = 6000;
const ORDER_HISTORY_DAYS = 180;

const CATEGORIES = [
  "Electronics",
  "Apparel",
  "Home & Garden",
  "Sporting Goods",
  "Toys & Games",
  "Grocery",
  "Office Supplies",
  "Health & Beauty",
];

type OrderStatus =
  | "pending"
  | "processing"
  | "picked"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

// Weighted so most orders in the history are fully resolved, with a
// realistic slice still in flight (which is what the "orders at risk"
// analytics query looks for).
const STATUS_WEIGHTS: Array<[OrderStatus, number]> = [
  ["delivered", 58],
  ["shipped", 22],
  ["cancelled", 4],
  ["packed", 5],
  ["picked", 4],
  ["processing", 4],
  ["pending", 3],
];

function pickWeighted<T>(weights: Array<[T, number]>): T {
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [value, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return weights[weights.length - 1][0];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

async function chunkedInsert(
  table: string,
  columns: string[],
  rows: unknown[][],
  chunkSize = 500,
): Promise<void> {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values: unknown[] = [];
    const placeholders = chunk
      .map((row, rowIndex) => {
        const base = rowIndex * columns.length;
        const cells = row.map((_, colIndex) => `$${base + colIndex + 1}`);
        values.push(...row);
        return `(${cells.join(", ")})`;
      })
      .join(", ");
    await pool.query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}`,
      values,
    );
  }
}

async function main(): Promise<void> {
  console.log("truncating existing data...");
  await pool.query(
    "TRUNCATE TABLE shipments, order_line_items, orders, skus, warehouses RESTART IDENTITY CASCADE",
  );

  console.log(`seeding ${WAREHOUSE_COUNT} warehouses...`);
  const warehouseReliability: number[] = [];
  const warehouseRows: unknown[][] = [];
  const usedCodes = new Set<string>();
  for (let i = 0; i < WAREHOUSE_COUNT; i++) {
    let code = faker.location.state({ abbreviated: true }) + "-" + randomInt(1, 9);
    while (usedCodes.has(code)) code = faker.location.state({ abbreviated: true }) + "-" + randomInt(1, 9);
    usedCodes.add(code);
    warehouseRows.push([
      code,
      `${faker.location.city()} Fulfillment Center`,
      faker.location.city(),
      faker.location.state(),
      "US",
      randomInt(400, 1200),
    ]);
    // Each warehouse gets a hidden "reliability" score driving how often
    // it ships on time, so the fulfillment-rate-by-warehouse chart has
    // real variation instead of flat lines.
    warehouseReliability.push(0.62 + Math.random() * 0.33);
  }
  await chunkedInsert(
    "warehouses",
    ["code", "name", "city", "state", "country", "capacity_units"],
    warehouseRows,
  );

  console.log(`seeding ${SKU_COUNT} skus...`);
  const skuRows: unknown[][] = [];
  const usedSkuCodes = new Set<string>();
  for (let i = 0; i < SKU_COUNT; i++) {
    let skuCode = faker.string.alphanumeric({ length: 8, casing: "upper" });
    while (usedSkuCodes.has(skuCode)) skuCode = faker.string.alphanumeric({ length: 8, casing: "upper" });
    usedSkuCodes.add(skuCode);
    const category = faker.helpers.arrayElement(CATEGORIES);
    const unitCost = Number(faker.commerce.price({ min: 3, max: 240 }));
    skuRows.push([
      skuCode,
      faker.commerce.productName(),
      category,
      unitCost,
      Number((Math.random() * 9 + 0.1).toFixed(3)),
    ]);
  }
  await chunkedInsert(
    "skus",
    ["sku_code", "name", "category", "unit_cost", "weight_kg"],
    skuRows,
  );

  const { rows: skuIdRows } = await pool.query<{ id: number; unit_cost: string }>(
    "SELECT id, unit_cost FROM skus",
  );

  // A slice of SKUs is deliberately made "slow moving": only referenced by
  // a small number of orders near the end of the loop, so the slow-moving
  // SKU analytics query has real signal instead of a flat distribution.
  const slowMoverIds = new Set(
    faker.helpers.arrayElements(skuIdRows, Math.floor(skuIdRows.length * 0.25)).map((r) => r.id),
  );

  console.log(`seeding ${ORDER_COUNT} orders with line items and shipments...`);
  const now = new Date();
  const orderRows: unknown[][] = [];
  const orderStatuses: OrderStatus[] = [];
  const orderNumbers: string[] = [];

  for (let i = 0; i < ORDER_COUNT; i++) {
    const status = pickWeighted(STATUS_WEIGHTS);
    const isInFlight = ["pending", "processing", "picked", "packed"].includes(status);

    // In-flight orders are recent (last few days); resolved orders are
    // spread across the full history window.
    const daysAgo = isInFlight ? randomInt(0, 3) : randomInt(0, ORDER_HISTORY_DAYS);
    const orderDate = addHours(now, -daysAgo * 24 - randomInt(0, 23));
    const slaWindowHours = randomInt(24, 96);
    const promisedShipDate = addHours(orderDate, slaWindowHours);

    const warehouseIndex = randomInt(0, WAREHOUSE_COUNT - 1);
    const reliability = warehouseReliability[warehouseIndex];

    let shippedAt: Date | null = null;
    if (status === "shipped" || status === "delivered") {
      const onTime = Math.random() < reliability;
      const shipOffsetHours = onTime
        ? randomInt(1, Math.max(2, slaWindowHours - 2))
        : slaWindowHours + randomInt(1, 48);
      shippedAt = addHours(orderDate, shipOffsetHours);
    }

    const orderNumber = `ORD-${orderDate.getFullYear()}${String(i).padStart(6, "0")}`;
    orderNumbers.push(orderNumber);
    orderStatuses.push(status);

    orderRows.push([
      orderNumber,
      warehouseIndex + 1,
      faker.person.fullName(),
      faker.internet.email().toLowerCase(),
      status,
      orderDate,
      promisedShipDate,
      shippedAt,
    ]);
  }

  await chunkedInsert(
    "orders",
    [
      "order_number",
      "warehouse_id",
      "customer_name",
      "customer_email",
      "status",
      "order_date",
      "promised_ship_date",
      "shipped_at",
    ],
    orderRows,
  );

  const { rows: insertedOrders } = await pool.query<{
    id: number;
    order_number: string;
    status: OrderStatus;
    warehouse_id: number;
    shipped_at: Date | null;
  }>("SELECT id, order_number, status, warehouse_id, shipped_at FROM orders");
  const orderByNumber = new Map(insertedOrders.map((o) => [o.order_number, o]));

  console.log("seeding order line items...");
  const lineItemRows: unknown[][] = [];
  const popularSkuIds = skuIdRows.filter((s) => !slowMoverIds.has(s.id));
  for (const orderNumber of orderNumbers) {
    const order = orderByNumber.get(orderNumber)!;
    const itemCount = randomInt(1, 4);
    for (let j = 0; j < itemCount; j++) {
      // 85% of line items pull from the "popular" pool so the slow movers
      // genuinely sit below the category average.
      const pool_ = Math.random() < 0.85 && popularSkuIds.length ? popularSkuIds : skuIdRows;
      const sku = faker.helpers.arrayElement(pool_);
      const quantity = randomInt(1, 6);
      const unitPrice = Number((Number(sku.unit_cost) * (1.15 + Math.random() * 0.6)).toFixed(2));
      lineItemRows.push([order.id, sku.id, quantity, unitPrice]);
    }
  }
  await chunkedInsert(
    "order_line_items",
    ["order_id", "sku_id", "quantity", "unit_price"],
    lineItemRows,
  );

  console.log("seeding shipments...");
  const shipmentRows: unknown[][] = [];
  let trackingCounter = 1;
  for (const order of insertedOrders) {
    if (!["packed", "shipped", "delivered"].includes(order.status)) continue;
    const carrier = faker.helpers.arrayElement(["UPS", "FedEx", "USPS", "DHL"]);
    const trackingNumber = `TRK${String(trackingCounter++).padStart(9, "0")}`;
    let shipmentStatus: string;
    let deliveredAt: Date | null = null;
    if (order.status === "packed") {
      shipmentStatus = "label_created";
    } else if (order.status === "shipped") {
      shipmentStatus = Math.random() < 0.9 ? "in_transit" : "exception";
    } else {
      shipmentStatus = "delivered";
      deliveredAt = order.shipped_at ? addHours(order.shipped_at, randomInt(24, 96)) : null;
    }
    shipmentRows.push([
      order.id,
      order.warehouse_id,
      carrier,
      trackingNumber,
      shipmentStatus,
      order.shipped_at,
      deliveredAt,
    ]);
  }
  await chunkedInsert(
    "shipments",
    ["order_id", "warehouse_id", "carrier", "tracking_number", "status", "shipped_at", "delivered_at"],
    shipmentRows,
  );

  console.log(
    `done: ${warehouseRows.length} warehouses, ${skuRows.length} skus, ${orderRows.length} orders, ` +
      `${lineItemRows.length} line items, ${shipmentRows.length} shipments`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
