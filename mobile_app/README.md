# NyayaSahay Mobile App

Pixel-perfect React Native replica of the NyayaSahay web application.

## 📱 Features

- **Landing Screen**: Hero section, features, how it works, rights
- **Chat Screen**: Full-screen chat with drawer sidebar
- **Auth Screen**: Login/Register with form validation
- **About Screen**: Tech stack, team, disclaimer

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo Go app on your phone (for testing)

### Installation

```bash
# Navigate to mobile app directory
cd mobile_app

# Install dependencies
npm install

# Start Expo development server
npx expo start
```

### Running on Device

1. Install **Expo Go** from Play Store (Android) or App Store (iOS)
2. Scan the QR code shown in the terminal
3. The app will load on your device

### Running on Emulator

```bash
# Android Emulator
npx expo start --android

# iOS Simulator (Mac only)
npx expo start --ios
```

## 📦 Building APK

### Option 1: EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure build
eas build:configure

# Build Android APK
eas build -p android --profile preview
```

### Option 2: Local Build

```bash
# Install Android build tools
npx expo prebuild --platform android

# Navigate to android folder
cd android

# Build debug APK
./gradlew assembleDebug

# APK will be at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

## 🎨 Design System

### Colors (from web CSS)
```javascript
primary: '#26B8B8'      // Teal
darkSurface: '#1a1f2e'  // Dark navy (sidebar)
lightBg: '#f8f9fa'      // Light gray (content)
accentGreen: '#10b981'  // Success/Online
accentOrange: '#f59e0b' // Warning/Badges
```

### Typography
- Font: Inter (400, 500, 600, 700)
- Loaded via @expo-google-fonts/inter

## 📁 Project Structure

```
mobile_app/
├── app/                    # Expo Router screens
│   ├── _layout.js         # Drawer navigation
│   ├── index.js           # Landing screen
│   ├── chat.js            # Chat screen
│   ├── auth.js            # Auth screen
│   └── about.js           # About screen
├── components/
│   └── ChatBubble.js      # Chat message component
├── constants/
│   └── theme.js           # Colors, spacing, shadows
├── services/
│   └── api.js             # Backend API calls
├── assets/                # App icons and splash
├── app.json              # Expo config
├── package.json          # Dependencies
└── babel.config.js       # Babel + Reanimated
```

## 🔗 API Configuration

The app connects to `https://law-gpt.app` by default.

To use a local backend, update `services/api.js`:
```javascript
const API_BASE_URL = 'http://YOUR_LOCAL_IP:8000';
```

## 🧪 Testing Checklist

- [ ] Landing page loads with animations
- [ ] Chat screen connects to backend
- [ ] Messages send and receive correctly
- [ ] Auth flow works (login/register)
- [ ] Drawer navigation opens/closes
- [ ] Chat history loads for logged-in users
- [ ] About page displays correctly

## 📋 Version Info

- Expo SDK: 52
- React Native: 0.76.5
- Expo Router: 4.0
