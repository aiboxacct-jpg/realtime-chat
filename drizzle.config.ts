import { defineConfig } from "drizzle-kit";

// Reads TURSO_DATABASE_URL / TURSO_AUTH_TOKEN from the environment
// (drizzle-kit loads .env automatically).
export default defineConfig({
  dialect: "turso",
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
