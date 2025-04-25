import {SubscriptionTier} from './enums';

export interface UserData {
  id: string;
  email?: string;
  plan: SubscriptionTier;
  dailyMessagesUsed: number;
  extraMessages: number;
  lastResetDate: string;
}

export interface User extends UserData {
  getDailyMessageLimit: () => number;
}
