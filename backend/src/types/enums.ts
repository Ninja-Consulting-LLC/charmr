export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  SUMMARY = 'summary',
}

export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

export enum MessageMode {
  GENERATE = 'generate',
  COACH = 'coach',
}

export enum MessageStyle {
  FLIRTY = 'flirty',
  SMOOTH = 'smooth',
  FUNNY = 'funny',
}

export enum ErrorType {
  VALIDATION = 'ValidationError',
  AUTHENTICATION = 'AuthenticationError',
  AUTHORIZATION = 'AuthorizationError',
  NOT_FOUND = 'NotFoundError',
  INTERNAL = 'InternalServerError',
  RATE_LIMIT = 'RateLimitError',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  GENERATION_ERROR = 'GENERATION_ERROR',
}
