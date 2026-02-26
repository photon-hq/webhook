import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const webhookConfigs = pgTable("webhook_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  serverUrl: text("server_url").notNull().unique(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  webhook: text("webhook").notNull(),
  apiKey: text("api_key").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
