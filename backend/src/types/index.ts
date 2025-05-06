export interface GenerateReplyRequest {
  prompt: string;
  images: string[];
  userId: string;
  matchId: string;
  deleteAfterResponse: boolean;
  skipRateLimiting?: boolean;
  context?: string;
}

export interface GenerateReplyResponse {
  reply: string;
  summary?: string;
  error?: string;
  type?: 'QUOTA_EXCEEDED' | 'RATE_LIMIT' | 'GENERATION_ERROR';
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
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
