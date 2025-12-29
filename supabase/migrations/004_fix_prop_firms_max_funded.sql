-- Fix: Add max_funded column to prop_firms if it doesn't exist
-- This handles cases where the table was created without this column

ALTER TABLE prop_firms ADD COLUMN IF NOT EXISTS max_funded INTEGER NOT NULL DEFAULT 20;
