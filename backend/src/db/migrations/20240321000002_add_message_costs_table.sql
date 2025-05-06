CREATE TABLE IF NOT EXISTS message_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  messageId INTEGER NOT NULL,
  model TEXT NOT NULL,
  promptTokens INTEGER NOT NULL,
  completionTokens INTEGER NOT NULL,
  totalTokens INTEGER NOT NULL,
  inputCost REAL NOT NULL,
  outputCost REAL NOT NULL,
  totalCost REAL NOT NULL,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_costs_message ON message_costs(messageId);
CREATE INDEX IF NOT EXISTS idx_message_costs_timestamp ON message_costs(timestamp);