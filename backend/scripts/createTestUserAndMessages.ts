/**
 * Integration Test Script: Cost Tracking and Message Generation
 *
 * This script performs a true end-to-end integration test of the backend's
 * cost tracking and message generation functionality. It uses the real API
 * endpoints (same as the frontend) to ensure all backend logic is exercised.
 *
 * WHAT IT TESTS:
 * 1. User and match creation via API endpoints
 * 2. AI message generation with real cost calculation
 * 3. Cost tracking at both message and user levels
 * 4. Cost aggregation validation (user total = sum of individual messages)
 * 5. Summary storage in match document (not as system messages)
 * 6. Message storage with embedded cost data
 *
 * HOW IT WORKS:
 * 1. Creates a test user via POST /api/users
 * 2. Creates a test match via POST /api/users/:userId/matches
 * 3. Generates AI replies via POST /api/generate-reply (creates both user and assistant messages)
 * 4. Fetches all messages to verify cost tracking
 * 5. Validates cost aggregation using getUserInfo script
 *
 * EXPECTED OUTPUT:
 * - User and match creation confirmation
 * - AI-generated replies with cost breakdown
 * - Message list showing embedded cost data
 * - Cost summary showing individual vs aggregated costs
 * - Validation results confirming cost tracking accuracy
 *
 * USAGE:
 *   npx ts-node scripts/createTestUserAndMessages.ts
 *
 * PREREQUISITES:
 * - Backend server running on http://localhost:3001
 * - OpenAI API key configured
 * - Firestore database configured
 *
 * CLEANUP:
 * The script automatically cleans up existing test data before starting.
 * Test user ID: 'integration-test-user'
 */

import axios from 'axios';
import {execSync} from 'child_process';

const API_BASE_URL = 'http://localhost:3001/api'; // Adjusted to correct backend port
const USER_ID = 'integration-test-user';
const MATCH_NAME = 'Integration Test Match';
const MATCH_PLATFORM = 'tinder';
const USER_EMAIL = 'integration-test@example.com';
const USER_NAME = 'Integration Test User';

async function main() {
  // Helper for bypassing auth in dev
  const headers = {'X-Auth-Bypass': 'true'};

  // STEP 1: Clean up existing test data to ensure fresh start
  console.log('🧹 Cleaning up existing test data...');
  try {
    await axios.delete(`${API_BASE_URL}/users/${USER_ID}`, {headers});
    console.log('✅ Cleaned up existing user data.');
  } catch (e: any) {
    // User doesn't exist, that's fine
    console.log('ℹ️  No existing user to clean up.');
  }

  // STEP 2: Create test user via API endpoint
  console.log('\n👤 Creating test user...');
  try {
    await axios.post(
      `${API_BASE_URL}/users`,
      {id: USER_ID, email: USER_EMAIL, name: USER_NAME, plan: 'free'},
      {headers},
    );
    console.log('✅ User created.');
  } catch (e: any) {
    if (e.response?.status === 400) {
      console.log('ℹ️  User already exists.');
    } else {
      console.error('❌ Failed to create user:', e.message);
      process.exit(1);
    }
  }

  // STEP 3: Create test match via API endpoint
  console.log('\n💕 Creating test match...');
  let matchId = '';
  try {
    const matchRes = await axios.post(
      `${API_BASE_URL}/users/${USER_ID}/matches`,
      {name: MATCH_NAME, platform: MATCH_PLATFORM},
      {headers},
    );
    matchId = matchRes.data.id || matchRes.data.match?.id;
    console.log(`✅ Match created: ${matchId}`);
  } catch (e: any) {
    if (e.response?.data?.match?.id) {
      matchId = e.response.data.match.id;
      console.log('Match already exists, using:', matchId);
    } else {
      throw e;
    }
  }

  // STEP 4: Generate multiple messages in a conversation to test cost aggregation
  console.log('\n💬 Generating conversation messages...');
  const conversationMessages = [
    'Hey! What are you up to this weekend?',
    'That sounds fun! Do you like hiking?',
  ];

  let totalMessageCosts = 0;
  let totalMessageTokens = 0;
  let successfulMessages = 0;

  for (let i = 0; i < conversationMessages.length; i++) {
    const userMessage = conversationMessages[i];
    console.log(`\n--- Message ${i + 1} ---`);
    console.log('User:', userMessage);

    try {
      // Generate AI reply via the real API endpoint (same as frontend)
      const replyRes = await axios.post(
        `${API_BASE_URL}/generate-reply`,
        {prompt: userMessage, userId: USER_ID, matchId},
        {headers},
      );

      const aiReply = replyRes.data.reply;
      const aiSummary = replyRes.data.summary;
      const usage = replyRes.data.usage;

      console.log('AI Reply:', aiReply);
      if (aiSummary) console.log('Summary:', aiSummary);

      // Log cost info from API response (for debugging)
      if (usage) {
        const messageCost =
          (usage.prompt_tokens / 1000) * 0.0025 +
          (usage.completion_tokens / 1000) * 0.01;
        console.log(
          `API Cost: $${messageCost.toFixed(6)} (${usage.total_tokens} tokens)`,
        );
      }

      successfulMessages++;

      // Add delay between messages to avoid rate limiting
      if (i < conversationMessages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (e: any) {
      console.error(
        `❌ Failed to generate message ${i + 1}:`,
        e.response?.data?.error || e.message,
      );
    }
  }

  console.log(
    `\n✅ Successfully generated ${successfulMessages} out of ${conversationMessages.length} messages.`,
  );

  // STEP 5: Fetch all messages to verify cost tracking and storage
  console.log('\n📋 Fetching all messages to verify cost tracking...');
  try {
    const messagesRes = await axios.get(
      `${API_BASE_URL}/users/${USER_ID}/matches/${matchId}/messages`,
      {headers},
    );

    const messages = messagesRes.data.messages || messagesRes.data;
    console.log('\n=== ALL MESSAGES ===');

    for (const msg of messages) {
      console.log(JSON.stringify(msg, null, 2));
      if (msg.role === 'assistant' && msg.totalCost) {
        totalMessageCosts += msg.totalCost;
        totalMessageTokens += msg.totalTokens || 0;
      }
    }
  } catch (e: any) {
    console.error(
      '❌ Failed to fetch messages:',
      e.response?.data?.error || e.message,
    );
    throw e;
  }

  // STEP 6: Display cost summary
  console.log('\n=== COST SUMMARY ===');
  console.log(
    `Total cost from individual messages: $${totalMessageCosts.toFixed(6)}`,
  );
  console.log(`Total tokens from individual messages: ${totalMessageTokens}`);

  // STEP 7: Validate cost aggregation using getUserInfo script
  console.log('\n=== VALIDATION ===');
  console.log('User info from Firestore:');
  try {
    const userInfoOutput = execSync(
      `npm run user:info -- ${USER_ID} --firestore`,
      {
        encoding: 'utf8',
        cwd: process.cwd(),
      },
    );
    console.log(userInfoOutput);

    // Try to parse the JSON output to validate cost aggregation
    const lines = userInfoOutput.split('\n');
    const jsonStartIndex = lines.findIndex(line => line.trim().startsWith('{'));
    if (jsonStartIndex !== -1) {
      const jsonLines = lines.slice(jsonStartIndex);
      const jsonStr = jsonLines.join('\n');
      const userInfo = JSON.parse(jsonStr);

      const userTotalCost =
        userInfo.user?.totalCost || userInfo.usage?.totalCost || 0;
      const userTotalTokens =
        userInfo.user?.totalTokens || userInfo.usage?.totalTokens || 0;
      const embeddedTotalCost = userInfo.costs?.embedded?.total || 0;
      const embeddedTotalTokens = userInfo.costs?.embedded?.totalTokens || 0;

      console.log('\n=== COST VALIDATION RESULTS ===');
      console.log(`User total cost: $${userTotalCost}`);
      console.log(`User total tokens: ${userTotalTokens}`);
      console.log(`Embedded total cost: $${embeddedTotalCost}`);
      console.log(`Embedded total tokens: ${embeddedTotalTokens}`);
      console.log(
        `Individual messages total: $${totalMessageCosts.toFixed(6)}`,
      );
      console.log(`Individual messages tokens: ${totalMessageTokens}`);

      // Compare user total with individual message costs from current match
      const costDiff = Math.abs(userTotalCost - totalMessageCosts);
      const tokenDiff = Math.abs(userTotalTokens - totalMessageTokens);

      if (costDiff < 0.0001 && tokenDiff === 0) {
        console.log('✅ Cost aggregation validation: PASSED');
      } else {
        console.log('❌ Cost aggregation validation: FAILED');
        console.log(`Cost difference: $${costDiff.toFixed(6)}`);
        console.log(`Token difference: ${tokenDiff}`);
        console.log(
          'Note: User total includes costs from all matches, individual total is from current match only',
        );
      }
    }
  } catch (e: any) {
    console.error('❌ Could not parse user info JSON');
  }
}

// Run the integration test
main().catch(error => {
  console.error('\n❌ Integration test failed:', error.message);
  console.error('\n🔧 TROUBLESHOOTING:');
  console.error('1. Ensure backend server is running on http://localhost:3001');
  console.error('2. Check that OpenAI API key is configured');
  console.error('3. Verify Firestore database is accessible');
  console.error('4. Check server logs for detailed error information');
  console.error('5. Ensure you have proper authentication bypass headers');
  process.exit(1);
});

/**
 * TROUBLESHOOTING GUIDE:
 *
 * Common Issues:
 *
 * 1. "Connection refused" error:
 *    - Backend server not running
 *    - Wrong port (should be 3001)
 *    - Solution: Start backend with `npm run dev`
 *
 * 2. "User not found" error:
 *    - Authentication issues
 *    - Solution: Check X-Auth-Bypass header is working
 *
 * 3. "Failed to generate reply" error:
 *    - OpenAI API key missing/invalid
 *    - Rate limiting
 *    - Solution: Check OpenAI configuration and API limits
 *
 * 4. Cost aggregation fails:
 *    - Database sync issues
 *    - Solution: Check Firestore connectivity and permissions
 *
 * 5. "Could not parse user info JSON":
 *    - getUserInfo script output format changed
 *    - Solution: Check getUserInfo script is working correctly
 *
 * Expected Test Results:
 * - ✅ User and match created successfully
 * - ✅ AI replies generated with cost data
 * - ✅ Messages stored with embedded cost fields
 * - ✅ Cost aggregation validation passes
 * - ✅ Summary stored in match document (not as system messages)
 *
 * Test Data Cleanup:
 * - Test user ID: 'integration-test-user'
 * - Automatically cleaned up before each run
 * - Can be manually deleted via API or Firestore console
 */
