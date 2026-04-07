import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const testTable = pgTable("test", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
