-- Landing Engine: R2 deploy + domain hub columns
-- Extends landing_sites with Cloudflare R2 storage and custom domain support.

ALTER TABLE landing_sites ADD COLUMN r2_bucket TEXT;
ALTER TABLE landing_sites ADD COLUMN r2_endpoint TEXT;
ALTER TABLE landing_sites ADD COLUMN r2_access_key_encrypted TEXT;
ALTER TABLE landing_sites ADD COLUMN r2_secret_key_encrypted TEXT;
ALTER TABLE landing_sites ADD COLUMN deploy_mode TEXT DEFAULT 'internal';
ALTER TABLE landing_sites ADD COLUMN cf_hostname_id TEXT;
ALTER TABLE landing_sites ADD COLUMN domain_status TEXT DEFAULT 'pending';
ALTER TABLE landing_sites ADD COLUMN domain_dns_records JSONB;
ALTER TABLE landing_sites ADD COLUMN pulse_enabled BOOLEAN DEFAULT true;
