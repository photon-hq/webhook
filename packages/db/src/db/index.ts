import { drizzle } from "drizzle-orm/node-postgres";
import { webhookConfigs } from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const db = drizzle(process.env.DATABASE_URL, {
  schema: { webhookConfigs },
});
