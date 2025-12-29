-- Goals table for recurring and one-time goals
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    goal_type TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'weekly', 'one-time'
    target_count INTEGER NOT NULL DEFAULT 1, -- e.g., pass 1 account
    action_type TEXT, -- 'fund_account', 'buy_eval', 'trade_open', 'custom'
    firm_id TEXT, -- optional: specific firm this goal applies to
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE, -- null means indefinite
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Goal completions tracks which goals were completed on which dates
CREATE TABLE IF NOT EXISTS goal_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_count INTEGER NOT NULL DEFAULT 1,
    auto_completed BOOLEAN NOT NULL DEFAULT false, -- true if auto-completed by action
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(goal_id, completion_date)
);

-- Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_completions ENABLE ROW LEVEL SECURITY;

-- Goals policies
CREATE POLICY "Users can view their own goals"
    ON goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
    ON goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
    ON goals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
    ON goals FOR DELETE
    USING (auth.uid() = user_id);

-- Goal completions policies
CREATE POLICY "Users can view their own goal completions"
    ON goal_completions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goal completions"
    ON goal_completions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goal completions"
    ON goal_completions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goal completions"
    ON goal_completions FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_active ON goals(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_goal_completions_user_date ON goal_completions(user_id, completion_date);
CREATE INDEX IF NOT EXISTS idx_goal_completions_goal_id ON goal_completions(goal_id);
