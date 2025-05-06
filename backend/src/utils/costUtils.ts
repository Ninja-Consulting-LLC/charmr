// Cost per 1K tokens (USD) as of May 2025
const MODEL_COSTS = {
  // OpenAI models
  'gpt-4o': {input: 0.0025, output: 0.01},
  'gpt-4o-mini': {input: 0.00015, output: 0.0006},

  // Gemini models
  'gemini-1.0-pro': {input: 0.000125, output: 0.000375},
  'gemini-1.5-pro': {input: 0.00125, output: 0.005},
} as const;

// Token costs for images
const IMAGE_TOKEN_COSTS = {
  low: 85, // tokens per image at low detail
  high: 765, // tokens per image at high detail
} as const;

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  image_count?: number; // Add image count to usage
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
  usage: TokenUsage;
}

export const calculateCost = (
  model: string,
  usage: TokenUsage,
): CostBreakdown => {
  const modelCosts = MODEL_COSTS[model as keyof typeof MODEL_COSTS] || {
    input: 0.01,
    output: 0.03,
  };

  // Calculate base token costs
  let promptTokens = usage.prompt_tokens;

  // Add image token costs if images are present
  if (usage.image_count && usage.image_count > 0) {
    // We use low detail for images
    promptTokens += usage.image_count * IMAGE_TOKEN_COSTS.low;
  }

  const inputCost = (promptTokens / 1000) * modelCosts.input;
  const outputCost = (usage.completion_tokens / 1000) * modelCosts.output;
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost,
    model,
    usage: {
      ...usage,
      prompt_tokens: promptTokens,
      total_tokens: promptTokens + usage.completion_tokens,
    },
  };
};
