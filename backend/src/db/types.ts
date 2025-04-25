import {SubscriptionTier} from '../types/enums';

export interface MessageLimit {
  dailyMessagesUsed: number;
  dailyMessageLimit: number;
  extraMessages: number;
}

export interface User {
  id: string;
  email?: string;
  name?: string;
  plan: SubscriptionTier;
  dailyMessagesUsed: number;
  dailyMessageLimit: number;
  extraMessages: number;
  lastResetDate: string;
}

export interface Message {
  id: number;
  userId: string;
  matchId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Database {
  getUser: (userId: string) => Promise<User | null>;
  createUser: (userId: string, plan?: string) => Promise<User>;
  updateUser: (userId: string, data: Partial<User>) => Promise<void>;
  incrementMessageCount: (userId: string) => Promise<boolean>;
  resetDailyMessageCounts: () => Promise<void>;
  addExtraMessages: (userId: string, count: number) => Promise<void>;
  updateUserPlan: (userId: string, plan: SubscriptionTier) => Promise<void>;
  saveMessage: (
    userId: string,
    matchId: string,
    message: {
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp: string;
    },
  ) => Promise<{
    id: number;
    userId: string;
    matchId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  getMessages: (userId: string, matchId: string) => Promise<Message[]>;
  all: (sql: string, params?: any[]) => Promise<any[]>;
  run: (sql: string, params?: any[]) => Promise<any>;
  clearDatabase: () => Promise<void>;
}
