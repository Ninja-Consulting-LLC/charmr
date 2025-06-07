-- Update messages table
UPDATE messages
SET timestamp = CURRENT_TIMESTAMP
WHERE timestamp IS NULL;

-- Update message_costs table
UPDATE message_costs
SET
  promptTokens = COALESCE(promptTokens, 0),
  completionTokens = COALESCE(completionTokens, 0),
  totalTokens = COALESCE(totalTokens, 0),
  inputCost = COALESCE(inputCost, 0),
  outputCost = COALESCE(outputCost, 0),
  totalCost = COALESCE(totalCost, 0),
  timestamp = COALESCE(timestamp, CURRENT_TIMESTAMP);