import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const path = resolve(".env");
if (!existsSync(path)) {
  console.error("Falta .env");
  process.exit(1);
}
for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
  const eq = trimmed.indexOf("=");
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  if (process.env[key] === undefined) process.env[key] = value;
}

if (process.env.RESET_SCHEMA !== "1") {
  console.error("Define RESET_SCHEMA=1 para vaciar el esquema public.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  await pool.query("DROP SCHEMA public CASCADE");
  await pool.query("CREATE SCHEMA public");
  await pool.query("GRANT ALL ON SCHEMA public TO neondb_owner");
  await pool.query("GRANT ALL ON SCHEMA public TO public");
  const tables = await pool.query("select count(*)::int as total from information_schema.tables where table_schema = 'public'");
  console.log(`Esquema public vaciado. Tablas restantes: ${tables.rows[0].total}`);
} finally {
  await pool.end();
}
