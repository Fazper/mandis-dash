-- Fix: Remove account_name column if it exists (no longer needed)
-- The account name is now generated dynamically from firm name + account type name

ALTER TABLE account_types DROP COLUMN IF EXISTS account_name;

-- Also ensure firm_id exists and max_funded is dropped from account_types
ALTER TABLE account_types ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES prop_firms(id) ON DELETE CASCADE;
ALTER TABLE account_types DROP COLUMN IF EXISTS max_funded;
