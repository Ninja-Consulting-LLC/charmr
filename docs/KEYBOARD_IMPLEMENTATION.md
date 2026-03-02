# Keyboard Implementation

This document details the implementation of the Charmr keyboard extension for iOS and Android.

## iOS Keyboard Extension

### Architecture

The iOS keyboard extension is built using:

- SwiftUI for the UI
- KeyboardKit framework for keyboard functionality
- App Groups for data sharing between main app and keyboard

### Features

1. **Custom Keyboard UI**

   - Gradient background with primary colors
   - Custom toolbar with action buttons
   - Style picker for message tone selection

2. **Message Styles**

   - Spicy: Frisky texts to turn up the heat
   - Flirty: Rizz lines to spark interest
   - Casual: Relaxed, simple conversation starters
   - Sincere: Heartfelt messages from the soul

3. **Keyboard Actions**
   - Create/Regenerate opener messages
   - Switch between custom and system keyboard
   - Open main app for dating coach features

### Implementation Details

#### KeyboardViewController

- Handles keyboard lifecycle and setup
- Manages keyboard state and services
- Implements custom keyboard view

#### CustomKeyboardView

- Implements the main keyboard UI
- Handles style selection and message generation
- Manages keyboard state transitions

#### Message Generation

- Uses pre-defined openers for each style
- Supports regeneration of messages
- Maintains conversation context

### Setup Requirements

1. **App Groups**

   - Required for data sharing between app and keyboard
   - Configure in Xcode capabilities
   - Group identifier: `group.com.ninjadating.charmr`

2. **Keyboard Extension**

   - Bundle ID: `com.ninjadating.charmr.charmrkeyboard`
   - Display Name: "Magic AI Keyboard"
   - Requires full access for advanced features

3. **Dependencies**
   - KeyboardKit (v9.4.0 or later)
   - SwiftUI
   - UIKit

## Android Keyboard Implementation

### Architecture

The Android keyboard is built using:

- Kotlin for native implementation
- React Native for UI components
- Firebase for backend integration

### Features

1. **Custom Keyboard UI**

   - Material Design components
   - Custom toolbar with action buttons
   - Style picker for message tone selection

2. **Message Styles**

   - Same style options as iOS
   - Consistent user experience across platforms

3. **Keyboard Actions**
   - Create/Regenerate opener messages
   - Switch between custom and system keyboard
   - Open main app for dating coach features

### Implementation Details

#### MainApplication

- Initializes React Native host
- Sets up Firebase integration
- Manages keyboard lifecycle

#### Keyboard Service

- Handles keyboard input
- Manages keyboard state
- Implements custom actions

### Setup Requirements

1. **Firebase Integration**

   - Required for backend communication
   - Configure in `google-services.json`
   - Initialize in MainApplication

2. **Keyboard Extension**

   - Configure in AndroidManifest.xml
   - Set up input method service
   - Handle keyboard permissions

3. **Dependencies**
   - React Native
   - Firebase
   - Material Design components

## Common Features

### Message Generation

1. **Style Selection**

   - Pre-defined styles with unique characteristics
   - Consistent across platforms
   - Easy to extend with new styles

2. **Context Management**

   - Maintains conversation history
   - Supports image analysis
   - Enables personalized responses

3. **User Experience**
   - Smooth transitions between keyboards
   - Intuitive style selection
   - Quick message generation

### Security

1. **Data Protection**

   - Secure storage of user data
   - Encrypted communication
   - Privacy-focused design

2. **Permissions**
   - Minimal required permissions
   - Clear permission requests
   - Transparent data usage

### Performance

1. **Optimization**

   - Efficient message generation
   - Quick keyboard switching
   - Smooth animations

2. **Resource Management**
   - Minimal memory usage
   - Efficient battery consumption
   - Optimized network calls

## Development Guidelines

### Adding New Features

1. **Style Updates**

   - Add new style to MessageStyle enum
   - Update openers.json with new messages
   - Implement UI changes in both platforms

2. **UI Modifications**

   - Maintain consistent design across platforms
   - Follow platform-specific guidelines
   - Test on multiple device sizes

3. **Backend Integration**
   - Update API endpoints as needed
   - Maintain backward compatibility
   - Document new features

### Testing

1. **Unit Tests**

   - Test message generation
   - Verify style selection
   - Check keyboard actions

2. **Integration Tests**

   - Test app-keyboard communication
   - Verify data persistence
   - Check platform-specific features

3. **User Testing**
   - Test on multiple devices
   - Verify different screen sizes
   - Check accessibility features

## Screenshot Selection & Permissions

### iOS

- Users can select screenshots from their photo library to provide context for AI message generation.
- The app requests photo library permissions. If denied, a visual guide is shown to help users grant access.
- Selected images are previewed in the UI before upload. Users can remove images before sending.
- Images are converted to base64 and sent to the backend for analysis.

### Android

- Users can pick screenshots from device storage or gallery.
- The app requests storage/photo permissions as needed. If denied, users are prompted to grant access.
- Selected images are previewed and can be removed before sending.
- Images are converted to base64 and sent to the backend for analysis.

### Privacy & Security

- All images are sanitized (metadata stripped, compressed) before upload.
- Images are not stored long-term and are only used for generating the current response.
- Users are informed about privacy and permissions when selecting images.

### Error Handling

- If image permissions are denied, the app displays a modal with instructions to grant access.
- If image upload or processing fails, users receive a clear error message and can retry with a different image.
