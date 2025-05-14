import Config from 'react-native-config';

const apiBaseUrl = process.env.API_URL || 'http://localhost:3001';

interface GenerateReplyResponse {
  reply: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

interface Message {
  id: string;
  userId: string;
  matchId: string;
  role: string;
  content: string;
  timestamp: string;
}

async function testHealthEndpoint() {
  console.log('\n🔍 Testing health endpoint...');
  console.log(`Using API base URL: ${apiBaseUrl}`);

  try {
    const response = await fetch(`${apiBaseUrl}/api/utility/health`);

    if (response.ok) {
      console.log('✅ Health check passed');
      const data = await response.json();
      console.log('Server status:', data);
    } else {
      console.error('❌ Health check failed:', response.status);
      const text = await response.text();
      console.error('Response:', text);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to connect to backend:', error);
    return false;
  }
  return true;
}

async function testGenerateReplyEndpoint() {
  console.log('\n🔍 Testing generate-reply endpoint...');

  // First get a valid user ID from the database
  const usersResponse = await fetch(`${apiBaseUrl}/api/admin/users`, {
    headers: {
      Authorization: `Bearer ${Config.ADMIN_TOKEN}`,
    },
  });

  if (!usersResponse.ok) {
    console.error('❌ Failed to fetch users:', usersResponse.status);
    return false;
  }

  const users = (await usersResponse.json()) as User[];
  if (users.length === 0) {
    console.error('❌ No users found in database');
    return false;
  }

  const testPayload = {
    prompt: 'make it funny',
    images: ['data:image/jpeg;base64,test123'],
    userId: users[0].id,
    matchId: 'test-match-1',
    deleteAfterResponse: true,
    skipRateLimiting: true,
  };

  try {
    const response = await fetch(`${apiBaseUrl}/api/generate-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    if (response.ok) {
      const data = (await response.json()) as GenerateReplyResponse;
      console.log('✅ Generate reply endpoint working');
      console.log('Generated reply:', data.reply);
    } else {
      console.error('❌ Generate reply failed:', response.status);
      const text = await response.text();
      console.error('Response:', text);
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to test generate reply:', error);
    return false;
  }
  return true;
}

async function testAdminEndpoints() {
  console.log('\n🔍 Testing admin endpoints...');

  try {
    // Fetch all users
    const usersResponse = await fetch(`${apiBaseUrl}/api/admin/users`, {
      headers: {
        Authorization: `Bearer ${Config.ADMIN_TOKEN}`,
      },
    });

    if (!usersResponse.ok) {
      console.error('❌ Failed to fetch users:', usersResponse.status);
      return false;
    }

    const users = (await usersResponse.json()) as User[];
    console.log('\n📊 Users:', JSON.stringify(users, null, 2));

    // Fetch messages for each user
    console.log('\n📝 Fetching messages for each user...');
    for (const user of users) {
      const messagesResponse = await fetch(
        `${apiBaseUrl}/api/admin/users/${user.id}/messages`,
        {
          headers: {
            Authorization: `Bearer ${Config.ADMIN_TOKEN}`,
          },
        },
      );

      if (!messagesResponse.ok) {
        console.error(
          `❌ Failed to fetch messages for user ${user.id}:`,
          messagesResponse.status,
        );
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Failed to fetch messages:', error);
    return false;
  }
  return true;
}

async function runTests() {
  const healthCheck = await testHealthEndpoint();
  const generateReply = await testGenerateReplyEndpoint();
  const adminEndpoints = await testAdminEndpoints();

  if (healthCheck && generateReply && adminEndpoints) {
    console.log('\n✅ All tests passed');
  } else {
    console.error('\n❌ Some tests failed');
  }
}

runTests();
