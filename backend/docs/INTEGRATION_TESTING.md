# Integration Testing Guide

This document describes the integration testing procedures for the Charmr backend, focusing on cost tracking, message generation, and end-to-end functionality validation.

## Overview

Integration tests verify that all backend components work together correctly, using real API endpoints and external services (OpenAI, Firestore) to ensure the entire system functions as expected.

## Test Scripts

### 1. Cost Tracking Integration Test

**File**: `scripts/createTestUserAndMessages.ts`

**Purpose**: Validates the complete cost tracking system including message-level costs, user-level aggregation, and summary storage.

**What it Tests**:

- ✅ User and match creation via API endpoints
- ✅ AI message generation with real cost calculation
- ✅ Cost tracking at both message and user levels
- ✅ Cost aggregation validation (user total = sum of individual messages)
- ✅ Summary storage in match document (not as system messages)
- ✅ Message storage with embedded cost data

**How it Works**:

1. Creates a test user via `POST /api/users`
2. Creates a test match via `POST /api/users/:userId/matches`
3. Generates AI replies via `POST /api/generate-reply` (creates both user and assistant messages)
4. Fetches all messages to verify cost tracking
5. Validates cost aggregation using `getUserInfo` script

**Usage**:

```bash
# Prerequisites: Backend server running on port 3001
npx ts-node scripts/createTestUserAndMessages.ts
```

**Expected Output**:

```
🧹 Cleaning up existing test data...
✅ Cleaned up existing user data.

👤 Creating test user...
✅ User created.

💕 Creating test match...
✅ Match created: [match-id]

💬 Generating conversation messages...
--- Message 1 ---
User: Hey! What are you up to this weekend?
AI Reply: Hey! Any fun plans for the weekend?
Cost: $0.001948 (680 tokens)

--- Message 2 ---
User: That sounds fun! Do you like hiking?
AI Reply: I love hiking! There's nothing like exploring new trails...
Cost: $0.002380 (763 tokens)

✅ Successfully generated 2 out of 2 messages.

=== COST SUMMARY ===
Total cost from individual messages: $0.004328
Total tokens from individual messages: 1443

=== VALIDATION ===
✅ Cost aggregation validation: PASSED
```

**Test Data**:

- **User ID**: `integration-test-user`
- **Email**: `integration-test@example.com`
- **Match Name**: `Integration Test Match`
- **Platform**: `tinder`

### 2. User Info Validation Script

**File**: `scripts/getUserInfo.ts`

**Purpose**: Retrieves and displays comprehensive user information including messages, costs, and usage statistics.

**Usage**:

```bash
# For Firestore
npm run user:info -- [userId] --firestore

# For SQLite
npm run user:info -- [userId]
```

**Output Includes**:

- User details and plan information
- Message counts by type (user, assistant, system)
- Cost breakdown (total cost, tokens, per-message costs)
- Match information and summaries
- Usage statistics

## Test Scenarios

### Cost Tracking Validation

**Objective**: Ensure costs are properly tracked and aggregated at both message and user levels.

**Test Steps**:

1. Generate multiple AI messages
2. Verify each message has embedded cost data
3. Check user-level cost totals match sum of individual messages
4. Validate cost persistence across server restarts

**Success Criteria**:

- Individual message costs are accurate
- User total cost = sum of all message costs
- Cost data persists in database
- No duplicate cost tracking

### Summary Storage Validation

**Objective**: Verify summaries are stored correctly in match documents, not as system messages.

**Test Steps**:

1. Generate messages that trigger summary updates
2. Check match document for summary field
3. Verify no summary system messages are created
4. Confirm summary context is still available for AI

**Success Criteria**:

- Summary stored only in match document
- No system messages with summary content
- Summary context available when loading conversations
- Summary updates correctly with new messages

### API Endpoint Testing

**Objective**: Ensure all API endpoints work correctly with real data.

**Tested Endpoints**:

- `POST /api/users` - User creation
- `POST /api/users/:userId/matches` - Match creation
- `POST /api/generate-reply` - AI message generation
- `GET /api/users/:userId/matches/:matchId/messages` - Message retrieval

**Success Criteria**:

- All endpoints return expected responses
- Error handling works correctly
- Authentication bypass functions properly
- Data is persisted correctly

## Troubleshooting

### Common Issues

#### 1. Connection Refused

**Error**: `ECONNREFUSED` when connecting to backend
**Solution**:

- Ensure backend server is running on port 3001
- Check `npm run dev` is executing successfully
- Verify no firewall blocking localhost connections

#### 2. OpenAI API Errors

**Error**: `Failed to generate reply` or API key issues
**Solution**:

- Verify `OPENAI_API_KEY` environment variable is set
- Check API key is valid and has sufficient credits
- Monitor rate limiting (add delays between requests)

#### 3. Firestore Connection Issues

**Error**: Firestore authentication or permission errors
**Solution**:

- Verify Google service account credentials
- Check Firestore rules allow read/write operations
- Ensure proper project configuration

#### 4. Cost Aggregation Failures

**Error**: User total cost doesn't match individual message costs
**Solution**:

- Check database transaction integrity
- Verify cost calculation logic is consistent
- Ensure no duplicate cost entries

#### 5. Summary System Messages

**Error**: Summary appearing as system messages instead of match document
**Solution**:

- Verify `conversationUtils.ts` changes are deployed
- Restart backend server after code changes
- Check summary service implementation

### Debugging Tips

1. **Check Server Logs**: Monitor backend console output for detailed error information
2. **Verify Environment**: Ensure all required environment variables are set
3. **Test Incrementally**: Run individual API calls to isolate issues
4. **Check Database**: Use Firestore console to verify data persistence
5. **Monitor Costs**: Track OpenAI API usage to ensure cost calculations are accurate

## Test Data Management

### Cleanup Procedures

**Automatic Cleanup**:

- Integration test script automatically deletes test user before starting
- Test data is isolated using specific user ID (`integration-test-user`)

**Manual Cleanup**:

```bash
# Delete test user via API
curl -X DELETE http://localhost:3001/api/users/integration-test-user \
  -H "X-Auth-Bypass: true"

# Or delete directly from Firestore console
```

### Test Data Isolation

- All test data uses specific identifiers to avoid conflicts
- Test user ID: `integration-test-user`
- Test match names include "Integration Test" prefix
- Automatic cleanup prevents data accumulation

## Continuous Integration

### Automated Testing

**Recommended CI Pipeline**:

1. Start backend server
2. Run integration test script
3. Validate cost aggregation
4. Check summary storage
5. Clean up test data

**Success Criteria for CI**:

- All API endpoints respond correctly
- Cost tracking validation passes
- No summary system messages created
- Test data cleanup completes successfully

### Manual Testing Checklist

Before deploying changes:

- [ ] Run integration test script
- [ ] Verify cost aggregation accuracy
- [ ] Check summary storage behavior
- [ ] Test error handling scenarios
- [ ] Validate API endpoint responses
- [ ] Confirm test data cleanup

## Performance Considerations

### Rate Limiting

- Add delays between API calls to avoid OpenAI rate limits
- Monitor API usage to stay within quotas
- Consider using test API keys for development

### Database Performance

- Test data cleanup prevents database bloat
- Monitor Firestore read/write operations
- Consider indexing for large datasets

### Cost Monitoring

- Track OpenAI API costs during testing
- Use cost calculation validation to catch billing issues
- Monitor token usage for optimization opportunities

## Future Enhancements

### Planned Test Improvements

1. **Automated Test Suite**: Convert to Jest-based integration tests
2. **Mock External Services**: Add option to mock OpenAI/Firestore for faster testing
3. **Performance Testing**: Add load testing for cost tracking under high volume
4. **Edge Case Testing**: Test error conditions and boundary cases
5. **Multi-User Testing**: Test cost tracking with multiple concurrent users

### Test Coverage Goals

- [ ] 100% API endpoint coverage
- [ ] All cost tracking scenarios
- [ ] Error handling validation
- [ ] Database consistency checks
- [ ] Performance benchmarking
