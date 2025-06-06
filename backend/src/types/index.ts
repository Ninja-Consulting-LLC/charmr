import {ErrorType, MessageMode, MessageStyle} from './enums';

export interface GenerateReplyRequest {
  prompt: string;
  images: string[];
  userId: string;
  matchId?: string; // Only used in coach mode, not needed for direct reply generation
  skipRateLimiting?: boolean;
  context?: string;
  model?: string;
  mode?: MessageMode;
  style?: MessageStyle;
  regenerate?: boolean; // Flag to indicate if this is a regeneration request
  previousMessage?: string; // The previous message to avoid repeating when regenerating
  matchSummary?: string; // The current summary of the match's dynamic
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
}

export interface ErrorResponse {
  error: string;
  statusCode: number;
}

export interface RateLimitResponse {
  retryAfter: string;
  error: string;
}
