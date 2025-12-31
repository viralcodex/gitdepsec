import dotenv from 'dotenv';
import { type Config } from 'drizzle-kit';

dotenv.config();

export default {
  schema: './dist/src/db/schema/*',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
} satisfies Config;
