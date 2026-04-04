-- Remove generated_code column from submissions table
-- Code is generated on-the-fly from blocklyState; no need to store it
ALTER TABLE submissions DROP COLUMN generated_code;
