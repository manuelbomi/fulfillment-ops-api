# fulfillment-ops-api

A production-style order-fulfillment and logistics analytics platform: an
Express/TypeScript REST API backed by PostgreSQL, with a React/TypeScript
dashboard on top. It models a simplified warehouse network — warehouses,
SKUs, orders, order line items, and shipments — and ships with real
synthetic data (50,000 orders) so the analytics and query-optimization work
below means something.

```
┌─────────────────────┐        HTTP/JSON        ┌──────────────────────────┐
│   React dashboard    │ ───────────────────────▶│   Express + TypeScript   │
│   (apps/web, Vite)   │◀─────────────────────── │   REST API (apps/api)    │
└─────────────────────┘                          └────────────┬─────────────┘
   orders table + filters                                      │ pg (connection pool)
   order volume / SLA chart                                    ▼
   warehouse capacity view                        ┌──────────────────────────┐
                                                    │       PostgreSQL          │
                                                    │  warehouses · skus        │
                                                    │  orders · order_line_items│
                                                    │  shipments                │
                                                    └──────────────────────────┘
```

The API is layered: `routes` → `controllers` → `services` → `repositories`,
with `zod` validating every request body/query, a centralized error-handling
middleware translating typed errors into HTTP responses, and `pino` for
structured logs.

## Table of contents

- [Quickstart](#quickstart)
- [Project layout](#project-layout)
- [Schema](#schema)
- [API endpoints](#api-endpoints)
- [Query optimization: three analytics queries, measured](#query-optimization-three-analytics-queries-measured)
- [Testing](#testing)
- [At 10x scale](#at-10x-scale)

## Quickstart

Requirements: Node 20+, Docker.

```bash
git clone <this-repo>
cd fulfillment-ops-api
npm install

# 1. Start Postgres (host port 55432, since 5432 is often already taken)
docker compose up -d db

# 2. Configure the api
cp apps/api/.env.example apps/api/.env
# .env already points at the docker-compose db on port 55432

# 3. Run migrations and seed realistic data (8 warehouses, 180 skus,
#    50,000 orders, ~125k order line items)
npm run migrate --workspace apps/api
npm run seed --workspace apps/api

# 4. Run the api
npm run dev:api
# -> http://localhost:4000/health

# 5. In a second terminal, run the dashboard
cp apps/web/.env.example apps/web/.env
npm run dev:web
# -> http://localhost:5173
```

To run the API fully dockerized instead of with `npm run dev:api`:

```bash
docker compose up -d --build
```

### Running tests

```bash
# create a dedicated test database once
docker exec fulfillment-ops-db psql -U fulfillment -d fulfillment_ops -c \
  "CREATE DATABASE fulfillment_ops_test;"

# point migrations at it, then run the backend test suite
DATABASE_URL=postgresql://fulfillment:fulfillment@localhost:55432/fulfillment_ops_test \
  npm run migrate --workspace apps/api

npm run test:api
npm run test:web
```

## Project layout

```
apps/
  api/
    src/
      routes/        thin express routers
      controllers/    req/res glue only
      services/       business logic (SLA breach rules, DTO shaping)
      repositories/    all SQL lives here
      schemas/        zod request validation
      middleware/     validate(), centralized error handler
      db/             pg Pool, transaction helper
    migrations/       versioned node-pg-migrate migrations
    scripts/seed.ts    synthetic data generator
    tests/
      unit/           service-layer logic, no database
      integration/     supertest against a real Postgres test database
  web/
    src/
      components/      OrdersTable, OrderFilters, OrderVolumeChart, WarehouseCapacity
      api/client.ts    typed fetch wrapper
      hooks/useAsync.ts
```

## Schema

Five tables, migrated with [node-pg-migrate](https://github.com/salsita/node-pg-migrate)
(see `apps/api/migrations`, applied in order):

| Table | Purpose | Key columns |
|---|---|---|
| `warehouses` | Fulfillment centers | `capacity_units` (used for the utilization view) |
| `skus` | Catalog items | `category`, `unit_cost`, `weight_kg` |
| `orders` | Customer orders | `warehouse_id` FK, `status`, `order_date`, `promised_ship_date` (the SLA), `shipped_at` |
| `order_line_items` | Order ↔ SKU, many-to-many with quantity/price | `order_id` FK, `sku_id` FK |
| `shipments` | One (optional) shipment per order once it's packed | `order_id` FK, `warehouse_id` FK, `status` |

An order is considered **SLA-breached** if it shipped after `promised_ship_date`,
or if it's still unshipped (and not cancelled) past that date — see
`isSlaBreached` in `apps/api/src/services/orders.service.ts`, which has its
own unit tests since that rule is used both in the API response shape and
mirrored in SQL for the analytics queries.

Indexes, in the order they were added:

- `idx_orders_warehouse_id`, `idx_order_line_items_order_id`,
  `idx_order_line_items_sku_id`, `idx_shipments_order_id`,
  `idx_shipments_warehouse_id` — baseline foreign-key indexes (migration `...005`).
- `idx_orders_status_promised_ship_date`, `idx_orders_status_order_date`,
  `idx_order_line_items_sku_order_covering` — added specifically for the
  three analytics queries below (migration `...006`), explained next.

## API endpoints

CRUD for the core entities (`/api/warehouses`, `/api/skus`, `/api/orders`,
`/api/shipments`), plus the analytics endpoints backing the dashboard:

| Endpoint | What it answers |
|---|---|
| `GET /api/analytics/orders-at-risk` | Which unshipped orders are breached or about to breach SLA, ranked per warehouse |
| `GET /api/analytics/fulfillment-rate` | Weekly on-time-ship rate per warehouse |
| `GET /api/analytics/slow-moving-skus` | SKUs selling below their category average |
| `GET /api/analytics/warehouse-capacity` | Active (in-warehouse) orders vs. stated capacity |
| `GET /api/analytics/order-volume` | Daily order volume and SLA breach counts, for the dashboard chart |

## Query optimization: three analytics queries, measured

All numbers below were captured with `EXPLAIN (ANALYZE, BUFFERS)` against the
seeded dataset in this repo's own Docker Postgres: **50,000 orders, 125,234
order line items**, run on 2026-10-01. Nothing here is estimated — the
before/after queries, index DDL, and `EXPLAIN` output are reproducible with
`npm run seed --workspace apps/api` followed by the migration/rollback
commands in `apps/api/migrations/1700000000006_add-analytics-indexes.js`.

### 1. Orders at risk of SLA breach

The original query filtered on a *derived* expression
(`EXTRACT(EPOCH FROM (promised_ship_date - now())) / 3600 < 72`) combined
with `status NOT IN (...)`. That's not sargable — Postgres can't use a btree
index against a computed expression, so even after adding
`idx_orders_status_promised_ship_date` the planner kept choosing a full
`Seq Scan` on `orders`.

The fix was to rewrite the predicate in terms of the raw columns —
`status IN ('pending','processing','picked','packed') AND promised_ship_date
< now() + interval '72 hours'` — which *is* sargable against the index:

| | Plan | Execution time |
|---|---|---|
| Before (no index, derived-expression filter) | `Seq Scan on orders` (scans all 50,000 rows, filters down to 7,555) | **19.12 ms** |
| After (composite index + sargable rewrite) | `Bitmap Index Scan` on `idx_orders_status_order_date` → `Bitmap Heap Scan` | **16.31 ms** |

~15% faster, and the important part isn't really the milliseconds at this
data size — it's that the plan stopped scanning the full table. The lesson
documented here for anyone reading the code: **an index on the right columns
doesn't help if the WHERE clause isn't written in terms of those columns.**

### 2. Fulfillment rate by warehouse over time

Filters on `status IN ('shipped','delivered') AND order_date >= now() -
interval '12 weeks'` — already sargable, so this one is a more conventional
index win from `idx_orders_status_order_date`:

| | Plan | Execution time |
|---|---|---|
| Before | `Seq Scan on orders`, filtering 50,000 rows down to 18,654 | **23.25 ms** |
| After | `Bitmap Index Scan` on `idx_orders_status_order_date` → `Bitmap Heap Scan` | **17.35 ms** |

~25% faster end-to-end.

### 3. Top slow-moving SKUs

This was the biggest win, and index DDL alone didn't fix it — the query
needed restructuring. The original query joined `skus` → `order_line_items`
→ `orders` *before* grouping by SKU (to get `MAX(order_date)` as "last
ordered"), which forced Postgres to sort all 125,234 joined rows for the
`GROUP BY`. With the default `work_mem`, that sort spilled to disk:

```
Sort Method: external merge  Disk: 10520kB
Execution Time: 135.960 ms
```

The fix: split it into two queries. The first aggregates
`order_line_items` by `sku_id` alone (`SUM(quantity)`, `COUNT(DISTINCT
order_id)`) — no join to `orders` needed for that — which lets
`idx_order_line_items_sku_order_covering (sku_id, order_id) INCLUDE
(quantity)` satisfy the whole `GROUP BY` with an **index-only scan**, no sort
at all. "Last ordered at" genuinely does need a join to `orders`, but there's
no reason to pay for it across all 180 SKUs when only ~20 end up in the
result — so that's resolved in a second, cheap query scoped to just the
SKUs the first query returned.

| | Plan | Execution time |
|---|---|---|
| Before (single query, join-then-sort) | `GroupAggregate` over a `Sort` that spills to disk (10.5MB) | **135.96 ms** |
| After, query 1/2 (aggregate via covering index) | `Index Only Scan` on `idx_order_line_items_sku_order_covering`, `Heap Fetches: 0`, no sort | **17.94 ms** |
| After, query 2/2 (last-ordered-at for the ~20 results) | `Index Only Scan` + nested loop into `orders` | **17.73 ms** |

Combined, ~35.7 ms vs. 135.96 ms before — **about 74% faster**, and the
aggregation step itself (the part that used to spill to disk) is ~87%
faster in isolation. See `apps/api/src/repositories/analytics.repository.ts`
for the actual implementation and inline comments.

## Testing

- **Backend**: `npm run test:api` — supertest integration tests against a
  real Postgres test database (`fulfillment_ops_test`), covering CRUD,
  validation errors, order status transitions, and each analytics query
  against hand-inserted fixture rows; plus unit tests for the SLA-breach
  rule and the validation middleware.
- **Frontend**: `npm run test:web` — vitest + Testing Library component
  tests for the orders table, filters, and warehouse capacity view.

## At 10x scale

A few things that would change at 10x the order volume (~500k orders/month
and growing):

- **Partition `orders` and `order_line_items` by month** on `order_date`.
  Most queries (including all three analytics ones above) already filter
  on a recent date range, so partition pruning would shrink the scanned
  data without touching application code.
- **Materialize the heavier aggregates.** `fulfillment-rate` and
  `slow-moving-skus` don't need to be computed live on every dashboard
  load; a materialized view refreshed every few minutes (or an
  incrementally-updated summary table written at order-status-change time)
  would turn those into index lookups against pre-aggregated data.
- **Move `orders-at-risk` to be event-driven** instead of polled: an
  SLA-breach is a time-based transition, which is a natural fit for a
  background job (or a `pg_cron` job) that flags/notifies rather than a
  query scanning for it on every request.
- **Split the write and read paths.** A read replica for the dashboard and
  analytics endpoints would isolate reporting load from the OLTP path that
  order creation and status updates depend on.
- **Revisit `work_mem` and connection pooling.** The disk-spill in the
  slow-movers query before the rewrite is exactly the kind of problem that
  reappears at scale if query shapes aren't watched; pairing a pooler
  (PgBouncer) with per-query `work_mem` tuning for the handful of
  genuinely aggregate-heavy endpoints would be worth it before reaching
  for bigger hardware.

## License

MIT — see [LICENSE](./LICENSE).
