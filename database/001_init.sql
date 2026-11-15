CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'catalog', 'marketing', 'commercial')),
  active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name text NOT NULL,
  slogan text NOT NULL DEFAULT '',
  short_description text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'Colombia',
  address text NOT NULL DEFAULT '',
  maps_url text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  hours text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT 'COP',
  currency_symbol text NOT NULL DEFAULT '$',
  year_started integer,
  attention_scope text NOT NULL DEFAULT '',
  delivery_text text NOT NULL DEFAULT '',
  commercial_terms text NOT NULL DEFAULT '',
  story_title text NOT NULL DEFAULT '',
  story text NOT NULL DEFAULT '',
  story_image_url text NOT NULL DEFAULT '',
  commercial_message text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_branding (
  business_id integer PRIMARY KEY REFERENCES business(id),
  logo_url text NOT NULL DEFAULT '',
  logo_alt_url text NOT NULL DEFAULT '',
  favicon_url text NOT NULL DEFAULT '',
  social_image_url text NOT NULL DEFAULT '',
  primary_color text NOT NULL DEFAULT '#1B4332',
  secondary_color text NOT NULL DEFAULT '#F3EDE3',
  accent_color text NOT NULL DEFAULT '#C4622D',
  background_color text NOT NULL DEFAULT '#F7F1E8',
  text_color text NOT NULL DEFAULT '#1C1714',
  muted_color text NOT NULL DEFAULT '#5E564C',
  border_color text NOT NULL DEFAULT '#E4D8C8',
  button_color text NOT NULL DEFAULT '#1B4332',
  button_text_color text NOT NULL DEFAULT '#F7F1E8',
  font_pair text NOT NULL DEFAULT 'fraunces',
  radius text NOT NULL DEFAULT '18',
  show_logo boolean NOT NULL DEFAULT true,
  show_name boolean NOT NULL DEFAULT true,
  show_search boolean NOT NULL DEFAULT true,
  show_header_whatsapp boolean NOT NULL DEFAULT true,
  sticky_header boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_settings (
  business_id integer PRIMARY KEY REFERENCES business(id),
  meta_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  public_url text NOT NULL DEFAULT '',
  indexable boolean NOT NULL DEFAULT true,
  whatsapp_general text NOT NULL DEFAULT '',
  whatsapp_product text NOT NULL DEFAULT '',
  float_whatsapp boolean NOT NULL DEFAULT true,
  float_label text NOT NULL DEFAULT 'WhatsApp',
  float_side text NOT NULL DEFAULT 'right',
  quote_retention_days integer NOT NULL DEFAULT 365,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_social_links (
  id text PRIMARY KEY,
  network text NOT NULL CHECK (network IN ('instagram', 'facebook', 'tiktok', 'youtube', 'website')),
  url text NOT NULL DEFAULT '',
  UNIQUE (network)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('image', 'video')),
  url text NOT NULL,
  alt text NOT NULL DEFAULT '',
  width integer,
  height integer,
  bytes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hero_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mode text NOT NULL DEFAULT 'image' CHECK (mode IN ('image', 'video', 'carousel')),
  desktop_url text NOT NULL DEFAULT '',
  mobile_url text NOT NULL DEFAULT '',
  video_url text NOT NULL DEFAULT '',
  poster_url text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  cta_label text NOT NULL DEFAULT '',
  cta_href text NOT NULL DEFAULT '',
  align text NOT NULL DEFAULT 'left',
  valign text NOT NULL DEFAULT 'end',
  height text NOT NULL DEFAULT '78vh',
  overlay integer NOT NULL DEFAULT 35,
  autoplay boolean NOT NULL DEFAULT false,
  loop boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS hero_slides (
  id text PRIMARY KEY,
  desktop_url text NOT NULL DEFAULT '',
  mobile_url text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  cta_label text NOT NULL DEFAULT '',
  cta_href text NOT NULL DEFAULT '',
  align text NOT NULL DEFAULT 'left',
  overlay integer NOT NULL DEFAULT 35,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS announcement_bar (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  active boolean NOT NULL DEFAULT false,
  text text NOT NULL DEFAULT '',
  href text NOT NULL DEFAULT '',
  background text NOT NULL DEFAULT '#1B4332',
  color text NOT NULL DEFAULT '#F7F1E8',
  dismissible boolean NOT NULL DEFAULT true,
  starts_on text NOT NULL DEFAULT '',
  ends_on text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS home_sections (
  key text PRIMARY KEY,
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS promotional_banners (
  id text PRIMARY KEY,
  title text NOT NULL,
  subtitle text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  href text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS content_pages (
  slug text PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  parent_id text REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  show_on_home boolean NOT NULL DEFAULT true,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  sku text NOT NULL DEFAULT '',
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'physical' CHECK (kind IN ('physical', 'digital', 'service', 'intangible')),
  category_id text REFERENCES categories(id) ON DELETE SET NULL,
  price_pesos numeric(14, 0),
  compare_pesos numeric(14, 0),
  price_mode text NOT NULL DEFAULT 'fixed' CHECK (price_mode IN ('fixed', 'from', 'ask')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive')),
  availability text NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'sold_out', 'made_to_order')),
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  video_url text NOT NULL DEFAULT '',
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  social_image_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_media (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id text NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_tags (
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag text NOT NULL CHECK (tag IN ('nuevo', 'oferta', 'exclusivo', 'destacado')),
  PRIMARY KEY (product_id, tag)
);

CREATE TABLE IF NOT EXISTS attribute_definitions (
  id text PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('text', 'number', 'decimal', 'boolean', 'date', 'single', 'multi')),
  unit text NOT NULL DEFAULT '',
  required boolean NOT NULL DEFAULT false,
  visible boolean NOT NULL DEFAULT true,
  filterable boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attribute_options (
  id text PRIMARY KEY,
  attribute_id text NOT NULL REFERENCES attribute_definitions(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS category_attributes (
  category_id text NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  attribute_id text NOT NULL REFERENCES attribute_definitions(id) ON DELETE CASCADE,
  PRIMARY KEY (category_id, attribute_id)
);

CREATE TABLE IF NOT EXISTS product_attribute_values (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_id text NOT NULL REFERENCES attribute_definitions(id) ON DELETE CASCADE,
  value text NOT NULL DEFAULT '',
  UNIQUE (product_id, attribute_id)
);

CREATE TABLE IF NOT EXISTS product_variants (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku text NOT NULL DEFAULT '',
  price_pesos numeric(14, 0),
  availability text NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'sold_out', 'made_to_order')),
  image_url text NOT NULL DEFAULT '',
  signature text NOT NULL,
  UNIQUE (product_id, signature)
);

CREATE TABLE IF NOT EXISTS variant_attribute_values (
  variant_id text NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  attribute_id text NOT NULL REFERENCES attribute_definitions(id) ON DELETE CASCADE,
  option_id text NOT NULL REFERENCES attribute_options(id) ON DELETE CASCADE,
  PRIMARY KEY (variant_id, attribute_id)
);

CREATE TABLE IF NOT EXISTS variant_media (
  id text PRIMARY KEY,
  variant_id text NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  media_id text NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quote_requests (
  id text PRIMARY KEY,
  reference text NOT NULL UNIQUE,
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  consent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'nueva' CHECK (status IN ('nueva', 'en-gestion', 'atendida', 'cerrada')),
  managed_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_request_items (
  id text PRIMARY KEY,
  quote_id text NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  product_id text REFERENCES products(id) ON DELETE SET NULL,
  variant_id text REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  sku text NOT NULL DEFAULT '',
  variant_label text NOT NULL DEFAULT '',
  unit_price numeric(14, 0),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 20)
);

CREATE TABLE IF NOT EXISTS quote_request_notes (
  id text PRIMARY KEY,
  quote_id text NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  author_email text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id text PRIMARY KEY,
  name text NOT NULL,
  path text NOT NULL DEFAULT '',
  product_id text,
  source text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_name_created ON analytics_events (name, created_at);

CREATE TABLE IF NOT EXISTS slug_redirects (
  id text PRIMARY KEY,
  from_path text NOT NULL UNIQUE,
  to_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  window_start timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id text PRIMARY KEY,
  actor text NOT NULL,
  action text NOT NULL,
  entity text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
