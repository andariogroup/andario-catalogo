ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS managed_by text NOT NULL DEFAULT '';

UPDATE quote_requests AS quote
SET managed_by = latest.actor
FROM (
  SELECT DISTINCT ON (entity) entity, actor
  FROM audit_events
  WHERE action LIKE 'paso-cotizacion-%'
  ORDER BY entity, created_at DESC
) AS latest
WHERE quote.id = latest.entity
  AND quote.managed_by = '';
