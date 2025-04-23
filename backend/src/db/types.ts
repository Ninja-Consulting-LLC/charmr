export interface MessageLimit {
  dailyMessagesUsed: number;
  dailyMessageLimit: number;
  extraMessages: number;
}

export interface User {
  id: string;
  plan: string;
  dailyMessagesUsed: number;
  dailyMessageLimit: number;
  extraMessages: number;
  lastResetDate: string;
}

export interface Database {
  getUser: (userId: string) => Promise<User | null>;
  createUser: (userId: string, plan?: string) => Promise<User>;
  updateUser: (userId: string, data: Partial<User>) => Promise<void>;
  incrementMessageCount: (userId: string) => Promise<boolean>;
  resetDailyMessageCounts: () => Promise<void>;
  addExtraMessages: (userId: string, count: number) => Promise<void>;
  updateUserPlan: (userId: string, plan: string) => Promise<void>;
}
