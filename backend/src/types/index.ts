import {ErrorType, MessageMode, MessageStyle} from './enums';

export interface GenerateReplyRequest {
  prompt: string;
  images: string[];
  userId: string;
  matchId: string;
  deleteAfterResponse: boolean;
  skipRateLimiting?: boolean;
  context?: string;
  model?: string;
  mode?: MessageMode;
  style?: MessageStyle;
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
}

export interface ErrorResponse {
  error: string;
  statusCode: number;
}

export interface RateLimitResponse {
  retryAfter: string;
  error: string;
}
