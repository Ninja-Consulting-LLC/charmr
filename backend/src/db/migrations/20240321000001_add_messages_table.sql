CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  matchId TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'summary')),
  mode TEXT NOT NULL DEFAULT 'generate' CHECK (mode IN ('generate', 'coach')),
  used INTEGER NOT NULL DEFAULT 0,
  replyTo INTEGER,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  imageData TEXT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (replyTo) REFERENCES messages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_user_match ON messages(userId, matchId);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(replyTo);