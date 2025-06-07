import {SubscriptionTier} from './enums';

export interface UserData {
  id: string;
  email?: string;
  plan: SubscriptionTier;
  dailyMessagesUsed: number;
  extraMessages: number;
  lastResetDate: string;
  installationId?: string;
  createdAt: string;
}

export interface User extends UserData {
  getDailyMessageLimit: () => number | string;
}
