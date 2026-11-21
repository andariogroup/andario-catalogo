-- Piezas para redes. Una instalación, un negocio. No guarda tokens ni publica en Meta.
CREATE TABLE IF NOT EXISTS marketing_pieces (
  id text PRIMARY KEY,
  product_id text NOT NULL,
  channel text NOT NULL,
  format text NOT NULL,
  template text NOT NULL,
  photo_url text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  cta text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_pieces_updated_idx ON marketing_pieces (updated_at DESC);
