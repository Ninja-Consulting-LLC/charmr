export interface GenerateReplyRequest {
  message: string;
  context?: string;
}

export interface GenerateReplyResponse {
  reply: string;
  error?: string;
}
