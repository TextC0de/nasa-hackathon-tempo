import * as dotenv from "dotenv";
import type { Config } from "drizzle-kit";

dotenv.config({
  path: ".dev.vars",
  override: true,
});

console.log(process.env.DATABASE_URL);

export default {
  schema: "./src/drizzle-schema.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
  migrations: {
    prefix: 'timestamp', // Usa timestamps en lugar de números secuenciales
  },
  verbose: false,
  strict: true,
} satisfies Config;
