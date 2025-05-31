export interface GenerateReplyRequest {
  prompt: string;
  images?: string[];
  userId: string;
  matchId?: string;
  deleteAfterResponse?: boolean;
}

export interface GenerateReplyResponse {
  reply: string;
  summary?: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
