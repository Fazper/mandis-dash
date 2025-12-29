-- Add expected_payout to account_types (payout amount varies by account size)
-- e.g., 50K account might pay $2000, 150K might pay $4000

ALTER TABLE account_types ADD COLUMN IF NOT EXISTS expected_payout DECIMAL(10,2) NOT NULL DEFAULT 2000;
