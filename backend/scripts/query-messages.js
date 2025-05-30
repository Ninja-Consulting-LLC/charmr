const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function queryMessages() {
  try {
    // First, we need to find which user this match belongs to
    const usersSnapshot = await db.collection('users').get();
    let messages = [];

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const matchDoc = await userDoc.ref
        .collection('matches')
        .doc('LjweK7MD2z6JxCrkXEAD')
        .get();

      if (matchDoc.exists) {
        const messagesSnapshot = await matchDoc.ref
          .collection('messages')
          .get();
        messagesSnapshot.forEach(doc => {
          const data = doc.data();
          messages.push({
            id: doc.id,
            ...data,
          });
        });
        break; // Found the match, no need to check other users
      }
    }

    // Sort messages by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);

    console.log('Found', messages.length, 'messages:');

    // Track timestamps for comparison
    const timestamps = new Set();
    const roleTimestamps = {
      user: [],
      assistant: [],
      system: [],
    };

    messages.forEach((message, index) => {
      const date = new Date(message.timestamp);
      timestamps.add(message.timestamp);
      roleTimestamps[message.role].push({
        timestamp: message.timestamp,
        content: message.content,
      });

      console.log(`\nMessage ${index + 1}:`);
      console.log('Message ID:', message.id);
      console.log('Timestamp:', message.timestamp);
      console.log('Parsed Date:', date.toISOString());
      console.log('Milliseconds:', date.getMilliseconds());
      console.log('Content:', message.content);
      console.log('Role:', message.role);
      console.log('-------------------');
    });

    // Analyze message sequence
    console.log('\nMessage Sequence Analysis:');
    console.log('------------------------');

    // Check if user messages come first
    const firstMessage = messages[0];
    console.log('First message role:', firstMessage.role);

    // Check if assistant messages come after user messages
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const systemMessages = messages.filter(m => m.role === 'system');

    console.log('\nMessage Counts by Role:');
    console.log('User messages:', userMessages.length);
    console.log('Assistant messages:', assistantMessages.length);
    console.log('System messages:', systemMessages.length);

    // Check timestamps for each role
    console.log('\nTimestamps by Role:');
    Object.entries(roleTimestamps).forEach(([role, msgs]) => {
      console.log(`\n${role.toUpperCase()} messages:`);
      msgs.forEach(msg => {
        console.log(`- ${msg.timestamp} (${msg.content.substring(0, 30)}...)`);
      });
    });

    // Check for timestamp increments
    console.log('\nTimestamp Increment Analysis:');
    messages.forEach((msg, i) => {
      if (i > 0) {
        const prevMsg = messages[i - 1];
        const timeDiff = new Date(msg.timestamp) - new Date(prevMsg.timestamp);
        console.log(`\nTime difference between message ${i} and ${i + 1}:`);
        console.log(`From ${prevMsg.role} to ${msg.role}: ${timeDiff}ms`);
      }
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

queryMessages();
