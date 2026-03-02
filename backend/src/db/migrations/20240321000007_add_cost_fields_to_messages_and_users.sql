-- Add cost fields to messages table
ALTER TABLE messages ADD COLUMN model TEXT;
ALTER TABLE messages ADD COLUMN promptTokens INTEGER DEFAULT 0;
ALTER TABLE messages ADD COLUMN completionTokens INTEGER DEFAULT 0;
ALTER TABLE messages ADD COLUMN totalTokens INTEGER DEFAULT 0;
ALTER TABLE messages ADD COLUMN inputCost REAL DEFAULT 0;
ALTER TABLE messages ADD COLUMN outputCost REAL DEFAULT 0;
ALTER TABLE messages ADD COLUMN totalCost REAL DEFAULT 0;
ALTER TABLE messages ADD COLUMN costTimestamp TEXT;

-- Add cost fields to users table
ALTER TABLE users ADD COLUMN totalCost REAL DEFAULT 0;
ALTER TABLE users ADD COLUMN totalTokens INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN lastCostUpdate TEXT;

-- Create indexes for cost-related queries
CREATE INDEX IF NOT EXISTS idx_messages_cost_timestamp ON messages(costTimestamp);
CREATE INDEX IF NOT EXISTS idx_messages_total_cost ON messages(totalCost);
CREATE INDEX IF NOT EXISTS idx_users_total_cost ON users(totalCost);
CREATE INDEX IF NOT EXISTS idx_users_last_cost_update ON users(lastCostUpdate);