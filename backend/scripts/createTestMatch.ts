import {applicationDefault, initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {MessageMode, MessageRole, MessageType} from '../src/types/enums';

// Initialize Firebase Admin
initializeApp({
  credential: applicationDefault(),
  projectId: 'ai-dating-keyboard',
});

const db = getFirestore();

// Get userId from command line or use a default
const userId = process.argv[2] || 'test-user-123';

async function createTestMatch() {
  try {
    // First check if user exists
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log(`Creating user ${userId}...`);
      await db
        .collection('users')
        .doc(userId)
        .set({
          email: `${userId}@example.com`,
          name: `Test User ${userId}`,
          plan: 'FREE',
          dailyMessagesUsed: 0,
          extraMessages: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
          installationId: null,
        });
    }

    const matchData = {
      name: 'Test Match',
      platform: 'tinder',
      lastUsed: new Date().toISOString(),
      hidden: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db
      .collection('users')
      .doc(userId)
      .collection('matches')
      .add(matchData);
    console.log('Created test match with ID:', docRef.id);

    // Generate 30 test messages (more than our PAGE_SIZE of 20)
    const messages = [];
    const now = new Date();

    for (let i = 0; i < 30; i++) {
      const timestamp = new Date(now.getTime() - (30 - i) * 60000); // 1 minute apart
      const isUser = i % 2 === 0;

      messages.push({
        role: isUser ? MessageRole.USER : MessageRole.ASSISTANT,
        type: MessageType.TEXT,
        mode: isUser ? MessageMode.GENERATE : MessageMode.COACH,
        used: !isUser,
        replyTo: null,
        content: isUser
          ? `Test message ${i + 1} from user`
          : `Test response ${i + 1} from coach`,
        timestamp: timestamp.toISOString(),
        imageData: null,
      });
    }

    // Add messages in batches
    const batch = db.batch();
    const messagesRef = db
      .collection('users')
      .doc(userId)
      .collection('matches')
      .doc(docRef.id)
      .collection('messages');

    messages.forEach(message => {
      const docRef = messagesRef.doc();
      batch.set(docRef, message);
    });

    await batch.commit();
    console.log(`Successfully added ${messages.length} test messages`);
  } catch (error) {
    console.error('Error creating test match:', error);
  }
}

createTestMatch();
