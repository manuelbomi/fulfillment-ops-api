/* eslint-disable camelcase */

// Indexes that back the three non-trivial analytics queries documented in
// the README's "query optimization" section:
//   - orders-at-risk filters on (status, promised_ship_date)
//   - fulfillment-rate-by-warehouse filters on (status, order_date)
//   - slow-moving-skus aggregates order_line_items grouped by sku_id and
//     needs order_id/quantity alongside it, so a covering index lets
//     Postgres satisfy that GROUP BY without a separate sort step.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE INDEX idx_orders_status_promised_ship_date
      ON orders (status, promised_ship_date);

    CREATE INDEX idx_orders_status_order_date
      ON orders (status, order_date);

    CREATE INDEX idx_order_line_items_sku_order_covering
      ON order_line_items (sku_id, order_id) INCLUDE (quantity);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_orders_status_promised_ship_date;
    DROP INDEX IF EXISTS idx_orders_status_order_date;
    DROP INDEX IF EXISTS idx_order_line_items_sku_order_covering;
  `);
};
