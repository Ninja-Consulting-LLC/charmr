import {applicationDefault, initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';

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
  } catch (error) {
    console.error('Error creating test match:', error);
  }
}

createTestMatch();
