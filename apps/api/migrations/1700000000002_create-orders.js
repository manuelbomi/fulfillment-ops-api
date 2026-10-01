/* eslint-disable camelcase */

exports.shorthands = undefined;

// order lifecycle: pending -> processing -> picked -> packed -> shipped -> delivered
// (or cancelled at any point before shipped)
const ORDER_STATUSES = [
  "pending",
  "processing",
  "picked",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE orders (
      id                   BIGSERIAL PRIMARY KEY,
      order_number         VARCHAR(24) NOT NULL UNIQUE,
      warehouse_id         BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
      customer_name        VARCHAR(160) NOT NULL,
      customer_email       VARCHAR(160) NOT NULL,
      status               VARCHAR(20) NOT NULL DEFAULT 'pending'
                              CHECK (status IN (${ORDER_STATUSES.map((s) => `'${s}'`).join(", ")})),
      order_date           TIMESTAMPTZ NOT NULL DEFAULT now(),
      promised_ship_date   TIMESTAMPTZ NOT NULL,
      shipped_at           TIMESTAMPTZ,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS orders;`);
};
