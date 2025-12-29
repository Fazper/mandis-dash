-- Add firms table for configurable account types
CREATE TABLE IF NOT EXISTS firms (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_name TEXT NOT NULL,
    max_funded INTEGER NOT NULL DEFAULT 10,
    eval_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    activation_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT 'blue',
    has_consistency_rule BOOLEAN NOT NULL DEFAULT false,
    default_profit_target DECIMAL(10,2) NOT NULL DEFAULT 3000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, id)
);

-- Enable RLS
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own firms"
    ON firms FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own firms"
    ON firms FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own firms"
    ON firms FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own firms"
    ON firms FOR DELETE
    USING (auth.uid() = user_id);

-- Update user_settings table to use simpler structure
ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS payout_estimate DECIMAL(10,2) DEFAULT 2000;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_firms_user_id ON firms(user_id);
