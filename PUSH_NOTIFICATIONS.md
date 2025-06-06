# Push Notifications Setup Guide

This guide explains how to set up and use push notifications in the Charmr app.

## iOS Setup

1. Enable Push Notifications capability in Xcode:

   - Open your project in Xcode
   - Select your target
   - Go to "Signing & Capabilities"
   - Click "+" and add "Push Notifications"
   - Also add "Background Modes" and check "Remote notifications"

2. Configure Firebase:

   - Make sure you have uploaded your APNs key to Firebase Console
   - The key should be in the Firebase Console under Project Settings > Cloud Messaging > iOS app configuration

3. Install required dependencies:

   ```bash
   npm install @react-native-firebase/messaging@21.14.0
   ```

4. Backend Setup:
   - Make sure `service-account.json` is present in the backend directory
   - Install Firebase Admin SDK:
     ```bash
     cd backend
     npm install firebase-admin@12.0.0
     ```

## Testing Push Notifications

1. Get your device token:

   - Run the app on your iOS device
   - The FCM token will be logged in the console
   - You can also get it using `pushNotificationService.getDeviceToken()`

2. Test sending a notification:

   ```bash
   curl -X POST http://localhost:3000/api/push-notifications/test \
     -H "Content-Type: application/json" \
     -d '{"deviceToken": "YOUR_DEVICE_TOKEN"}'
   ```

3. Periodic Test Notifications:
   - The backend automatically sends test notifications every 5 minutes
   - To add your device to the test list, use the `/api/push-notifications/test` endpoint
   - Your device will receive notifications until you remove it from the test list

## Troubleshooting

1. If notifications aren't working:

   - Check that Push Notifications capability is enabled in Xcode
   - Verify your APNs key is uploaded to Firebase Console
   - Ensure your device token is valid
   - Check the backend logs for any errors

2. Common Issues:
   - "Invalid APNs credentials": Make sure your APNs key is properly uploaded to Firebase
   - "Invalid registration token": Your device token might have expired, get a new one
   - "Permission denied": Make sure you've granted notification permissions in the app

## Security Notes

- Never commit `service-account.json` to version control
- Store device tokens securely in production
- Use environment variables for sensitive configuration
- Implement proper authentication for push notification endpoints in production
