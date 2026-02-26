import { pgTable, text, uuid } from "drizzle-orm/pg-core";

export const webhookConfigs = pgTable("webhook_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  serverUrl: text("server_url").notNull().unique(),
  key: text("key").notNull(),
  webhook: text("webhook").notNull(),
});
