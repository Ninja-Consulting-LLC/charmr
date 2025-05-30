import {Firestore} from 'firebase-admin/firestore';
import {firebaseAdmin} from '../config/firebase-admin';
import {createSqliteDatabase} from '../db/sqlite';
import {Database} from '../db/types';

const userId = process.argv[2];
const useFirestore = process.argv.includes('--firestore');

if (!userId) {
  console.error('Please provide a user ID as an argument');
  console.error('Usage: npm run user:info -- <userId> [--firestore]');
  process.exit(1);
}

const fetchUserInfoFromSqlite = async () => {
  try {
    // Initialize database
    const db: Database = await createSqliteDatabase();

    // Get user from database
    const user = await db.getUser(userId);
    if (!user) {
      console.error('User not found in SQLite database');
      process.exit(1);
    }

    // Get messages with their costs
    const messages = await db.all(
      `SELECT
        m.id, m.userId, m.matchId, m.role, m.content, m.timestamp,
        COALESCE(mc.model, '') as model,
        COALESCE(mc.promptTokens, 0) as promptTokens,
        COALESCE(mc.completionTokens, 0) as completionTokens,
        COALESCE(mc.totalTokens, 0) as totalTokens,
        COALESCE(mc.inputCost, 0) as inputCost,
        COALESCE(mc.outputCost, 0) as outputCost,
        COALESCE(mc.totalCost, 0) as totalCost
       FROM messages m
       LEFT JOIN message_costs mc ON m.id = mc.messageId
       WHERE m.userId = ?
       ORDER BY m.timestamp DESC`,
      [userId],
    );

    // Calculate total message counts
    const totalUserMessages = messages.filter(m => m.role === 'user').length;
    const totalAssistantMessages = messages.filter(
      m => m.role === 'assistant',
    ).length;
    const totalSystemMessages = messages.filter(
      m => m.role === 'system',
    ).length;

    // Get match stats
    const matchStats = await db.all(
      `SELECT
        matchId,
        COUNT(*) as messageCount,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as userMessages,
        SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistantMessages,
        SUM(CASE WHEN role = 'system' THEN 1 ELSE 0 END) as systemMessages
       FROM messages
       WHERE userId = ?
       GROUP BY matchId
       ORDER BY messageCount DESC`,
      [userId],
    );

    // Calculate daily message usage
    const dailyUsage = await db.all(
      `SELECT
         date(timestamp) as date,
         COUNT(*) as messageCount,
         SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as userMessages,
         SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistantMessages,
         SUM(CASE WHEN role = 'system' THEN 1 ELSE 0 END) as systemMessages
       FROM messages
       WHERE userId = ?
       GROUP BY date(timestamp)
       ORDER BY date DESC`,
      [userId],
    );

    // Calculate total costs
    const [totalCosts] = await db.all(
      `SELECT
         COALESCE(SUM(mc.totalCost), 0) as totalCost,
         COALESCE(SUM(mc.totalTokens), 0) as totalTokens,
         COUNT(DISTINCT mc.messageId) as messageCount
       FROM messages m
       LEFT JOIN message_costs mc ON m.id = mc.messageId
       WHERE m.userId = ?`,
      [userId],
    );

    // Get Firebase user data
    const firebaseUser = await firebaseAdmin.auth().getUser(userId);

    const userInfo = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        dailyMessagesUsed: user.dailyMessagesUsed,
        extraMessages: user.extraMessages,
        lastResetDate: user.lastResetDate,
        installationId: user.installationId,
        firebaseData: {
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
          disabled: firebaseUser.disabled,
          metadata: firebaseUser.metadata,
          customClaims: firebaseUser.customClaims,
        },
      },
      usage: {
        totalMessages: messages.length,
        userMessages: totalUserMessages,
        assistantMessages: totalAssistantMessages,
        systemMessages: totalSystemMessages,
        totalCost: totalCosts?.totalCost || 0,
        totalTokens: totalCosts?.totalTokens || 0,
        dailyUsage,
        matchStats,
      },
      messages: messages.map(msg => ({
        id: msg.id,
        userId: msg.userId,
        matchId: msg.matchId,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        model: msg.model || '',
        promptTokens: msg.promptTokens || 0,
        completionTokens: msg.completionTokens || 0,
        totalTokens: msg.totalTokens || 0,
        inputCost: msg.inputCost || 0,
        outputCost: msg.outputCost || 0,
        totalCost: msg.totalCost || 0,
      })),
      costs: {
        total: totalCosts?.totalCost || 0,
        totalTokens: totalCosts?.totalTokens || 0,
        messageCount: totalCosts?.messageCount || 0,
      },
    };

    console.log(JSON.stringify(userInfo, null, 2));
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    process.exit(1);
  }
};

const fetchUserInfoFromFirestore = async () => {
  try {
    const firestore = firebaseAdmin.firestore() as Firestore;
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.error('User not found in Firestore');
      process.exit(1);
    }
    const user = userDoc.data();
    // Get matches subcollection
    const matchesSnap = await firestore
      .collection('users')
      .doc(userId)
      .collection('matches')
      .get();
    const matches = matchesSnap.docs.map(doc => ({id: doc.id, ...doc.data()}));
    // Get Firebase Auth user
    const firebaseUser = await firebaseAdmin.auth().getUser(userId);
    // Compose output similar to SQLite
    const userInfo = {
      user: {
        id: userId,
        email: user?.email,
        name: user?.name,
        plan: user?.plan,
        dailyMessagesUsed: user?.dailyMessagesUsed,
        extraMessages: user?.extraMessages,
        lastResetDate: user?.lastResetDate,
        installationId: user?.installationId,
        firebaseData: {
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
          disabled: firebaseUser.disabled,
          metadata: firebaseUser.metadata,
          customClaims: firebaseUser.customClaims,
        },
      },
      usage: {
        // Firestore doesn't have messages/costs unless you store them, so just show matches count
        totalMatches: matches.length,
        matches,
      },
    };
    console.log(JSON.stringify(userInfo, null, 2));
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    process.exit(1);
  }
};

if (useFirestore) {
  fetchUserInfoFromFirestore();
} else {
  fetchUserInfoFromSqlite();
}
