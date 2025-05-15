import {SubscriptionTier} from '../types/enums';

export interface MessageLimit {
  dailyMessagesUsed: number;
  extraMessages: number;
}

export interface User {
  id: string;
  email?: string;
  name?: string;
  plan: SubscriptionTier;
  dailyMessagesUsed: number;
  extraMessages: number;
  lastResetDate: string;
  installationId?: string;
}

export interface Message {
  id: number;
  userId: string;
  matchId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface MessageCost {
  id: number;
  messageId: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  timestamp: string;
}

export interface Match {
  id: number;
  userId: string;
  name: string;
  platform: string;
  lastUsed: string | null;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: 'open' | 'closed' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

export interface Database {
  getUser: (userId: string) => Promise<User | null>;
  getUserByInstallationId: (installationId: string) => Promise<User | null>;
  createUser: (
    userId: string,
    email?: string,
    name?: string,
    plan?: SubscriptionTier,
    installationId?: string,
  ) => Promise<User>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
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
  getMessages: (
    userId: string,
    matchId?: string,
  ) => Promise<
    Array<{
      id: number;
      userId: string;
      matchId: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp: string;
    }>
  >;
  all: (sql: string, params?: any[]) => Promise<any[]>;
  run: (sql: string, params?: any[]) => Promise<any>;
  clearDatabase: () => Promise<void>;
  saveMessageCost: (
    messageId: number,
    cost: Omit<MessageCost, 'id' | 'messageId'>,
  ) => Promise<MessageCost>;
  getMessageCosts: (
    userId: string,
    startDate?: string,
    endDate?: string,
  ) => Promise<MessageCost[]>;
  getTotalCosts: (
    userId: string,
    startDate?: string,
    endDate?: string,
  ) => Promise<{
    totalCost: number;
    totalTokens: number;
    messageCount: number;
  }>;
  getMatches: (userId: string, includeHidden?: boolean) => Promise<Match[]>;
  getMatchById: (matchId: number | string) => Promise<Match | null>;
  addMatch: (userId: string, name: string, platform: string) => Promise<Match>;
  updateMatchLastUsed: (
    userId: string,
    name: string,
    platform: string,
  ) => Promise<void>;
  deleteMatch: (
    userId: string,
    name: string,
    platform: string,
  ) => Promise<void>;
  hideMatch: (userId: string, name: string, platform: string) => Promise<void>;
  restoreMatch: (
    userId: string,
    name: string,
    platform: string,
  ) => Promise<void>;
  getConversationHistory: (
    userId: string,
    matchId: string,
  ) => Promise<
    Array<{
      role: string;
      content: string;
      timestamp: string;
    }>
  >;

  // Support methods
  support: {
    createTicket: (ticket: Omit<SupportTicket, 'id'>) => Promise<SupportTicket>;
    getTicketsByUserId: (userId: string) => Promise<SupportTicket[]>;
    updateTicketStatus: (
      ticketId: string,
      status: SupportTicket['status'],
    ) => Promise<void>;
  };
}
