import dotenv from "dotenv";

dotenv.config();

// Load environment variables with defaults
export const config = {
  port: parseInt(process.env.PORT ?? "8080", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  openRouterApiKey: process.env.OPEN_ROUTER_KEY ?? "",
  defaultModel: process.env.DEFAULT_MODEL,
  databaseUrl: process.env.DATABASE_URL,
  encryptionKey: process.env.ENCRYPTION_KEY ?? "gitdepsec-2026-secure-key-v1-fallback",
};

export const isProduction = config.nodeEnv === "production";

export const origin = isProduction ? process.env.PROD_ORIGIN : process.env.DEV_ORIGIN;
