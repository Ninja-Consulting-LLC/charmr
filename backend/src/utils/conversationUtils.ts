import {getDatabase} from '../db';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export async function loadConversation(
  userId: string,
  matchId: string,
): Promise<Message[]> {
  try {
    const db = await getDatabase();
    return await db.getMessages(userId, matchId);
  } catch (error) {
    console.error('Error loading conversation:', error);
    return [];
  }
}

export async function saveMessage(
  userId: string,
  matchId: string,
  message: Message,
): Promise<void> {
  try {
    const db = await getDatabase();
    await db.saveMessage(userId, matchId, message);
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
}

export async function appendConversation(
  userId: string,
  matchId: string,
  summary: string,
  assistantMessage: string,
): Promise<void> {
  const timestamp = new Date().toISOString();

  console.log('\n=== Saving Conversation ===');
  console.log('Summary:', summary);
  console.log('Assistant Message:', assistantMessage);
  console.log('==========================\n');

  // Save the summary as a system message if it exists
  if (summary) {
    await saveMessage(userId, matchId, {
      role: 'system',
      content: summary,
      timestamp,
    });
  }

  // Save the assistant message
  await saveMessage(userId, matchId, {
    role: 'assistant',
    content: assistantMessage,
    timestamp,
  });
}
