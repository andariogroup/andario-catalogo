import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neonConfig, Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

function loadEnvFile() {
  const path = resolve(".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Falta DATABASE_URL. Usa una base de desarrollo, no la de producción.");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl, max: 1 });
const sqlFiles = readdirSync(resolve("database"))
  .filter((name) => name.endsWith(".sql"))
  .sort();
const statements = sqlFiles.flatMap((name) =>
  readFileSync(resolve("database", name), "utf8")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean),
);
console.log(`SQL: ${sqlFiles.join(", ")}`);

const sections = [
  ["categories", "Categorías", 10],
  ["featured", "Destacados", 20],
  ["news", "Novedades", 30],
  ["banner", "Banner", 40],
  ["catalog", "Catálogo", 50],
  ["about", "El negocio", 60],
  ["trust", "Confianza", 70],
  ["contact", "Contacto", 80],
];
const pages = [
  ["privacidad", "Privacidad y tratamiento de datos"],
  ["terminos", "Términos y condiciones"],
  ["envios", "Entregas y envíos"],
  ["cambios", "Cambios y devoluciones"],
];
const networks = ["instagram", "facebook", "tiktok", "youtube", "website"];

try {
  for (const statement of statements) await pool.query(statement);
  const businessName = process.env.BUSINESS_NAME?.trim() || "Mi negocio";
  await pool.query(
    `insert into business (id, name) values (1, $1) on conflict (id) do nothing`,
    [businessName],
  );
  await pool.query(`insert into business_branding (business_id) values (1) on conflict (business_id) do nothing`);
  await pool.query(`insert into business_settings (business_id) values (1) on conflict (business_id) do nothing`);
  await pool.query(`insert into google_integration_settings (business_id) values (1) on conflict (business_id) do nothing`);
  await pool.query(`insert into privacy_consent_settings (business_id) values (1) on conflict (business_id) do nothing`);
  await pool.query(`insert into hero_settings (id) values (1) on conflict (id) do nothing`);
  await pool.query(`insert into announcement_bar (id) values (1) on conflict (id) do nothing`);
  for (const [key, title, sort] of sections) {
    await pool.query(
      `insert into home_sections (key, title, sort_order) values ($1, $2, $3) on conflict (key) do nothing`,
      [key, title, sort],
    );
  }
  for (const [slug, title] of pages) {
    await pool.query(`insert into content_pages (slug, title) values ($1, $2) on conflict (slug) do nothing`, [slug, title]);
  }
  for (const network of networks) {
    await pool.query(
      `insert into business_social_links (id, network) values ($1, $2) on conflict (network) do nothing`,
      [crypto.randomUUID(), network],
    );
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  const existing = await pool.query(`select id from users limit 1`);
  if (existing.rows.length === 0) {
    if (!email.includes("@") || password.length < 10) {
      console.error("Define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 10) para crear el primer administrador.");
      process.exit(1);
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      `insert into users (id, name, email, password_hash, role) values ($1, $2, $3, $4, 'admin')`,
      [crypto.randomUUID(), "Administrador", email, hash],
    );
    console.log("Administrador creado.");
  } else {
    console.log("Ya hay usuarios. No se reemplazó la clave.");
  }
  console.log("Tablas listas.");
} finally {
  await pool.end();
}
