import axios from 'axios';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import {formatPrompt} from '../config/prompts';
import {imageOnlyVariantA} from '../config/prompts/variantA';
import {imageOnlyVariantB} from '../config/prompts/variantB';
import {MessageMode, SubscriptionTier} from '../types/enums';

// Use require for service account
const serviceAccount = require('../../service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}
const db = admin.firestore();

const projectRoot = path.resolve(__dirname, '../../../');
const userId = 'test-user-123';
const testCases = [
  {
    screenshotPath: path.join(
      projectRoot,
      'assets/dating_screenshots/dating-conversation.PNG',
    ),
    matchContext: 'Sarah, 28, loves hiking and photography',
    previousSummary:
      'Initial conversation about shared interests in outdoor activities',
    matchId: 'test-match-1',
    name: 'Sarah',
    platform: 'tinder',
  },
  {
    screenshotPath: path.join(
      projectRoot,
      'assets/dating_screenshots/dating-profile-photos-and-text.PNG',
    ),
    matchContext: 'Alex, 31, enjoys traveling and trying new restaurants',
    previousSummary:
      'Profile shows multiple travel photos and mentions food preferences',
    matchId: 'test-match-2',
    name: 'Alex',
    platform: 'tinder',
  },
  {
    screenshotPath: path.join(
      projectRoot,
      'assets/dating_screenshots/dating-profile-photos-only.PNG',
    ),
    matchContext: 'Jordan, 29, fitness enthusiast and coffee lover',
    previousSummary: 'Profile has gym and coffee shop photos',
    matchId: 'test-match-3',
    name: 'Jordan',
    platform: 'tinder',
  },
];

const promptVariants = {
  A: imageOnlyVariantA,
  B: imageOnlyVariantB,
};

const temperatures = [0.7, 1.0];

const results: any[] = [];

async function cleanupUserTestData(userId: string) {
  const userRef = db.collection('users').doc(userId);

  // Get all matches
  const matchesRef = userRef.collection('matches');
  const matchesSnapshot = await matchesRef.get();

  // For each match, delete its messages first
  const deletePromises = matchesSnapshot.docs.map(async matchDoc => {
    const messagesRef = matchDoc.ref.collection('messages');
    const messagesSnapshot = await messagesRef.get();
    const messageDeletePromises = messagesSnapshot.docs.map(doc =>
      doc.ref.delete(),
    );
    await Promise.all(messageDeletePromises);
    return matchDoc.ref.delete();
  });

  // Wait for all matches and their messages to be deleted
  await Promise.all(deletePromises);

  // Finally delete the user document
  await userRef.delete();
}

async function setupTestUserAndMatches() {
  const userRef = db.collection('users').doc(userId);
  await userRef.set({
    email: `${userId}@example.com`,
    name: `Test User ${userId}`,
    plan: SubscriptionTier.PRO,
    dailyMessagesUsed: 0,
    extraMessages: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    installationId: null,
  });
  for (const testCase of testCases) {
    const matchRef = userRef.collection('matches').doc(testCase.matchId);
    await matchRef.set({
      name: testCase.name,
      platform: testCase.platform,
      lastUsed: new Date().toISOString(),
      hidden: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

async function getBase64Image(imagePath: string): Promise<string> {
  const fullPath = path.resolve(process.cwd(), imagePath);
  const imageBuffer = fs.readFileSync(fullPath);
  return `data:image/png;base64,${imageBuffer.toString('base64')}`;
}

async function generateResponse(
  promptConfig: typeof imageOnlyVariantA,
  temperature: number,
  testCase: any,
  userId: string,
  matchId: string,
): Promise<{message: string; summary: string}> {
  const base64Image = await getBase64Image(testCase.screenshotPath);
  const formattedPrompt = formatPrompt(
    promptConfig,
    MessageMode.GENERATE,
    false,
    undefined,
    true,
  );
  try {
    const response = await axios.post(
      'http://localhost:3001/api/generate-reply',
      {
        userId,
        matchId,
        images: [base64Image],
        match: {
          name: testCase.name,
          context: testCase.matchContext,
          previousSummary: testCase.previousSummary,
          platform: testCase.platform,
        },
        prompt: formattedPrompt,
        temperature,
      },
    );
    return {
      message: response.data.reply,
      summary: response.data.summary,
    };
  } catch (error) {
    const err = error as any;
    if (err && err.response) {
      console.error('Error generating response:', {
        status: err.response.status,
        data: err.response.data,
        headers: err.response.headers,
      });
    } else {
      console.error('Error generating response:', err);
    }
    throw new Error('Failed to generate response');
  }
}

describe('Prompt Variant Integration Tests', () => {
  beforeAll(async () => {
    await cleanupUserTestData(userId);
    await setupTestUserAndMatches();
  });

  afterAll(async () => {
    await cleanupUserTestData(userId);
    // Write results to prompt-test-results.md in project root
    const outputPath = path.resolve(
      __dirname,
      '../../../prompt-test-results.md',
    );
    let mdContent = '# Prompt Test Results\n\n';
    mdContent += '## Summary\n\n';
    mdContent += '| Variant | Temperature | Success |\n';
    mdContent += '|---------|-------------|--------|\n';
    results.forEach(result => {
      mdContent += `| ${result.variant} | ${result.temperature} | ${
        result.success ? '✅' : '❌'
      } |\n`;
    });
    mdContent += '\n## Detailed Results\n\n';
    results.forEach((result, index) => {
      mdContent += `### Test Case ${index + 1}\n\n`;
      mdContent += `- **Variant:** ${result.variant}\n`;
      mdContent += `- **Temperature:** ${result.temperature}\n`;
      mdContent += `- **Success:** ${result.success ? 'Yes' : 'No'}\n`;
      if (result.success) {
        mdContent += `- **Response:**\n  - Message: ${result.response.message}\n  - Summary: ${result.response.summary}\n`;
      } else {
        mdContent += `- **Error:**\n  \`\`\`json\n  ${JSON.stringify(
          result.error,
          null,
          2,
        )}\n  \`\`\`\n`;
      }
      mdContent += '\n';
    });
    fs.writeFileSync(outputPath, mdContent, 'utf-8');
    console.log(`Prompt test results written to ${outputPath}`);
  });

  it.each(
    testCases.flatMap(testCase =>
      Object.entries(promptVariants).flatMap(([variant, promptConfig]) =>
        temperatures.map(temperature => ({
          testCase,
          variant,
          promptConfig,
          temperature,
        })),
      ),
    ),
  )(
    'should generate a response for variant %s at temperature %f for %s',
    async ({testCase, variant, promptConfig, temperature}) => {
      let result: any = {
        testCase: {
          matchId: testCase.matchId,
          name: testCase.name,
          platform: testCase.platform,
          matchContext: testCase.matchContext,
          previousSummary: testCase.previousSummary,
        },
        variant,
        temperature,
        success: false,
        response: null,
        error: null,
      };
      try {
        const response = await generateResponse(
          promptConfig,
          temperature,
          testCase,
          userId,
          testCase.matchId,
        );
        expect(response.message).toBeDefined();
        expect(response.summary).toBeDefined();
        expect(typeof response.message).toBe('string');
        expect(typeof response.summary).toBe('string');
        result.success = true;
        result.response = response;
      } catch (err: any) {
        result.error =
          err && err.response
            ? {
                status: err.response.status,
                data: err.response.data,
                headers: err.response.headers,
              }
            : err && err.message
            ? err.message
            : String(err);
      } finally {
        results.push(result);
      }
    },
  );
});
