import {
  GenerateReplyRequest as BackendGenerateReplyRequest,
  GenerateReplyResponse as BackendGenerateReplyResponse,
} from '../../backend/src/types';
import {MessageMode, MessageRole, MessageType} from './enums';

export interface MessageLimit {
  dailyMessagesUsed: number;
  extraMessages: number;
}

export interface Message {
  id: number;
  userId: string;
  matchId: string;
  role: MessageRole;
  type: MessageType;
  mode: MessageMode;
  used: boolean;
  replyTo?: number;
  content: string;
  timestamp: string;
  imageData?: string; // For messages with type 'image'
}

// Extend the backend request type for frontend-specific needs
export interface GenerateReplyRequest
  extends Omit<BackendGenerateReplyRequest, 'matchId'> {
  matchId?: string; // Make matchId optional in frontend
}

// Extend the backend response type for frontend-specific needs
export interface GenerateReplyResponse
  extends Omit<BackendGenerateReplyResponse, 'type'> {
  type?: string; // Keep as string in frontend for backward compatibility
  limits?: MessageLimit; // Add frontend-specific limits
}
