import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  logLevel: process.env.LOG_LEVEL ?? "info",
  databaseUrl:
    process.env.NODE_ENV === "test"
      ? required("TEST_DATABASE_URL", process.env.DATABASE_URL)
      : required("DATABASE_URL"),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
};

export const isProduction = env.nodeEnv === "production";
export const isTest = env.nodeEnv === "test";
