export enum UserPlan {
  FREE = 'free',
  PLUS = 'plus',
  PREMIUM = 'premium',
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
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

export enum SubscriptionTier {
  BASIC = 'basic',
  PREMIUM = 'premium',
  PRO = 'pro',
}
