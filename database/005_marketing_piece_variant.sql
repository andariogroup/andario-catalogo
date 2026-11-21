-- La pieza puede recordar la variante elegida. Vacío significa el producto general.
ALTER TABLE marketing_pieces ADD COLUMN IF NOT EXISTS variant_id text NOT NULL DEFAULT '';
