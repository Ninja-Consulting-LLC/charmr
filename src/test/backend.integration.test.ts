const apiBaseUrl = process.env.API_URL || 'http://localhost:3001';

interface GenerateReplyResponse {
  reply: string;
}

async function testHealthEndpoint() {
  console.log('\n🔍 Testing health endpoint...');
  console.log(`Using API base URL: ${apiBaseUrl}`);

  try {
    const response = await fetch(`${apiBaseUrl}/health`);

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

  const testPayload = {
    prompt: 'make it funny',
    images: ['data:image/jpeg;base64,test123'],
    userId: 'test-user-1',
    matchId: 'test-match-1',
    deleteAfterResponse: true,
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

async function runTests() {
  console.log('🚀 Starting backend tests...');

  const healthPassed = await testHealthEndpoint();
  if (!healthPassed) {
    console.error('❌ Health check failed - skipping remaining tests');
    process.exit(1);
  }

  const generateReplyPassed = await testGenerateReplyEndpoint();
  if (!generateReplyPassed) {
    console.error('❌ Generate reply test failed');
    process.exit(1);
  }

  console.log('\n✨ All tests passed successfully!');
}

// Run all tests
runTests();
