import {
  MessageMode,
  MessageRole,
  MessageType,
  SubscriptionTier,
} from '../types/enums';

// Common type for IDs that can be either string or number
export type ID = string | number;

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
  linkedFrom?: string;
  linkedAt?: any;
  createdAt: string;
}

export interface Message {
  id: ID;
  userId: string;
  matchId?: string;
  role: MessageRole;
  type: MessageType;
  mode: MessageMode;
  used: boolean;
  replyTo?: number;
  content: string;
  timestamp: string;
  imageData?: string;
}

export interface MessageCost {
  id: ID;
  messageId: ID;
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
  id: ID;
  userId: string;
  name: string;
  platform: string;
  lastUsed: string | null;
  hidden: boolean;
  deleted: boolean;
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

export interface MessageFilter {
  role?: MessageRole;
  type?: MessageType;
  mode?: MessageMode;
  used?: boolean;
}

export interface ConversationItem extends Message {
  imageData?: string; // For messages with type 'image'
}

export interface Database {
  getUser: (userId: string) => Promise<User | null>;
  getUserByInstallationId: (installationId: string) => Promise<User | null>;
  createUser: (user: {
    id: string;
    email: string;
    name: string;
    plan?: SubscriptionTier;
    installationId?: string;
  }) => Promise<User | null>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  incrementMessageCount: (userId: string) => Promise<boolean>;
  resetDailyMessageCounts: () => Promise<void>;
  addExtraMessages: (userId: string, count: number) => Promise<void>;
  updateUserPlan: (userId: string, plan: SubscriptionTier) => Promise<void>;
  saveMessage: (
    userId: string,
    matchId: string,
    message: {
      role: MessageRole;
      type?: MessageType;
      mode?: MessageMode;
      used?: boolean;
      replyTo?: number;
      content: string;
      timestamp: string;
    },
  ) => Promise<Message>;
  getMessages: (
    userId: string,
    matchId?: string,
    pagination?: {
      limit: number;
      offset: number;
    },
  ) => Promise<{
    messages: Message[];
    total: number;
  }>;
  get: (sql: string, params?: any[]) => Promise<any>;
  all: (sql: string, params?: any[]) => Promise<any[]>;
  run: (sql: string, params?: any[]) => Promise<any>;
  clearDatabase: () => Promise<void>;
  saveMessageCost: (
    messageId: ID,
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
  }>;
  getMatches: (userId: string, includeHidden?: boolean) => Promise<Match[]>;
  getMatchById: (
    userId: string,
    matchId: number | string,
  ) => Promise<Match | null>;
  addMatch: (userId: string, match: Omit<Match, 'id'>) => Promise<Match>;
  updateMatch: (
    userId: string,
    matchId: string,
    updates: Partial<Match>,
  ) => Promise<void>;
  updateMatchLastUsed: (userId: string, matchId: string) => Promise<void>;
  deleteMatch: (userId: string, matchId: string) => Promise<void>;
  hideMatch: (userId: string, matchId: string) => Promise<void>;
  restoreMatch: (userId: string, matchId: string) => Promise<void>;
  getConversationHistory: (
    userId: string,
    startDate?: string,
    endDate?: string,
  ) => Promise<{
    messages: Message[];
    total: number;
  }>;

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
