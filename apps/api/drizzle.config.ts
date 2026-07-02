import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const connectionString = process.env.DATABASE_URL;

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  ...(connectionString
    ? {
        dbCredentials: {
          url: connectionString,
        },
      }
    : {}),
});
