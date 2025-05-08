CREATE TABLE IF NOT EXISTS message_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  messageId INTEGER NOT NULL,
  model TEXT NOT NULL,
  promptTokens INTEGER NOT NULL DEFAULT 0,
  completionTokens INTEGER NOT NULL DEFAULT 0,
  totalTokens INTEGER NOT NULL DEFAULT 0,
  inputCost REAL NOT NULL DEFAULT 0,
  outputCost REAL NOT NULL DEFAULT 0,
  totalCost REAL NOT NULL DEFAULT 0,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_costs_message ON message_costs(messageId);
CREATE INDEX IF NOT EXISTS idx_message_costs_timestamp ON message_costs(timestamp);