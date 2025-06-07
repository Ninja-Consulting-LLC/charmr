# AI Dating Keyboard

A React Native keyboard extension that uses AI to help users craft better dating messages.

## Project Structure

- `src/` - React Native frontend code
- `backend/` - Backend server code
- `ios/` - iOS native code
- `android/` - Android native code

## Prerequisites

- Node.js (v14 or later)
- Ruby (for iOS development)
- Xcode (for iOS development)
- Android Studio (for Android development)
- CocoaPods (for iOS dependencies)

## Setup

1. Clone the repository
2. Install dependencies:

   ```sh
   # Install JavaScript dependencies
   npm install

   # Install iOS dependencies
   cd ios
   bundle install
   bundle exec pod install
   cd ..
   ```

3. Set up environment variables:
   ```sh
   cp .env.example .env
   # Edit .env with your configuration
   ```

## Development

### Start Metro Bundler

```sh
npm start
```

### Run on iOS

```sh
npm run ios
```

### Run on Android

```sh
npm run android
```

## Features

- AI-powered message suggestions
- Custom keyboard extension for iOS and Android
- Real-time message analysis
- Context-aware responses with conversation history
- Conversation summaries for better context
- Sandbox mode for development and testing

### Product Features

#### Message Generation

- **AI-Powered Responses**: Generate engaging, context-aware messages using GPT-4 Vision
- **Image Analysis**: Analyze profile photos to create personalized messages
- **Tone Customization**: Choose from different message styles (flirty, funny, smooth)
- **Context Awareness**: Maintain conversation history for more personalized responses

#### Conversation Management

- **Match Storage**: Save and organize conversations by match
- **Conversation History**: Track previous messages and responses
- **Context Summaries**: AI-generated summaries of conversation context
- **Platform Support**: Works with multiple dating apps (Tinder, Hinge, Bumble)

#### Development Tools

- **Sandbox Mode**: Test message generation without API calls
- **Dev Menu**: Access development tools and utilities
- **Storage Management**: Clear and inspect stored data
- **Rate Limiting**: Control API usage and prevent abuse

#### User Experience

- **Custom Keyboard**: Seamless integration with dating apps
- **Image Selection**: Easy photo picking from camera roll
- **Message Copying**: One-tap copy to clipboard
- **Match Organization**: Sort and manage multiple matches

## Business Logic

### User Management

#### Anonymous User Flow

1. On first app launch:

   - Generate a unique anonymous user ID (format: `user-{timestamp}-{randomString}`)
   - Store ID in AsyncStorage
   - Create user in backend with default FREE plan
   - Set daily message limits based on plan

2. User Authentication:
   - If user logs in with Google:
     - Check if email exists in backend
     - If exists: Use existing user
     - If not: Create new user with Firebase UID
   - If anonymous user exists: Link anonymous user to registered user
   - Preserve message history and limits

#### User State Management

- User data stored in React Context (StoreProvider)
- Key user properties:
  - `id`: Unique identifier
  - `plan`: Subscription tier (FREE/PREMIUM/PRO)
  - `dailyMessagesUsed`: Messages sent today
  - `extraMessages`: Additional messages available
  - `lastResetDate`: Date of last message count reset

#### Daily Message Limits

- FREE plan: 5 messages/day
- PREMIUM plan: 50 messages/day
- PRO plan: 200 messages/day
- Reset occurs at midnight UTC
- Extra messages can be purchased

### Message Generation

#### Context Management

- Store conversation history per match
- Maintain context window for AI
- Generate conversation summaries for better context
- Track message timestamps and roles (user/AI)

#### Rate Limiting

- Track daily message usage
- Enforce plan limits
- Support skipRateLimiting flag for development
- Handle rate limit errors gracefully

#### Error Handling

- 404 errors on user fetch trigger new user creation
- Network errors retry with exponential backoff
- API errors logged with appropriate severity
- Development mode bypasses authentication

### Data Persistence

#### Local Storage

- AsyncStorage for user ID and settings
- SQLite for message history and matches
- Cache conversation context
- Store user preferences

#### Backend Storage

- SQLite database for user data
- Message history per user
- Match information
- Plan and limit tracking

### Development Features

#### Sandbox Mode

- Mock API responses
- Simulated rate limits
- Development data generation
- Test user creation

#### Dev Menu

- Toggle development features
- Clear local storage
- Reset message counts
- View debug information

## Conversation Context

The app maintains conversation context by:

- Storing previous messages in a structured format
- Using summaries to maintain context between messages
- Providing context-aware responses based on conversation history

#### Response Format

The AI responses follow a structured format:

```xml
<summary>
[Brief summary of conversation context and match information]
</summary>
<message>
[The actual message to send to the match]
</message>
```

This format allows the app to:

- Maintain conversation context
- Provide more personalized responses
- Track conversation history
- Improve response quality over time

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.

## Admin API Endpoints

### Reset Database (Render Deployment)

To reset the database on the Render-hosted backend, use the following command:

```sh
curl -X POST https://ai-dating-keyboard.onrender.com/api/admin/reset-db \
  -H "Authorization: Bearer admin_secret"
```

- Replace `admin_secret` with your actual admin token if it's different.
- This will delete all messages and matches in the production database. **Use with caution!**
