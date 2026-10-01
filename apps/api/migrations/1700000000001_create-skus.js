/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE skus (
      id          BIGSERIAL PRIMARY KEY,
      sku_code    VARCHAR(32) NOT NULL UNIQUE,
      name        VARCHAR(160) NOT NULL,
      category    VARCHAR(60) NOT NULL,
      unit_cost   NUMERIC(10, 2) NOT NULL CHECK (unit_cost >= 0),
      weight_kg   NUMERIC(8, 3) NOT NULL CHECK (weight_kg >= 0),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS skus;`);
};
