import type { webhookConfigs } from "@turbobun/db";
import pg from "pg";
import { ConfigStore } from "./config-store.js";
import { SDKPool } from "./sdk-pool.js";

const CHANNEL = "webhook_configs_changes";

const store = new ConfigStore();
await store.load();

const pool = new SDKPool();
await pool.initialize(store);

const setupRealtimeListener = async () => {
  const client = new pg.Client(process.env.DATABASE_URL);
  await client.connect();

  await client.query(`
    CREATE OR REPLACE FUNCTION notify_webhook_configs_changes()
    RETURNS trigger AS $$
    BEGIN
      PERFORM pg_notify('${CHANNEL}', json_build_object(
        'operation', TG_OP,
        'record', row_to_json(COALESCE(NEW, OLD))
      )::text);
      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `);

  await client.query(`
    DROP TRIGGER IF EXISTS webhook_configs_notify ON webhook_configs;
    CREATE TRIGGER webhook_configs_notify
    AFTER INSERT OR UPDATE OR DELETE ON webhook_configs
    FOR EACH ROW
    EXECUTE FUNCTION notify_webhook_configs_changes();
  `);

  client.on("notification", (msg) => {
    if (msg.channel !== CHANNEL || !msg.payload) {
      return;
    }

    const payload = JSON.parse(msg.payload) as {
      operation: string;
      record: typeof webhookConfigs.$inferSelect;
    };

    const { operation, record } = payload;
    const { serverUrl, apiKey, signingSecret, webhook } = record;

    const handleNotification = async () => {
      switch (operation) {
        case "INSERT": {
          store.set(serverUrl, { apiKey, signingSecret, webhook });
          await pool.add(serverUrl, apiKey);
          console.log(`[INSERT] ${serverUrl} added`);
          break;
        }
        case "UPDATE": {
          const existing = store.get(serverUrl);
          store.set(serverUrl, { apiKey, signingSecret, webhook });

          if (existing?.apiKey !== apiKey) {
            await pool.update(serverUrl, apiKey);
            console.log(`[UPDATE] ${serverUrl} SDK reset (apiKey changed)`);
          } else {
            console.log(`[UPDATE] ${serverUrl} config updated`);
          }
          break;
        }
        case "DELETE": {
          await pool.remove(serverUrl);
          store.delete(serverUrl);
          console.log(`[DELETE] ${serverUrl} removed`);
          break;
        }
        default: {
          console.log(`[${operation}] Unknown operation for ${serverUrl}`);
        }
      }
    };

    handleNotification().catch((error) => {
      console.error(`Error handling ${operation} for ${serverUrl}:`, error);
    });
  });

  client.on("error", (err) => {
    console.error("Postgres listener error:", err);
    process.exit(1);
  });

  await client.query(`LISTEN ${CHANNEL}`);

  console.log(`Listening for changes on ${CHANNEL}`);

  return client;
};

const listener = await setupRealtimeListener();

const shutdown = async () => {
  console.log("Shutting down...");
  await pool.closeAll();
  await listener.end();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
