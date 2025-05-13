import {
  GenerateReplyRequest as BackendGenerateReplyRequest,
  GenerateReplyResponse as BackendGenerateReplyResponse,
} from '../../backend/src/types';

export interface MessageLimit {
  dailyMessagesUsed: number;
  extraMessages: number;
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
