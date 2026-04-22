import {PromptVariant} from '../types';
import {
  MessageMode,
  MessageRole,
  MessageType,
  SubscriptionTier,
} from '../types/enums';
import logger from '../utils/logger';
import {FirestoreMatchRepository} from './repositories/firestoreMatchRepository';
import {FirestoreMessageCostRepository} from './repositories/firestoreMessageCostRepository';
import {FirestoreMessageRepository} from './repositories/firestoreMessageRepository';
import {FirestoreSupportRepository} from './repositories/firestoreSupportRepository';
import {FirestoreUserRepository} from './repositories/firestoreUserRepository';
import {
  Database,
  ID,
  Match,
  Message,
  MessageCost,
  SupportTicket,
  User,
} from './types';

export type FirestoreRepositoryBundle = {
  userRepository: FirestoreUserRepository;
  messageRepository: FirestoreMessageRepository;
  matchRepository: FirestoreMatchRepository;
  messageCostRepository: FirestoreMessageCostRepository;
  supportRepository: FirestoreSupportRepository;
};

/**
 * Implements the shared `Database` contract for production Firestore.
 * SQL-oriented helpers (`get` / `all` / `run`) are stubs — use repositories via services instead.
 */
export function createFirestoreAdapter(
  r: FirestoreRepositoryBundle,
): Database {
  const {
    userRepository,
    messageRepository,
    matchRepository,
    messageCostRepository,
    supportRepository,
  } = r;

  return {
    getUser: (userId: string) => userRepository.getUser(userId),
    getUserByInstallationId: (installationId: string) =>
      userRepository.getUserByInstallationId(installationId),
    createUser: (user: {
      id: string;
      email: string;
      name: string;
      plan?: SubscriptionTier;
      installationId?: string;
    }) => userRepository.createUser(user),
    updateUser: (userId: string, updates: Partial<User>) =>
      userRepository.updateUser(userId, updates),
    deleteUser: (userId: string) => userRepository.deleteUser(userId),
    incrementMessageCount: (userId: string) =>
      userRepository.incrementMessageCount(userId),
    resetDailyMessageCounts: () => userRepository.resetDailyMessageCounts(),
    addExtraMessages: (userId: string, count: number) =>
      userRepository.addExtraMessages(userId, count),
    updateUserPlan: (userId: string, plan: SubscriptionTier) =>
      userRepository.updateUserPlan(userId, plan),
    getUsersWithDeviceToken: () => userRepository.getUsersWithDeviceToken(),

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
        imageData?: string;
        promptVariant?: PromptVariant;
        model?: string;
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
        inputCost?: number;
        outputCost?: number;
        totalCost?: number;
        costTimestamp?: string;
      },
    ) => messageRepository.createMessage(userId, matchId, message),

    createMessage: (
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
        imageData?: string;
        promptVariant?: PromptVariant;
        model?: string;
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
        inputCost?: number;
        outputCost?: number;
        totalCost?: number;
        costTimestamp?: string;
      },
    ) => messageRepository.createMessage(userId, matchId, message),

    getMessages: (userId: string, matchId: string) =>
      messageRepository.getMessagesByMatch(userId, matchId),

    updateUserCosts: (
      userId: string,
      cost: {totalCost: number; totalTokens: number},
    ) => userRepository.updateUserCosts(userId, cost),
    getUserCosts: (userId: string) => userRepository.getUserCosts(userId),

    saveMessageCost: (
      messageId: ID,
      cost: Omit<MessageCost, 'id' | 'messageId'>,
    ) => messageCostRepository.saveMessageCost(messageId, cost),

    getMessageCosts: (userId: string, startDate?: string, endDate?: string) =>
      messageCostRepository.listEmbeddedCostsForUser(
        userId,
        matchRepository,
        messageRepository,
        startDate,
        endDate,
      ),

    getTotalCosts: (userId: string, startDate?: string, endDate?: string) =>
      messageCostRepository.aggregateEmbeddedTotalsForUser(
        userId,
        matchRepository,
        messageRepository,
        startDate,
        endDate,
      ),

    getMatches: (userId: string, includeHidden?: boolean) =>
      matchRepository.getMatches(userId, includeHidden),
    getMatchById: (userId: string, matchId: ID) =>
      matchRepository.getMatchById(userId, matchId),
    addMatch: (userId: string, match: Omit<Match, 'id'>) =>
      matchRepository.addMatch(userId, match),
    updateMatchLastUsed: (userId: string, matchId: string) =>
      matchRepository.updateMatchLastUsed(userId, matchId),
    deleteMatch: (userId: string, matchId: string) =>
      matchRepository.deleteMatch(userId, matchId),
    hideMatch: (userId: string, matchId: string) =>
      matchRepository.hideMatch(userId, matchId),
    restoreMatch: (userId: string, matchId: string) =>
      matchRepository.restoreMatch(userId, matchId),
    updateMatch: (userId: string, matchId: string, updates: Partial<Match>) =>
      matchRepository.updateMatch(userId, matchId, updates),

    getConversationHistory: async (
      userId: string,
      startDate?: string,
      endDate?: string,
    ): Promise<{messages: Message[]; total: number}> => {
      try {
        const result = await messageRepository.getMessagesByMatch(
          userId,
          '',
        );
        const filteredMessages = result.messages.filter(msg => {
          if (startDate && new Date(msg.timestamp) < new Date(startDate)) {
            return false;
          }
          if (endDate && new Date(msg.timestamp) > new Date(endDate)) {
            return false;
          }
          return true;
        });
        return {
          messages: filteredMessages,
          total: filteredMessages.length,
        };
      } catch (error) {
        logger.error('Failed to get conversation history', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },

    support: {
      createTicket: (ticket: Omit<SupportTicket, 'id'>) =>
        supportRepository.createTicket(ticket),
      getTicketsByUserId: (userId: string) =>
        supportRepository.getTicketsByUserId(userId),
      updateTicketStatus: (
        ticketId: string,
        status: SupportTicket['status'],
      ) => supportRepository.updateTicketStatus(ticketId, status),
    },

    linkUsers: (anonymousUserId: string, registeredUserId: string) =>
      userRepository.linkUsers(anonymousUserId, registeredUserId),

    get: async () => null,
    all: async () => [],
    run: async () => ({lastID: 0}),

    clearDatabase: async () => {
      try {
        await Promise.all([
          userRepository.clearDatabase(),
          messageRepository.clearDatabase(),
          matchRepository.clearDatabase(),
          messageCostRepository.clearDatabase(),
          supportRepository.clearDatabase(),
        ]);
        logger.info('Firestore database cleared successfully');
      } catch (error) {
        logger.error('Failed to clear Firestore database', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },
  } as Database;
}
