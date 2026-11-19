-- Integraciones de Google y privacidad (single-business).
CREATE TABLE IF NOT EXISTS google_integration_settings (
  business_id integer PRIMARY KEY DEFAULT 1,
  search_console_property text NOT NULL DEFAULT '',
  ga4_measurement_id text NOT NULL DEFAULT '',
  ga4_property_id text NOT NULL DEFAULT '',
  gtm_container_id text NOT NULL DEFAULT '',
  tracking_enabled boolean NOT NULL DEFAULT false,
  commerce_events_enabled boolean NOT NULL DEFAULT true,
  last_sitemap_check_at timestamptz,
  last_sitemap_status text NOT NULL DEFAULT '',
  last_sitemap_detail text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS privacy_consent_settings (
  business_id integer PRIMARY KEY DEFAULT 1,
  notice_enabled boolean NOT NULL DEFAULT true,
  policy_version text NOT NULL DEFAULT '1.0',
  consent_expiration_days integer NOT NULL DEFAULT 180,
  notice_title text NOT NULL DEFAULT 'Uso de cookies',
  notice_description text NOT NULL DEFAULT 'Utilizamos cookies necesarias para el funcionamiento de la tienda y, con tu autorización, cookies analíticas para conocer cómo se utiliza y mejorarla.',
  policy_path text NOT NULL DEFAULT '/politicas/privacidad',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT ''
);

INSERT INTO google_integration_settings (business_id)
VALUES (1)
ON CONFLICT (business_id) DO NOTHING;

INSERT INTO privacy_consent_settings (business_id)
VALUES (1)
ON CONFLICT (business_id) DO NOTHING;
