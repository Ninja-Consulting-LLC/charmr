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
  const matchData = {
    userId,
    name: 'Test Match',
    platform: 'tinder',
    lastUsed: new Date().toISOString(),
    hidden: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const docRef = await db.collection('matches').add(matchData);
  console.log('Created test match with ID:', docRef.id);
}

createTestMatch().catch(err => {
  console.error('Error creating test match:', err);
  process.exit(1);
});
