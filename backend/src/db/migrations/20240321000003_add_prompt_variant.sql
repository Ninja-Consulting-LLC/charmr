ALTER TABLE messages ADD COLUMN promptVariant TEXT CHECK (promptVariant IN ('A', 'B'));

CREATE INDEX IF NOT EXISTS idx_messages_prompt_variant ON messages(promptVariant);