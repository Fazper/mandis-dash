-- Migration: Add proper firm hierarchy
-- Firms (Apex, Topstep) → Account Types (50K, 100K) → Accounts
--
-- Firm level: name, color, website, notes, max_funded (firm-wide limit)
-- Account Type level: name, eval_cost, activation_cost, profit_target, consistency_rule

-- 1. Create new firms table (parent level - e.g., Apex, Topstep)
CREATE TABLE IF NOT EXISTS prop_firms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'blue',
    website TEXT,
    notes TEXT,
    max_funded INTEGER NOT NULL DEFAULT 20,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- 2. Rename existing firms table to account_types and add firm_id
ALTER TABLE firms RENAME TO account_types;

-- Add firm_id column to account_types (nullable initially for migration)
ALTER TABLE account_types ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES prop_firms(id) ON DELETE CASCADE;

-- Remove max_funded and account_name from account_types (now on firm level / redundant)
ALTER TABLE account_types DROP COLUMN IF EXISTS max_funded;
ALTER TABLE account_types DROP COLUMN IF EXISTS account_name;

-- 3. Enable RLS on prop_firms
ALTER TABLE prop_firms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prop_firms"
    ON prop_firms FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prop_firms"
    ON prop_firms FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prop_firms"
    ON prop_firms FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prop_firms"
    ON prop_firms FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Create index
CREATE INDEX IF NOT EXISTS idx_prop_firms_user_id ON prop_firms(user_id);
CREATE INDEX IF NOT EXISTS idx_account_types_firm_id ON account_types(firm_id);

-- 5. Update accounts table to reference account_types properly
-- The firm_id in accounts should now be account_type_id
ALTER TABLE accounts RENAME COLUMN firm_id TO account_type_id;
