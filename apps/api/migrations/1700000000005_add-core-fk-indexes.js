/* eslint-disable camelcase */

// Baseline indexes for foreign keys so joins and cascading deletes don't
// require full table scans. The analytics-specific indexes added later
// (see the README's query optimization section) are deliberately kept in
// their own migration so the before/after EXPLAIN ANALYZE comparison is
// easy to reproduce by rolling that one migration back.

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE INDEX idx_orders_warehouse_id ON orders (warehouse_id);
    CREATE INDEX idx_order_line_items_order_id ON order_line_items (order_id);
    CREATE INDEX idx_order_line_items_sku_id ON order_line_items (sku_id);
    CREATE INDEX idx_shipments_order_id ON shipments (order_id);
    CREATE INDEX idx_shipments_warehouse_id ON shipments (warehouse_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_orders_warehouse_id;
    DROP INDEX IF EXISTS idx_order_line_items_order_id;
    DROP INDEX IF EXISTS idx_order_line_items_sku_id;
    DROP INDEX IF EXISTS idx_shipments_order_id;
    DROP INDEX IF EXISTS idx_shipments_warehouse_id;
  `);
};
