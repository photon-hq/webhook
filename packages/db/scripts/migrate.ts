import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

const main = async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const db = drizzle(client);
  await migrate(db, { migrationsFolder: `${import.meta.dirname}/../drizzle` });

  await client.end();
  process.exit(0);
};

void main();
