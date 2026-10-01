import { createApp } from "./app";
import { env } from "./config/env";
import { pool } from "./db/pool";
import { logger } from "./utils/logger";

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`fulfillment-ops-api listening on port ${env.port} (${env.nodeEnv})`);
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`received ${signal}, shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
