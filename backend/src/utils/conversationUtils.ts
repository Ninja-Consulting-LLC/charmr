import fs from 'fs';
import path from 'path';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface Conversation {
  messages: Message[];
}

const CONVERSATIONS_DIR = path.join(process.cwd(), 'conversations');

// Ensure conversations directory exists
if (!fs.existsSync(CONVERSATIONS_DIR)) {
  fs.mkdirSync(CONVERSATIONS_DIR, {recursive: true});
}

export async function loadConversation(
  userId: string,
  matchId: string,
): Promise<Message[]> {
  const userDir = path.join(CONVERSATIONS_DIR, userId);
  const conversationPath = path.join(userDir, `${matchId}.json`);

  if (!fs.existsSync(conversationPath)) {
    return [];
  }

  try {
    const data = await fs.promises.readFile(conversationPath, 'utf-8');
    const conversation: Conversation = JSON.parse(data);
    return conversation.messages;
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
  const userDir = path.join(CONVERSATIONS_DIR, userId);
  const conversationPath = path.join(userDir, `${matchId}.json`);

  // Ensure user directory exists
  if (!fs.existsSync(userDir)) {
    await fs.promises.mkdir(userDir, {recursive: true});
  }

  let conversation: Conversation;
  try {
    const data = await fs.promises.readFile(conversationPath, 'utf-8');
    conversation = JSON.parse(data);
  } catch (error) {
    conversation = {messages: []};
  }

  conversation.messages.push(message);

  await fs.promises.writeFile(
    conversationPath,
    JSON.stringify(conversation, null, 2),
    'utf-8',
  );
}

export async function appendConversation(
  userId: string,
  matchId: string,
  summary: string,
  assistantMessage: string,
): Promise<void> {
  const timestamp = new Date().toISOString();
  const userDir = path.join(CONVERSATIONS_DIR, userId);
  const conversationPath = path.join(userDir, `${matchId}.json`);

  console.log('\n=== Saving Conversation ===');
  console.log('User Directory:', userDir);
  console.log('Conversation Path:', conversationPath);
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

  // Verify the file was created
  if (fs.existsSync(conversationPath)) {
    console.log('✅ Conversation file saved successfully:', conversationPath);
  } else {
    console.error('❌ Failed to save conversation file:', conversationPath);
  }
}
