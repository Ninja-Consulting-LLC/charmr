import axios from 'axios';
import {default as admin, default as firebaseAdmin} from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {formatPrompt} from '../config/prompts';
import {
  coachVariantA,
  generateVariantA,
  imageOnlyVariantA,
} from '../config/prompts/variantA';
import {
  coachVariantB,
  generateVariantB,
  imageOnlyVariantB,
} from '../config/prompts/variantB';
import {MessageMode, SubscriptionTier} from '../types/enums';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('overwrite', {
    type: 'boolean',
    description: 'Overwrite existing results.json instead of appending',
    default: false,
  })
  .parseSync();

// Function to calculate composite score
function calculateCompositeScore(scores: {
  relevance: number | null;
  tone: number | null;
  originality: number | null;
  sendability: number | null;
  composite: number | null;
}): number | null {
  const validScores = Object.values(scores).filter(
    (score): score is number => score !== null && score !== undefined,
  );
  if (validScores.length === 0) return null;
  return (
    validScores.reduce((sum, score) => sum + score, 0) / validScores.length
  );
}

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
    userPrompt: 'Do you think I should ask about their cooking?',
    previousSummary: '',
    matchId: 'test-match-1',
    name: 'Grace',
    platform: 'tinder',
    coachMode: true,
    usePrompt: false,
    variants: ['B'] as const,
    temperatures: [1.0],
  },
  // {
  //   screenshotPath: path.join(
  //     projectRoot,
  //     'assets/dating_screenshots/dating-profile-photos-and-text.PNG',
  //   ),
  //   userPrompt: '',
  //   previousSummary: '',
  //   matchId: 'test-match-2',
  //   name: 'Michelle',
  //   platform: 'tinder',
  //   coachMode: false,
  //   usePrompt: false,
  //   variants: ['A', 'B'],
  //   temperatures: [0.7, 1.0],
  // },
  // {
  //   screenshotPath: path.join(
  //     projectRoot,
  //     'assets/dating_screenshots/dating-profile-photos-only.PNG',
  //   ),
  //   userPrompt: '',
  //   previousSummary: '',
  //   matchId: 'test-match-3',
  //   name: 'Emma',
  //   platform: 'tinder',
  //   coachMode: false,
  //   usePrompt: false,
  //   variants: ['A', 'B'],
  //   temperatures: [0.7, 1.0],
  // },
  // {
  //   screenshotPath: path.join(
  //     projectRoot,
  //     'assets/dating_screenshots/dating-profile-almost-naked.PNG',
  //   ),
  //   userPrompt: '',
  //   previousSummary: '',
  //   matchId: 'test-match-4',
  //   name: 'Janice',
  //   platform: 'tinder',
  //   coachMode: false,
  //   usePrompt: false,
  //   variants: ['A', 'B'],
  //   temperatures: [0.7, 1.0],
  // },
];

const promptVariants = {
  A: {
    [MessageMode.GENERATE]: generateVariantA,
    [MessageMode.COACH]: coachVariantA,
    imageOnly: imageOnlyVariantA,
  },
  B: {
    [MessageMode.GENERATE]: generateVariantB,
    [MessageMode.COACH]: coachVariantB,
    imageOnly: imageOnlyVariantB,
  },
};

interface TestResponse {
  message: string;
  summary: string;
  requestPrompt: string;
  requestPayload: any;
}

interface TestResult {
  testCase: {
    matchId: string;
    name: string;
    platform: string;
    matchContext: string;
    previousSummary: string;
    screenshotPath: string;
  };
  variant: string;
  temperature: number;
  mode: MessageMode;
  success: boolean;
  response: TestResponse | null;
  error: any;
  messageCost: any;
  scores: {
    relevance: number | null;
    tone: number | null;
    originality: number | null;
    sendability: number | null;
    composite: number | null;
  };
}

interface JsonResult {
  variant: string;
  temperature: number;
  screenshot: string;
  message: string | null;
  summary: string | null;
  scores: {
    relevance: number | null;
    tone: number | null;
    originality: number | null;
    sendability: number | null;
    composite: number | null;
  };
}

const results: TestResult[] = [];

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
  await Promise.all(deletePromises);
  await userRef.delete();

  // Delete messageCosts for this user's messages only
  const messageCostsSnap = await firebaseAdmin
    .firestore()
    .collection('messageCosts')
    .where('userId', '==', userId)
    .get();
  const batch = firebaseAdmin.firestore().batch();
  messageCostsSnap.docs.forEach(
    (doc: FirebaseFirestore.QueryDocumentSnapshot) => batch.delete(doc.ref),
  );
  await batch.commit();
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

async function getAssistantMessageAndCost(userId: string, matchId: string) {
  // Use available index: role (asc), timestamp (asc), __name__ (asc)
  const messagesSnap = await firebaseAdmin
    .firestore()
    .collection('users')
    .doc(userId)
    .collection('matches')
    .doc(matchId)
    .collection('messages')
    .where('role', '==', 'assistant')
    .orderBy('timestamp', 'asc')
    .orderBy('__name__', 'asc')
    .get();
  if (messagesSnap.empty) return {assistantMessage: null, messageCost: null};
  // Pick the last document (latest message)
  const assistantMsg = messagesSnap.docs[messagesSnap.docs.length - 1];
  // Find the messageCost for this message
  const costSnap = await firebaseAdmin
    .firestore()
    .collection('messageCosts')
    .where('messageId', '==', assistantMsg.id)
    .limit(1)
    .get();
  return {
    assistantMessage: assistantMsg.data(),
    messageCost: costSnap.empty ? null : costSnap.docs[0].data(),
  };
}

async function generateResponse(
  promptConfig: typeof imageOnlyVariantA,
  temperature: number,
  testCase: any,
  userId: string,
  matchId: string,
  mode: MessageMode,
): Promise<TestResponse> {
  const base64Image = await getBase64Image(testCase.screenshotPath);
  const formattedPrompt = formatPrompt(
    promptConfig,
    mode,
    false,
    undefined,
    true,
  );
  const requestPayload = {
    userId,
    matchId,
    images: [base64Image],
    match: {
      name: testCase.name,
      context: testCase.userPrompt,
      previousSummary: testCase.previousSummary,
      platform: testCase.platform,
    },
    prompt: formattedPrompt,
    temperature,
    mode,
  };
  try {
    const response = await axios.post(
      'http://localhost:3001/api/generate-reply',
      requestPayload,
    );
    return {
      message: response.data.reply,
      summary: response.data.summary,
      requestPrompt: formattedPrompt,
      requestPayload,
    };
  } catch (error) {
    const err = error as any;
    if (err && err.response) {
      console.error(`Error generating ${mode} response:`, {
        status: err.response.status,
        data: err.response.data,
        headers: err.response.headers,
      });
    } else {
      console.error(`Error generating ${mode} response:`, err);
    }
    throw new Error(`Failed to generate ${mode} response`);
  }
}

describe('Prompt Variant Integration Tests', () => {
  beforeAll(async () => {
    await cleanupUserTestData(userId);
    await setupTestUserAndMatches();
  }, 30000);

  afterAll(async () => {
    await cleanupUserTestData(userId);

    // Create test-results directory if it doesn't exist
    const testResultsDir = path.resolve(__dirname, '../../test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, {recursive: true});
    }

    // Write results to prompt-test-results.md in test-results directory
    const outputPath = path.resolve(testResultsDir, 'prompt-test-results.md');
    let mdContent = '# Prompt Test Results\n\n';
    mdContent += '## Summary\n\n';
    mdContent +=
      '| # | Variant | Temperature | Mode | Screenshot | Prompt Used | Success | Tokens | Price (USD) |\n';
    mdContent +=
      '|---|---------|-------------|------|------------|-------------|---------|--------|-------------|\n';
    results.forEach((result, index) => {
      mdContent += `| ${index + 1} | ${result.variant} | ${
        result.temperature
      } | ${result.mode} | ${path.basename(result.testCase.screenshotPath)} | ${
        result.testCase.matchContext ? '✅' : '❌'
      } | ${result.success ? '✅' : '❌'} | ${
        result.messageCost ? result.messageCost.totalTokens : ''
      } | ${
        result.messageCost ? result.messageCost.totalCost.toFixed(6) : ''
      } |\n`;
    });
    mdContent += '\n## Detailed Results\n\n';
    results.forEach((result, index) => {
      mdContent += `### Test Case ${index + 1}\n\n`;
      mdContent += `- **Variant:** ${result.variant}\n`;
      mdContent += `- **Temperature:** ${result.temperature}\n`;
      mdContent += `- **Mode:** ${result.mode}\n`;
      mdContent += `- **Prompt Used:** ${
        result.testCase.matchContext ? 'Yes' : 'No'
      }\n`;
      mdContent += `- **Success:** ${result.success ? 'Yes' : 'No'}\n`;
      mdContent += `- **Screenshot:** ${path.basename(
        result.testCase.screenshotPath,
      )}\n`;
      if (result.testCase.matchContext) {
        mdContent += `- **User Prompt:** ${result.testCase.matchContext}\n`;
      }
      if (result.success && result.response !== null) {
        const response = result.response;
        mdContent += `- **Response:**\n  - Message: ${response.message}\n  - Summary: ${response.summary}\n`;
        mdContent += `- **Request Prompt:**\n\n\`\`\`\n${response.requestPrompt}\n\`\`\`\n`;
        // Truncate base64 image data in request payload
        const safePayload = JSON.parse(JSON.stringify(response.requestPayload));
        if (safePayload.images && Array.isArray(safePayload.images)) {
          safePayload.images = safePayload.images.map((img: string) =>
            typeof img === 'string' && img.length > 60
              ? img.slice(0, 20) + '...[truncated]...' + img.slice(-20)
              : '[truncated base64 image]',
          );
        }
        mdContent += `- **Request Payload:**\n\n\`\`\`json\n${JSON.stringify(
          safePayload,
          null,
          2,
        )}\n\`\`\`\n`;
        if (result.messageCost) {
          mdContent += `- **Message Cost:**\n  - Model: ${
            result.messageCost.model
          }\n  - Prompt Tokens: ${
            result.messageCost.promptTokens
          }\n  - Completion Tokens: ${
            result.messageCost.completionTokens
          }\n  - Total Tokens: ${
            result.messageCost.totalTokens
          }\n  - Input Cost: $${result.messageCost.inputCost.toFixed(
            6,
          )}\n  - Output Cost: $${result.messageCost.outputCost.toFixed(
            6,
          )}\n  - Total Cost: $${result.messageCost.totalCost.toFixed(6)}\n`;
        }
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

    // Write results to results.json in test-results directory
    const jsonOutputPath = path.resolve(testResultsDir, 'results.json');
    const jsonResults: JsonResult[] = results.map(result => {
      let message: string | null = null;
      let summary: string | null = null;

      if (result.success && result.response !== null) {
        const response = result.response as TestResponse;
        message = response.message;
        summary = response.summary;
      }

      return {
        variant: result.variant,
        temperature: result.temperature,
        screenshot: path.basename(result.testCase.screenshotPath),
        message,
        summary,
        scores: {
          relevance: null,
          tone: null,
          originality: null,
          sendability: null,
          composite: null,
        },
      };
    });

    // Calculate composite scores where available
    jsonResults.forEach(result => {
      const composite = calculateCompositeScore(result.scores);
      result.scores.composite = composite;
    });

    // Read existing results if appending
    let existingResults: JsonResult[] = [];
    if (!argv.overwrite && fs.existsSync(jsonOutputPath)) {
      try {
        const existingContent = fs.readFileSync(jsonOutputPath, 'utf-8');
        existingResults = JSON.parse(existingContent);
      } catch (error) {
        console.error('Error reading existing results.json:', error);
      }
    }

    // Combine or replace results based on overwrite flag
    const finalResults = argv.overwrite
      ? jsonResults
      : [...existingResults, ...jsonResults];

    // Write the final results
    fs.writeFileSync(
      jsonOutputPath,
      JSON.stringify(finalResults, null, 2),
      'utf-8',
    );
    console.log(`JSON results written to ${jsonOutputPath}`);
  });

  it(
    'should generate all responses in parallel and log costs',
    async () => {
      const allCases = testCases.flatMap(testCase =>
        testCase.variants.flatMap(variant =>
          testCase.temperatures.flatMap(temperature => {
            const cases = [];

            // Add generate mode test case (without prompt)
            cases.push({
              testCase: {
                ...testCase,
                userPrompt: '', // Ensure no prompt for base case
              },
              variant,
              promptConfig:
                promptVariants[variant as keyof typeof promptVariants][
                  MessageMode.GENERATE
                ],
              temperature,
              mode: MessageMode.GENERATE,
            });

            // Add coach mode test case if enabled (without prompt)
            if (testCase.coachMode) {
              cases.push({
                testCase: {
                  ...testCase,
                  userPrompt: '', // Ensure no prompt for base case
                },
                variant,
                promptConfig:
                  promptVariants[variant as keyof typeof promptVariants][
                    MessageMode.COACH
                  ],
                temperature,
                mode: MessageMode.COACH,
              });
            }

            // Add image + prompt test cases if enabled
            if (testCase.usePrompt) {
              // Add generate mode with prompt
              cases.push({
                testCase: {
                  ...testCase,
                  userPrompt: testCase.userPrompt, // Use the original prompt
                },
                variant,
                promptConfig:
                  promptVariants[variant as keyof typeof promptVariants][
                    MessageMode.GENERATE
                  ],
                temperature,
                mode: MessageMode.GENERATE,
              });

              // Add coach mode with prompt if coach mode is enabled
              if (testCase.coachMode) {
                cases.push({
                  testCase: {
                    ...testCase,
                    userPrompt: testCase.userPrompt, // Use the original prompt
                  },
                  variant,
                  promptConfig:
                    promptVariants[variant as keyof typeof promptVariants][
                      MessageMode.COACH
                    ],
                  temperature,
                  mode: MessageMode.COACH,
                });
              }
            }

            return cases;
          }),
        ),
      );

      const batchSize = 4;
      const delayMs = 3000;
      for (let i = 0; i < allCases.length; i += batchSize) {
        const batch = allCases.slice(i, i + batchSize);
        await Promise.all(
          batch.map(
            async ({testCase, variant, promptConfig, temperature, mode}) => {
              let result: TestResult = {
                testCase: {
                  matchId: testCase.matchId,
                  name: testCase.name,
                  platform: testCase.platform,
                  matchContext: testCase.userPrompt,
                  previousSummary: testCase.previousSummary,
                  screenshotPath: testCase.screenshotPath,
                },
                variant,
                temperature,
                mode,
                success: false,
                response: null,
                error: null,
                messageCost: null,
                scores: {
                  relevance: null,
                  tone: null,
                  originality: null,
                  sendability: null,
                  composite: null,
                },
              };
              try {
                const response = await generateResponse(
                  promptConfig,
                  temperature,
                  testCase,
                  userId,
                  testCase.matchId,
                  mode,
                );

                // Wait a moment for messageCost to be written
                await new Promise(res => setTimeout(res, 1000));
                const {assistantMessage, messageCost} =
                  await getAssistantMessageAndCost(userId, testCase.matchId);
                result.success = true;
                result.response = response;
                result.messageCost = messageCost;
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
          ),
        );
        if (i + batchSize < allCases.length) {
          await new Promise(res => setTimeout(res, delayMs));
        }
      }
    },
    60000 * 3,
  );
});
