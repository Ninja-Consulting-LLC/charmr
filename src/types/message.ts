export enum MessageStyle {
  FLIRTY = 'flirty',
  SMOOTH = 'smooth',
  FUNNY = 'funny',
}

export interface MessageLimit {
  dailyMessagesUsed: number;
  extraMessages: number;
}

export interface GenerateReplyRequest {
  prompt: string;
  images: string[];
  userId: string;
  matchId: string;
}

export interface GenerateReplyResponse {
  reply: string;
  error?: string;
  type?: string;
  limits?: MessageLimit;
}
