# Charmr Backend

## Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure your environment variables:

   ```bash
   cp .env.example .env
   ```

### Email Configuration

The backend uses SMTP for sending emails. Production is expected to use Amazon
SES SMTP credentials.

1. **Amazon SES Setup**

   - Verify a sender identity in Amazon SES.
   - Create SES SMTP credentials for the verified identity.
   - Keep the SMTP username/password in private deployment secrets.

2. **Required Environment Variables**

   ```
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_ses_smtp_username
   SMTP_PASS=your_ses_smtp_password
   SMTP_FROM=verified-sender@example.com
   SMTP_REPLY_TO=support@example.com
   SUPPORT_EMAIL=support@example.com
   ```

3. **Troubleshooting**

   - If SES rejects the message:
     - Make sure `SMTP_FROM` is a verified SES sender identity.
     - Confirm the SES account is out of sandbox or the recipient is verified.
     - Confirm `SMTP_USER` and `SMTP_PASS` are SES SMTP credentials, not raw AWS access keys.

4. **Development Mode**

   - In development, you can use MailHog (included in docker-compose.yml)
   - Set these environment variables for local testing:
     ```
     SMTP_HOST=mailhog
     SMTP_PORT=1025
     SMTP_SECURE=false
     ```
   - Access MailHog web interface at http://localhost:8025

5. Start the development server:
   ```bash
   npm run dev
   ```

## Admin Endpoints

### Database Reset

To reset the database (delete all messages and matches), use the following endpoint:

```bash
curl -X POST http://localhost:3000/api/admin/reset-db \
  -H "Authorization: Bearer your_admin_secret"
```

⚠️ **Warning**: This endpoint will delete all messages and matches. Use with caution.

## Deployment on Render

### Prerequisites

1. A Render account
2. A GitHub repository with your code
3. The following secrets in your GitHub repository:
   - `RENDER_SERVICE_ID`: Your Render service ID
   - `RENDER_API_KEY`: Your Render API key

### Setup Steps

1. **Link your GitHub repository to Render**

   - Go to your Render dashboard
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository
   - Select the repository and branch to deploy

2. **Configure Environment Variables**

   - In your Render dashboard, go to your service's "Environment" tab
   - Add all required environment variables from `.env.example`
   - Make sure to set `NODE_ENV=production`

3. **Configure Persistent Disk**

   - The SQLite database will be stored in a persistent disk
   - The disk is automatically mounted at `/data`
   - The database file will be stored at `/data/charmr.db`

4. **Deploy**
   - The service will automatically deploy when you push to the `main` branch
   - You can also manually deploy from the Render dashboard

### Health Check

- The service includes a health check endpoint at `/health`
- Render uses this endpoint to monitor the service's health
- The endpoint returns a 200 status code when the service is running properly

### Monitoring

- View logs in the Render dashboard
- Set up alerts for service health
- Monitor resource usage and performance

## Prompt Variants Testing

The `testPromptVariants` functionality allows you to test and compare different prompt variants (A and B) for the Charmr response generation system. This tool helps evaluate the quality and effectiveness of different prompt configurations.

### Overview

The test system:

- Tests different prompt variants (A and B) against various dating app screenshots
- Compares responses across different temperature settings
- Evaluates both generate and coach modes
- Measures message costs and performance
- Generates detailed reports in both JSON and Markdown formats

### Prerequisites

1. **Service Account**: Ensure you have a valid `service-account.json` file in the backend root directory
2. **Test Images**: Place dating app screenshots in the `assets/dating_screenshots/` directory
3. **Environment**: Make sure your backend server is running and accessible

### Running the Tests

#### Basic Usage

```bash
# Run the test with default settings
npm test -- testPromptVariants.test.ts

# Run with specific Jest options
npm test -- testPromptVariants.test.ts --testTimeout=180000
```

#### Command Line Options

The test supports the following command line arguments:

```bash
# Overwrite existing results instead of appending
npm test -- testPromptVariants.test.ts -- --overwrite
```

### Configuration

#### Test Cases

Edit the `testCases` array in `src/test/testPromptVariants.test.ts` to configure your test scenarios:

```typescript
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
    coachMode: true, // Enable coach mode testing
    usePrompt: false, // Enable user prompt testing
    variants: ['B'], // Test variants: 'A', 'B', or both
    temperatures: [1.0], // Temperature settings to test
  },
  // Add more test cases...
];
```

#### Test Case Properties

- **screenshotPath**: Path to the dating app screenshot to analyze
- **userPrompt**: Optional user prompt to include in the test
- **previousSummary**: Previous conversation summary for context
- **matchId**: Unique identifier for the test match
- **name**: Name of the match for reference
- **platform**: Dating platform (e.g., 'tinder', 'bumble')
- **coachMode**: Whether to test coach mode responses
- **usePrompt**: Whether to test with user prompts
- **variants**: Array of prompt variants to test ('A', 'B', or both)
- **temperatures**: Array of temperature values to test (0.0-2.0)

### Output Files

The test generates two output files in the `test-results/` directory:

#### 1. `results.json`

Contains structured test results in JSON format:

```json
[
  {
    "variant": "B",
    "temperature": 1.0,
    "screenshot": "dating-conversation.PNG",
    "message": "Generated response text...",
    "summary": "Conversation summary...",
    "scores": {
      "relevance": null,
      "tone": null,
      "originality": null,
      "sendability": null,
      "composite": null
    }
  }
]
```

#### 2. `prompt-test-results.md`

Contains detailed human-readable test results including:

- Test case information
- Generated responses
- Message costs and token usage
- Error information (if any)
- Performance metrics

### Understanding the Results

#### Response Quality Metrics

The test tracks several quality metrics (currently placeholder values):

- **Relevance**: How relevant the response is to the context
- **Tone**: Appropriateness of the response tone
- **Originality**: Uniqueness and creativity of the response
- **Sendability**: Whether the response is ready to send
- **Composite**: Overall quality score

#### Cost Analysis

Each test result includes detailed cost information:

- **Model**: AI model used (e.g., gpt-4-vision-preview)
- **Prompt Tokens**: Number of tokens in the input
- **Completion Tokens**: Number of tokens in the response
- **Total Tokens**: Combined token count
- **Input Cost**: Cost for input tokens
- **Output Cost**: Cost for output tokens
- **Total Cost**: Total cost for the request

### Best Practices

1. **Test Multiple Scenarios**: Include various types of dating app screenshots
2. **Compare Variants**: Always test both A and B variants for comparison
3. **Temperature Testing**: Test multiple temperature values to find optimal settings
4. **Cost Monitoring**: Keep track of costs, especially when testing many scenarios
5. **Error Handling**: Review error logs to identify and fix issues

### Troubleshooting

#### Common Issues

1. **Service Account Error**: Ensure `service-account.json` exists and is valid
2. **Image Path Error**: Verify screenshot paths are correct and files exist
3. **API Rate Limits**: The test includes delays between batches to avoid rate limits
4. **Timeout Issues**: Increase Jest timeout for large test suites

#### Performance Optimization

- Use batch processing (default: 4 concurrent requests)
- Implement delays between batches (default: 3 seconds)
- Monitor API usage and costs
- Consider running tests during off-peak hours

### Integration with Development Workflow

1. **Before Deploying**: Run tests to ensure prompt changes work correctly
2. **A/B Testing**: Use results to compare prompt variant effectiveness
3. **Cost Optimization**: Monitor and optimize for cost efficiency
4. **Quality Assurance**: Ensure response quality meets standards

## Available Scripts

- `npm start`: Start the production server
- `npm run dev`: Start the development server with hot reload
- `npm run build`: Build the TypeScript code
- `npm test`: Run tests
- `npm run lint`: Run linting
