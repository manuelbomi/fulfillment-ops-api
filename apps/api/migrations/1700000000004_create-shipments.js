/* eslint-disable camelcase */

exports.shorthands = undefined;

const SHIPMENT_STATUSES = ["label_created", "in_transit", "delivered", "exception"];

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE shipments (
      id               BIGSERIAL PRIMARY KEY,
      order_id         BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      warehouse_id     BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
      carrier          VARCHAR(60) NOT NULL,
      tracking_number  VARCHAR(60) NOT NULL UNIQUE,
      status           VARCHAR(20) NOT NULL DEFAULT 'label_created'
                          CHECK (status IN (${SHIPMENT_STATUSES.map((s) => `'${s}'`).join(", ")})),
      shipped_at       TIMESTAMPTZ,
      delivered_at     TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS shipments;`);
};
