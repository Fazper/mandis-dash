-- Add payouts table for tracking actual received payouts
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_type_id TEXT REFERENCES account_types(id) ON DELETE SET NULL,
    firm_id UUID REFERENCES prop_firms(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    note TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own payouts"
    ON payouts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payouts"
    ON payouts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payouts"
    ON payouts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payouts"
    ON payouts FOR DELETE
    USING (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_date ON payouts(date);
CREATE INDEX IF NOT EXISTS idx_payouts_account_type_id ON payouts(account_type_id);
