import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { analyticsRouter } from "./routes/analytics.routes";
import { ordersRouter } from "./routes/orders.routes";
import { shipmentsRouter } from "./routes/shipments.routes";
import { skusRouter } from "./routes/skus.routes";
import { warehousesRouter } from "./routes/warehouses.routes";
import { logger } from "./utils/logger";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.webOrigin }));
  app.use(express.json());
  app.use(
    pinoHttp({
      logger,
      autoLogging: env.nodeEnv !== "test",
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/warehouses", warehousesRouter);
  app.use("/api/skus", skusRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/shipments", shipmentsRouter);
  app.use("/api/analytics", analyticsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
