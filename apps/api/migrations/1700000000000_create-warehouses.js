/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE warehouses (
      id              BIGSERIAL PRIMARY KEY,
      code            VARCHAR(16) NOT NULL UNIQUE,
      name            VARCHAR(120) NOT NULL,
      city            VARCHAR(120) NOT NULL,
      state           VARCHAR(60) NOT NULL,
      country         VARCHAR(60) NOT NULL DEFAULT 'US',
      capacity_units  INTEGER NOT NULL CHECK (capacity_units > 0),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS warehouses;`);
};
