/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE order_line_items (
      id          BIGSERIAL PRIMARY KEY,
      order_id    BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      sku_id      BIGINT NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
      quantity    INTEGER NOT NULL CHECK (quantity > 0),
      unit_price  NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS order_line_items;`);
};
