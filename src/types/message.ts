import type {
  GenerateReplyRequest as SharedGenerateReplyRequest,
  GenerateReplyResponse as SharedGenerateReplyResponse,
} from '@charmr/shared';
import {MessageMode, MessageRole, MessageType} from './enums';

export interface MessageLimit {
  dailyMessagesUsed: number;
  extraMessages: number;
}

export interface Message {
  id: number;
  userId: string;
  matchId?: string;
  role: MessageRole;
  type: MessageType;
  mode: MessageMode;
  used: boolean;
  replyTo?: number;
  content: string;
  timestamp: string;
  imageData?: string;
}

export interface GenerateReplyRequest
  extends Omit<SharedGenerateReplyRequest, 'matchId' | 'deleteAfterResponse'> {
  matchId?: string;
  deleteAfterResponse?: boolean;
}

export interface GenerateReplyResponse
  extends Omit<SharedGenerateReplyResponse, 'type'> {
  type?: string;
  limits?: MessageLimit;
}
