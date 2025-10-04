import { timestamp } from "drizzle-orm/pg-core";

// Function to create fresh timestamp columns for each table
// This prevents object sharing issues between different tables
export const createTimestampColumns = () => ({
  createdAt: timestamp("created_at", {
    mode: "string",
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    mode: "string",
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", {
    mode: "string",
    withTimezone: true,
  }),
});

// Legacy - Do not use this in new tables, use createTimestampColumns() instead
export const TIMESTAMP_COLUMNS = createTimestampColumns();
