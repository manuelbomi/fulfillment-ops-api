import { pool } from "../../src/db/pool";

/**
 * Wipes every table between tests so integration tests stay independent
 * of each other and of whatever the dev seed script last generated.
 * RESTART IDENTITY keeps generated ids small and predictable.
 */
export async function resetDatabase(): Promise<void> {
  await pool.query(
    "TRUNCATE TABLE shipments, order_line_items, orders, skus, warehouses RESTART IDENTITY CASCADE",
  );
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}

export async function insertWarehouse(overrides: Partial<Record<string, unknown>> = {}) {
  const defaults = {
    code: "WH-1",
    name: "Test Warehouse",
    city: "Testville",
    state: "TS",
    country: "US",
    capacity_units: 500,
  };
  const row = { ...defaults, ...overrides };
  const result = await pool.query(
    `INSERT INTO warehouses (code, name, city, state, country, capacity_units)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [row.code, row.name, row.city, row.state, row.country, row.capacity_units],
  );
  return result.rows[0];
}

export async function insertSku(overrides: Partial<Record<string, unknown>> = {}) {
  const defaults = {
    sku_code: "SKU-1",
    name: "Test Sku",
    category: "Electronics",
    unit_cost: 10,
    weight_kg: 1.2,
  };
  const row = { ...defaults, ...overrides };
  const result = await pool.query(
    `INSERT INTO skus (sku_code, name, category, unit_cost, weight_kg)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [row.sku_code, row.name, row.category, row.unit_cost, row.weight_kg],
  );
  return result.rows[0];
}
