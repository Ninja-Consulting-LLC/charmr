CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  lastUsed TEXT,
  hidden BOOLEAN NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(userId, name, platform)
);

CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(userId);
CREATE INDEX IF NOT EXISTS idx_matches_last_used ON matches(lastUsed);
CREATE INDEX IF NOT EXISTS idx_matches_hidden ON matches(hidden);