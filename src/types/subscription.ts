export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
  PRO = 'pro',
}

export interface User {
  id: string;
  plan: SubscriptionTier;
  dailyMessagesUsed: number;
  extraMessages: number;
}
