import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (process.env.NODE_ENV === "production") {
  console.error("La semilla demo no se ejecuta en producción.");
  process.exit(1);
}
if (process.env.SEED_DEMO !== "1") {
  console.error("Define SEED_DEMO=1 para cargar datos de prueba en la base de desarrollo.");
  process.exit(1);
}

const path = resolve(".env");
if (existsSync(path)) {
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

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL de desarrollo.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

const samples = [
  ["ropa", "DEMO Camisa", "physical", "fixed", "80000", "Talla", "M"],
  ["cafe", "DEMO Café", "physical", "from", "45000", "Molienda", "Grano"],
  ["vehiculos", "DEMO Vehículo", "physical", "ask", null, "Combustible", "Gasolina"],
  ["electronica", "DEMO Audífonos", "physical", "fixed", "120000", "Color", "Negro"],
  ["digital", "DEMO Guía", "digital", "fixed", "30000", "Formato", "PDF"],
];

try {
  const existing = await pool.query("select id from products limit 1");
  if (existing.rows.length > 0) {
    console.log("Ya hay productos. No se insertó la semilla.");
    process.exit(0);
  }
  for (const [categorySlug, name, kind, priceMode, price, attributeName, optionLabel] of samples) {
    const categoryId = crypto.randomUUID();
    const productId = crypto.randomUUID();
    const attributeId = crypto.randomUUID();
    const optionId = crypto.randomUUID();
    const variantId = crypto.randomUUID();
    await pool.query(
      "insert into categories (id, name, slug, status) values ($1, $2, $3, 'active')",
      [categoryId, categorySlug, categorySlug],
    );
    await pool.query(
      `insert into products (id, name, slug, kind, category_id, price_pesos, price_mode, status, availability, short_description)
       values ($1, $2, $3, $4, $5, $6, $7, 'active', 'available', 'Pieza de demostración. No es contenido comercial real.')`,
      [productId, name, categorySlug, kind, categoryId, price, priceMode],
    );
    await pool.query(
      "insert into attribute_definitions (id, name, code, kind, filterable) values ($1, $2, $3, 'single', true)",
      [attributeId, attributeName, `${categorySlug}-attr`],
    );
    await pool.query(
      "insert into attribute_options (id, attribute_id, label) values ($1, $2, $3)",
      [optionId, attributeId, optionLabel],
    );
    await pool.query(
      "insert into product_variants (id, product_id, availability, signature) values ($1, $2, 'available', $3)",
      [variantId, productId, optionId],
    );
    await pool.query(
      "insert into variant_attribute_values (variant_id, attribute_id, option_id) values ($1, $2, $3)",
      [variantId, attributeId, optionId],
    );
  }
  console.log("Semilla demo cargada en la base de desarrollo.");
} finally {
  await pool.end();
}
