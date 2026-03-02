import {Firestore} from 'firebase-admin/firestore';
import {firebaseAdmin} from '../src/config/firebase-admin';
import {createSqliteDatabase} from '../src/db/sqlite';
import {Database} from '../src/db/types';

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

    // Get messages with their embedded cost data
    const messages = await db.all(
      `SELECT
        m.id, m.userId, m.matchId, m.role, m.content, m.timestamp,
        COALESCE(m.model, '') as model,
        COALESCE(m.promptTokens, 0) as promptTokens,
        COALESCE(m.completionTokens, 0) as completionTokens,
        COALESCE(m.totalTokens, 0) as totalTokens,
        COALESCE(m.inputCost, 0) as inputCost,
        COALESCE(m.outputCost, 0) as outputCost,
        COALESCE(m.totalCost, 0) as totalCost,
        COALESCE(m.costTimestamp, '') as costTimestamp
       FROM messages m
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

    // Get user cost totals from the new user-level tracking
    const userCosts = await db.getUserCosts(userId);

    // Also calculate costs from embedded message data for comparison
    const [embeddedCosts] = await db.all(
      `SELECT
         COALESCE(SUM(m.totalCost), 0) as totalCost,
         COALESCE(SUM(m.totalTokens), 0) as totalTokens,
         COUNT(DISTINCT CASE WHEN m.totalCost > 0 THEN m.id END) as messageCount
       FROM messages m
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
        totalCost: userCosts.totalCost,
        totalTokens: userCosts.totalTokens,
        lastCostUpdate: userCosts.lastCostUpdate,
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
        totalCost: userCosts.totalCost,
        totalTokens: userCosts.totalTokens,
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
        costTimestamp: msg.costTimestamp || '',
      })),
      costs: {
        user: userCosts,
        embedded: {
          total: embeddedCosts?.totalCost || 0,
          totalTokens: embeddedCosts?.totalTokens || 0,
          messageCount: embeddedCosts?.messageCount || 0,
        },
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

    // Get messages from all matches
    const allMessages: any[] = [];
    for (const match of matches) {
      const messagesSnap = await firestore
        .collection('users')
        .doc(userId)
        .collection('matches')
        .doc(match.id)
        .collection('messages')
        .get();
      const matchMessages = messagesSnap.docs.map(doc => ({
        id: doc.id,
        matchId: match.id,
        ...doc.data(),
      }));
      allMessages.push(...matchMessages);
    }

    // Calculate message counts
    const totalUserMessages = allMessages.filter(m => m.role === 'user').length;
    const totalAssistantMessages = allMessages.filter(
      m => m.role === 'assistant',
    ).length;
    const totalSystemMessages = allMessages.filter(
      m => m.role === 'system',
    ).length;

    // Get Firebase Auth user (optional - user might not exist in Auth)
    let firebaseUser = null;
    try {
      firebaseUser = await firebaseAdmin.auth().getUser(userId);
    } catch (error) {
      console.log(
        'User not found in Firebase Auth (this is normal for test users)',
      );
    }

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
        totalCost: user?.totalCost || 0,
        totalTokens: user?.totalTokens || 0,
        lastCostUpdate: user?.lastCostUpdate,
        firebaseData: firebaseUser
          ? {
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified,
              disabled: firebaseUser.disabled,
              metadata: firebaseUser.metadata,
              customClaims: firebaseUser.customClaims,
            }
          : null,
      },
      usage: {
        totalMessages: allMessages.length,
        userMessages: totalUserMessages,
        assistantMessages: totalAssistantMessages,
        systemMessages: totalSystemMessages,
        totalCost: user?.totalCost || 0,
        totalTokens: user?.totalTokens || 0,
        totalMatches: matches.length,
        matches,
      },
      messages: allMessages.map(msg => ({
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
        costTimestamp: msg.costTimestamp || '',
      })),
      costs: {
        user: {
          totalCost: user?.totalCost || 0,
          totalTokens: user?.totalTokens || 0,
          lastCostUpdate: user?.lastCostUpdate,
        },
        embedded: {
          total: allMessages.reduce(
            (sum, msg) => sum + (msg.totalCost || 0),
            0,
          ),
          totalTokens: allMessages.reduce(
            (sum, msg) => sum + (msg.totalTokens || 0),
            0,
          ),
          messageCount: allMessages.filter(msg => msg.totalCost > 0).length,
        },
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
