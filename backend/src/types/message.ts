export interface GenerateReplyRequest {
  prompt: string;
  images?: string[];
  userId: string;
  matchId?: string;
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
