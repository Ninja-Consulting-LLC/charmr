import {databaseConfig} from '../config/database';
import {
  MessageMode,
  MessageRole,
  MessageType,
  SubscriptionTier,
} from '../types/enums';
import logger from '../utils/logger';
import {getFirestore} from './firestore';
import {FirestoreMatchRepository} from './repositories/firestoreMatchRepository';
import {FirestoreMessageCostRepository} from './repositories/firestoreMessageCostRepository';
import {FirestoreMessageRepository} from './repositories/firestoreMessageRepository';
import {FirestoreSupportRepository} from './repositories/firestoreSupportRepository';
import {FirestoreUserRepository} from './repositories/firestoreUserRepository';
import {createSqliteDatabase} from './sqlite';
import {
  Database,
  ID,
  Match,
  Message,
  MessageCost,
  SupportTicket,
  User,
} from './types';

let db: Database | null = null;
let userRepository: FirestoreUserRepository | null = null;
let messageRepository: FirestoreMessageRepository | null = null;
let matchRepository: FirestoreMatchRepository | null = null;
let messageCostRepository: FirestoreMessageCostRepository | null = null;
let supportRepository: FirestoreSupportRepository | null = null;

export const getDatabase = async (): Promise<Database> => {
  if (!db) {
    logger.info('Initializing database', {type: databaseConfig.type});
    if (databaseConfig.type === 'firestore') {
      // For Firestore, we return a minimal Database interface implementation
      // that delegates to Firestore. This is needed because some parts of the
      // application expect a Database interface.
      const firestore = getFirestore();
      logger.info('Firestore instance obtained, initializing repositories');
      userRepository = new FirestoreUserRepository();
      messageRepository = new FirestoreMessageRepository();
      matchRepository = new FirestoreMatchRepository();
      messageCostRepository = new FirestoreMessageCostRepository();
      supportRepository = new FirestoreSupportRepository();
      logger.info('Firestore repositories initialized successfully');

      db = {
        // User operations
        getUser: async (userId: string): Promise<User | null> => {
          return userRepository!.getUser(userId);
        },
        getUserByInstallationId: async (
          installationId: string,
        ): Promise<User | null> => {
          return userRepository!.getUserByInstallationId(installationId);
        },
        createUser: async (user: {
          id: string;
          email: string;
          name: string;
          plan?: SubscriptionTier;
          installationId?: string;
        }): Promise<User> => {
          return userRepository!.createUser(user);
        },
        updateUser: async (
          userId: string,
          updates: Partial<User>,
        ): Promise<void> => {
          return userRepository!.updateUser(userId, updates);
        },
        incrementMessageCount: async (userId: string): Promise<boolean> => {
          return userRepository!.incrementMessageCount(userId);
        },
        resetDailyMessageCounts: async (): Promise<void> => {
          return userRepository!.resetDailyMessageCounts();
        },
        addExtraMessages: async (
          userId: string,
          count: number,
        ): Promise<void> => {
          return userRepository!.addExtraMessages(userId, count);
        },
        updateUserPlan: async (
          userId: string,
          plan: SubscriptionTier,
        ): Promise<void> => {
          return userRepository!.updateUserPlan(userId, plan);
        },

        // Message operations
        saveMessage: async (
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
        ): Promise<Message> => {
          return messageRepository!.createMessage(userId, matchId, message);
        },
        getMessages: async (userId: string, matchId: string) => {
          return messageRepository!.getMessagesByMatch(userId, matchId);
        },

        // Message cost operations
        saveMessageCost: async (
          messageId: ID,
          cost: Omit<MessageCost, 'id' | 'messageId'>,
        ): Promise<MessageCost> => {
          return messageCostRepository!.saveMessageCost(messageId, cost);
        },
        getMessageCosts: async (
          userId: string,
          startDate?: string,
          endDate?: string,
        ) => {
          // TODO: Implement filtering by date range
          return messageCostRepository!.getMessageCosts(0); // For now, return all costs
        },
        getTotalCosts: async () => {
          return messageCostRepository!.getTotalCosts();
        },

        // Match operations
        getMatches: async (userId: string) => {
          return matchRepository!.getMatches(userId);
        },
        getMatchById: async (userId: string, matchId: ID) => {
          return matchRepository!.getMatchById(userId, matchId);
        },
        addMatch: async (
          userId: string,
          match: Omit<Match, 'id'>,
        ): Promise<Match> => {
          return matchRepository!.addMatch(userId, match);
        },
        updateMatchLastUsed: async (
          userId: string,
          matchId: string,
        ): Promise<void> => {
          return matchRepository!.updateMatchLastUsed(userId, matchId);
        },
        deleteMatch: async (userId: string, matchId: string): Promise<void> => {
          return matchRepository!.deleteMatch(userId, matchId);
        },
        hideMatch: async (userId: string, matchId: string): Promise<void> => {
          return matchRepository!.hideMatch(userId, matchId);
        },
        restoreMatch: async (
          userId: string,
          matchId: string,
        ): Promise<void> => {
          return matchRepository!.restoreMatch(userId, matchId);
        },

        // Support operations
        support: {
          createTicket: async (
            ticket: Omit<SupportTicket, 'id'>,
          ): Promise<SupportTicket> => {
            return supportRepository!.createTicket(ticket);
          },
          getTicketsByUserId: async (userId: string) => {
            return supportRepository!.getTicketsByUserId(userId);
          },
          updateTicketStatus: async (
            ticketId: string,
            status: SupportTicket['status'],
          ) => {
            return supportRepository!.updateTicketStatus(ticketId, status);
          },
        },

        // Required by Database interface but not used in Firestore
        get: async () => null,
        all: async () => [],
        run: async () => ({lastID: 0}),
        clearDatabase: async () => {
          try {
            // Clear all Firestore collections
            await Promise.all([
              userRepository!.clearDatabase(),
              messageRepository!.clearDatabase(),
              matchRepository!.clearDatabase(),
              messageCostRepository!.clearDatabase(),
              supportRepository!.clearDatabase(),
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
        getConversationHistory: async (userId: string, matchId?: string) => {
          const messages = await messageRepository!.getMessagesByMatch(
            userId,
            matchId || '',
          );
          return {
            messages: messages.messages,
            total: messages.total,
          };
        },
      } as Database;
    } else {
      db = await createSqliteDatabase();
    }
  }
  return db;
};
