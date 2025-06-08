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

The backend uses SendGrid for sending emails. To configure email functionality:

1. **SendGrid Setup**
   - Create a SendGrid account if you don't have one
   - Go to SendGrid's "Sender Authentication" section
   - Either:
     a. Verify your domain (recommended)
     b. Or verify a single sender email address

2. **Required Environment Variables**
   ```
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=apikey
   EMAIL_PASS=your_sendgrid_api_key
   EMAIL_DEFAULT_FROM=your_verified_email@domain.com
   EMAIL_DEFAULT_REPLY_TO=support@charmrapp.com
   ```

3. **Troubleshooting**
   - If you get a "550 The from address does not match a verified Sender Identity" error:
     - Make sure your sender email/domain is verified in SendGrid
     - Check that EMAIL_DEFAULT_FROM matches your verified sender
     - Verify your SendGrid API key has the correct permissions

4. **Development Mode**
   - In development, you can use MailHog (included in docker-compose.yml)
   - Set these environment variables for local testing:
     ```
     EMAIL_HOST=mailhog
     EMAIL_PORT=1025
     EMAIL_SECURE=false
     ```
   - Access MailHog web interface at http://localhost:8025

3. Start the development server:
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

## Available Scripts

- `npm start`: Start the production server
- `npm run dev`: Start the development server with hot reload
- `npm run build`: Build the TypeScript code
- `npm test`: Run tests
- `npm run lint`: Run linting
