import type {ErrorType, MessageMode, MessageStyle} from './enums';

export type PromptVariant = 'A' | 'B';

export interface GenerateReplyRequest {
  prompt: string;
  images: string[];
  userId: string;
  matchId?: string;
  skipRateLimiting?: boolean;
  context?: string;
  model?: string;
  mode?: MessageMode;
  style?: MessageStyle;
  regenerate?: boolean;
  previousMessage?: string;
  matchSummary?: string;
  promptVariant?: PromptVariant;
}

export interface GenerateReplyResponse {
  reply: string;
  summary?: string;
  error?: string;
  type?: ErrorType;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  mode: MessageMode;
  style?: MessageStyle;
  cost?: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
  promptVariant?: PromptVariant;
}

export interface ErrorResponse {
  error: string;
  statusCode: number;
}

export interface RateLimitResponse {
  retryAfter: string;
  error: string;
}
