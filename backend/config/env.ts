import dotenv from "dotenv";

const toPositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

dotenv.config();

// Load environment variables with defaults
export const config = {
  port: toPositiveInt(process.env.PORT, 8080),
  nodeEnv: process.env.NODE_ENV ?? "development",
  openRouterApiKey: process.env.OPEN_ROUTER_KEY ?? "",
  defaultModel: process.env.DEFAULT_MODEL,
  databaseUrl: process.env.DATABASE_URL,
  encryptionKey: process.env.ENCRYPTION_KEY ?? "gitdepsec-2026-secure-key-v1-fallback",
  tokenBucket: {
    capacity: toPositiveInt(process.env.TOKEN_BUCKET_CAPACITY, 30),
    refillRate: toPositiveNumber(process.env.TOKEN_BUCKET_REFILL_RATE, 0.5),
    costByRoute: {
      general: toPositiveNumber(process.env.TOKEN_COST_GENERAL, 1),
      audit: toPositiveNumber(process.env.TOKEN_COST_AUDIT, 3),
      summary: toPositiveNumber(process.env.TOKEN_COST_SUMMARY, 2),
      fixplan: toPositiveNumber(process.env.TOKEN_COST_FIXPLAN, 4),
      inline: toPositiveNumber(process.env.TOKEN_COST_INLINE, 1),
    },
  },
};

export const isProduction = config.nodeEnv === "production";

export const origin = isProduction ? process.env.PROD_ORIGIN : process.env.DEV_ORIGIN;
