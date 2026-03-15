import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const webhookConfigs = pgTable(
  "webhook_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    serverUrl: text("server_url").notNull(),
    signingSecret: text("signing_secret").notNull(),
    webhook: text("webhook").notNull(),
    apiKey: text("api_key").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.serverUrl, t.webhook)]
);
