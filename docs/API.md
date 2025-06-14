# Backend API Documentation

This document details the backend API endpoints and their functionality.

## Authentication

### User Management

#### Anonymous User Creation

```http
POST /api/users/anonymous
```

Creates a new anonymous user with a FREE plan.

**Response**

```json
{
  "id": "user-{timestamp}-{randomString}",
  "plan": "FREE",
  "dailyMessagesUsed": 0,
  "extraMessages": 0,
  "lastResetDate": "2024-03-21T00:00:00Z"
}
```

#### User Authentication

```http
POST /api/users/auth
```

Authenticates a user with Google or links an anonymous user to a registered account.

**Request Body**

```json
{
  "firebaseUid": "string",
  "email": "string",
  "anonymousId": "string" // Optional
}
```

**Response**

```json
{
  "id": "string",
  "plan": "FREE|PREMIUM|PRO",
  "dailyMessagesUsed": 0,
  "extraMessages": 0,
  "lastResetDate": "string"
}
```

## Message Generation

### Generate Message

```http
POST /api/messages/generate
```

Generates an AI-powered message based on context and style.

**Request Body**

```json
{
  "matchId": "string",
  "style": "spicy|flirty|casual|sincere",
  "context": {
    "images": ["base64string"],
    "conversationHistory": [
      {
        "role": "user|assistant",
        "content": "string",
        "timestamp": "string"
      }
    ]
  }
}
```

**Response**

```json
{
  "summary": "string",
  "message": "string"
}
```

### Regenerate Message

```http
POST /api/messages/regenerate
```

Regenerates a message with a different style or approach.

**Request Body**

```json
{
  "matchId": "string",
  "style": "spicy|flirty|casual|sincere",
  "previousMessage": "string",
  "context": {
    "images": ["base64string"],
    "conversationHistory": [
      {
        "role": "user|assistant",
        "content": "string",
        "timestamp": "string"
      }
    ]
  }
}
```

**Response**

```json
{
  "summary": "string",
  "message": "string"
}
```

## Match Management

### Create Match

```http
POST /api/matches
```

Creates a new match with initial context.

**Request Body**

```json
{
  "userId": "string",
  "platform": "tinder|hinge|bumble",
  "matchId": "string",
  "initialContext": {
    "images": ["base64string"],
    "bio": "string"
  }
}
```

**Response**

```json
{
  "id": "string",
  "userId": "string",
  "platform": "string",
  "matchId": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Get Match

```http
GET /api/matches/:id
```

Retrieves match details and conversation history.

**Response**

```json
{
  "id": "string",
  "userId": "string",
  "platform": "string",
  "matchId": "string",
  "summary": "string",
  "conversationHistory": [
    {
      "role": "user|assistant",
      "content": "string",
      "timestamp": "string"
    }
  ],
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Update Match

```http
PUT /api/matches/:id
```

Updates match information and context.

**Request Body**

```json
{
  "summary": "string",
  "context": {
    "images": ["base64string"],
    "bio": "string"
  }
}
```

**Response**

```json
{
  "id": "string",
  "userId": "string",
  "platform": "string",
  "matchId": "string",
  "summary": "string",
  "updatedAt": "string"
}
```

## User Management

### Get User

```http
GET /api/users/:id
```

Retrieves user information and usage statistics.

**Response**

```json
{
  "id": "string",
  "plan": "FREE|PREMIUM|PRO",
  "dailyMessagesUsed": 0,
  "extraMessages": 0,
  "lastResetDate": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Update User Plan

```http
PUT /api/users/:id/plan
```

Updates user's subscription plan.

**Request Body**

```json
{
  "plan": "FREE|PREMIUM|PRO"
}
```

**Response**

```json
{
  "id": "string",
  "plan": "FREE|PREMIUM|PRO",
  "dailyMessagesUsed": 0,
  "extraMessages": 0,
  "lastResetDate": "string",
  "updatedAt": "string"
}
```

### Add Extra Messages

```http
POST /api/users/:id/extra-messages
```

Adds extra messages to user's quota.

**Request Body**

```json
{
  "amount": 10
}
```

**Response**

```json
{
  "id": "string",
  "plan": "FREE|PREMIUM|PRO",
  "dailyMessagesUsed": 0,
  "extraMessages": 10,
  "lastResetDate": "string",
  "updatedAt": "string"
}
```

## Admin Endpoints

### Reset Database

```http
POST /api/admin/reset-db
```

Resets the database (requires admin authentication).

**Headers**

```
Authorization: Bearer {admin_secret}
```

**Response**

```json
{
  "success": true,
  "message": "Database reset successfully"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Invalid request parameters"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 429 Too Many Requests

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

- FREE plan: 5 messages/day
- PREMIUM plan: 50 messages/day
- PRO plan: 200 messages/day
- Extra messages can be purchased
- Rate limits reset at midnight UTC

## Webhooks

### Message Sent

```http
POST /api/webhooks/message-sent
```

Triggered when a message is sent through the keyboard.

**Request Body**

```json
{
  "userId": "string",
  "matchId": "string",
  "message": "string",
  "style": "spicy|flirty|casual|sincere",
  "timestamp": "string"
}
```

### Plan Updated

```http
POST /api/webhooks/plan-updated
```

Triggered when a user's plan is updated.

**Request Body**

```json
{
  "userId": "string",
  "oldPlan": "FREE|PREMIUM|PRO",
  "newPlan": "FREE|PREMIUM|PRO",
  "timestamp": "string"
}
```

## Image Upload & Analysis

The API supports uploading screenshots (as base64-encoded images) for AI-powered message generation. Images are sanitized (metadata stripped, compressed) before being sent to the AI model (GPT-4 Vision or Gemini).

- **Image Field**: `images: ["base64string"]` in the request body.
- **Sanitization**: Images are processed to remove metadata and reduce size for privacy and efficiency.
- **Privacy**: Uploaded images are not stored long-term and are only used for generating the current response.
- **Size Limit**: Images must be under 1MB after compression. Oversized or corrupt images will return an `IMAGE_PROCESSING_ERROR`.

### Vision Model Usage

- If images are provided, the backend uses GPT-4 Vision to analyze screenshots and extract context (e.g., match status, conversation history, profile details).
- If no text prompt is provided, a fallback prompt is used to instruct the AI to analyze the screenshot and generate an appropriate message.
- The AI can distinguish between new matches and ongoing conversations by analyzing screenshot content (e.g., "You matched", "Liked your photo").

### Cost & Rate Limiting

- Each image incurs additional token cost (see `costUtils.ts` for details: 85 tokens per image at low detail).
- Rate limits apply to all requests, including those with images. Vision-based requests may consume more quota due to higher token usage.

### Error Handling

- If image processing fails, the API returns:

```json
{
  "error": "Failed to process images",
  "type": "IMAGE_PROCESSING_ERROR"
}
```

- If the AI fails to generate a response, the API returns:

```json
{
  "error": "GENERATION_ERROR",
  "type": "GENERATION_ERROR"
}
```

- If the message limit is reached:

```json
{
  "error": "Message limit reached",
  "type": "MESSAGE_LIMIT"
}
```
