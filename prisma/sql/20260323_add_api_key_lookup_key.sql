-- Add deterministic lookup key for API key authentication.
ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS lookup_key VARCHAR(24);

-- Unique index allows fast lookup for new-format keys.
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_lookup_key_unique
ON api_keys (lookup_key);
