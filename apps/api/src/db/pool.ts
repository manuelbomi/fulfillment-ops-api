import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  logger.error({ err }, "unexpected postgres pool error");
});

/**
 * Runs a single query against the pool. Prefer this for simple,
 * single-statement operations that don't need a shared transaction.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params as unknown[]);
  const duration = Date.now() - start;
  if (duration > 200) {
    logger.warn({ duration, text }, "slow query");
  }
  return result;
}

/**
 * Runs `work` inside a single transaction, committing on success and
 * rolling back if `work` throws. Used whenever a request needs to write
 * to more than one table atomically (e.g. creating an order with its
 * line items).
 */
export async function withTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
