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

export enum MessageMode {
  GENERATE = 'generate',
  COACH = 'coach',
}

export enum MessageStyle {
  FLIRTY = 'flirty',
  SMOOTH = 'smooth',
  FUNNY = 'funny',
}

export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

export enum ErrorType {
  VALIDATION = 'ValidationError',
  AUTHENTICATION = 'AuthenticationError',
  AUTHORIZATION = 'AuthorizationError',
  NOT_FOUND = 'NotFoundError',
  INTERNAL = 'InternalServerError',
  RATE_LIMIT = 'RateLimitError',
}

export enum Platform {
  TINDER = 'tinder',
  BUMBLE = 'bumble',
  HINGE = 'hinge',
  OTHER = 'other',
}
