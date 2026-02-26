import { db, webhookConfigs } from "@turbobun/db";
import pg from "pg";

const CHANNEL = "webhook_configs_changes";

const setupRealtimeListener = async () => {
  const client = new pg.Client(process.env.DATABASE_URL);
  await client.connect();

  await client.query(`
    CREATE OR REPLACE FUNCTION notify_webhook_configs_changes()
    RETURNS trigger AS $$
    BEGIN
      PERFORM pg_notify('${CHANNEL}', json_build_object(
        'operation', TG_OP,
        'record', row_to_json(NEW)
      )::text);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await client.query(`
    DROP TRIGGER IF EXISTS webhook_configs_notify ON webhook_configs;
    CREATE TRIGGER webhook_configs_notify
    AFTER INSERT OR UPDATE ON webhook_configs
    FOR EACH ROW
    EXECUTE FUNCTION notify_webhook_configs_changes();
  `);

  client.on("notification", (msg) => {
    if (msg.channel === CHANNEL && msg.payload) {
      const payload = JSON.parse(msg.payload) as {
        operation: string;
        record: typeof webhookConfigs.$inferSelect;
      };
      console.log(
        `[${payload.operation}] webhook_config updated:`,
        payload.record.serverUrl
      );
    }
  });

  client.on("error", (err) => {
    console.error("Postgres listener error:", err);
    process.exit(1);
  });

  await client.query(`LISTEN ${CHANNEL}`);

  console.log(`Listening for changes on ${CHANNEL}`);

  return client;
};

const configs = await db.select().from(webhookConfigs);
console.log(`Loaded ${configs.length} webhook configs`);

const listener = await setupRealtimeListener();

const shutdown = async () => {
  console.log("Shutting down...");
  await listener.end();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
