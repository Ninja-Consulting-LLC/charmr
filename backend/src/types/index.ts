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
  error?: string;
}

export interface ErrorResponse {
  error: string;
  statusCode: number;
}

export interface RateLimitResponse {
  retryAfter: string;
  error: string;
}
