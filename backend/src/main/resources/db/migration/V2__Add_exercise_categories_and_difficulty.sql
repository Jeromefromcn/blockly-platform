-- Add category and difficulty columns to exercises table if they don't exist
-- For fresh databases: already included in V1, so this is idempotent
-- For existing databases: adds missing columns
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT NULL;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'MEDIUM';
