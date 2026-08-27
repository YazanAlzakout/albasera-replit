<h1 align="center">📺 AlBasera Player (IPTV TVOS)</h1>

<p align="center">
  <strong>A premium, multi-provider IPTV streaming application built with React Native TVOS and Expo.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-TVOS-61DAFB?style=for-the-badge&logo=react" alt="React Native TVOS" />
  <img src="https://img.shields.io/badge/Expo-54.0.33-000020?style=for-the-badge&logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/TypeScript-5.9.2-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Platform-iOS%20|%20Android%20|%20TVOS-green?style=for-the-badge" alt="Platforms" />
</p>

---

## 📖 Overview

**AlBasera Player** is a state-of-the-art IPTV streaming client designed specifically to deliver a seamless, native TV experience alongside robust mobile (iOS/Android) support. With a focus on performance, dynamic UI, and broad compatibility, this application allows users to manage multiple content providers, stream live TV, and interact with VODs (Video on Demand) using modern Web and Native streaming technologies.

By utilizing `react-native-tvos`, **AlBasera Player** implements a true native focus engine out of the box, ensuring that interactions via TV remotes (Apple TV Siri Remote, Android TV D-Pad) feel snappy, responsive, and intuitive.

## 🚀 Key Features

*   **📺 Native TV Focus Engine Support:** Fully optimized for smart TVs. TV navigation through elements, dynamic scaling (`TVFocus`), and active state management are all gracefully handled to prevent focus loop glitches.
*   **🔗 Multi-Provider Management:** Seamlessly add, edit, and switch between multiple IPTV providers (Xtream Codes API, M3U playlists, and Local Files) with secure credential storage via `expo-secure-store`.
*   **🎬 Comprehensive Content Hub:** Unified interface for Live TV, Movies (VOD), and TV Series. Enjoy continuous playback tracking and seamless episode transitions.
*   **🎥 Advanced Video Player:** Built using `expo-video` and `hls.js` for blazing-fast streaming, adaptive bitrates, and broad format support, including live streams and heavy VODs.
*   **🎨 Dynamic & Premium UI:** Designed with an immersive, animated interface using `react-native-reanimated`. Features dynamic dark/light modes, particle effects, glow shadows, and a curated color palette that fits premium TV experiences.
*   **⭐ Favorites & Categorization:** Easily bookmark your favorite channels, movies, and series. Content is intelligently categorized with advanced sorting and search capabilities.
*   **🌍 Multi-Language & RTL Ready:** Supports localization and native Right-to-Left (RTL) layouts seamlessly. Complete support for Arabic and other RTL languages!
*   **📱 Universal Compatibility:** Runs smoothly on iOS, Android, tvOS, and Android TV—maintaining performance and aesthetic consistency across all form factors.

## 📸 Screenshots

<p align="center">
  <img src="./assets/screens/WhatsApp Image 2026-03-28 at 11.40.28 AM.jpeg" width="32%" />
  <img src="./assets/screens/WhatsApp Image 2026-03-28 at 11.40.30 AM.jpeg" width="32%" />
  <img src="./assets/screens/WhatsApp Image 2026-03-28 at 11.40.31 AM (1).jpeg" width="32%" />
</p>
<p align="center">
  <img src="./assets/screens/WhatsApp Image 2026-03-28 at 11.40.31 AM (2).jpeg" width="32%" />
  <img src="./assets/screens/WhatsApp Image 2026-03-28 at 11.40.31 AM.jpeg" width="32%" />
  <img src="./assets/screens/WhatsApp Image 2026-03-28 at 11.40.32 AM (1).jpeg" width="32%" />
</p>
<p align="center">
  <img src="./assets/screens/WhatsApp Image 2026-03-28 at 11.40.32 AM.jpeg" width="32%" />
  <img src="./assets/screens/WhatsApp Image 2026-03-28 at 11.40.33 AM (1).jpeg" width="32%" />
  <img src="./assets/screens/WhatsApp Image 2026-03-28 at 11.40.33 AM (2).jpeg" width="32%" />
</p>
<p align="center">
  <img src="./assets/screens/WhatsApp Image 2026-03-28 at 11.40.33 AM.jpeg" width="32%" />
  <img src="./assets/screens/WhatsApp Image 2026-03-28 at 11.40.34 AM (1).jpeg" width="32%" />
  <img src="./assets/screens/WhatsApp Image 2026-03-28 at 11.40.34 AM.jpeg" width="32%" />
</p>
<p align="center">
  <img src="./assets/screens/WhatsApp Image 2026-03-28 at 11.40.35 AM.jpeg" width="32%" />
</p>

## 🛠️ Tech Stack & Architecture

This project is built on top of the modern Expo ecosystem, utilizing custom native configurations for TV capabilities:

*   **Framework:** [Expo](https://expo.dev/) (SDK 54) & [React Native TVOS](https://github.com/react-native-tvos/react-native-tvos) (v0.81-stable)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Routing:** [Expo Router](https://docs.expo.dev/router/introduction/) (File-based navigation)
*   **Styling & Animations:** Vanilla React Native StyleSheets mapped to a design system + `react-native-reanimated`
*   **Video Playback:** `expo-video` on native and `hls.js`/`mpegts.js` on web
*   **State & Storage:** Context API & `expo-secure-store`

## 🚦 Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm or yarn
*   For iOS/tvOS builds: macOS with Xcode installed
*   For Android/Android TV builds: Android Studio installed

### 1. Installation

Clone the repository and install the required dependencies:

```bash
git clone <repository-url>
cd IPTV-Player
npm install
```

> **Note:** This project specifically uses `react-native-tvos`. If you encounter dependency conflicts, refer to the overrides in `package.json`.


### 2. Running Locally

You can launch the Metro bundler to run the application on your desired platform:

```bash
# Start the Expo development server
npx expo start

# Run directly on an Android device or emulator (including Android TV)
npm run android

# Run directly on an iOS simulator or Apple TV simulator
npm run ios

# Run the web version (for debugging/development)
npm run web
```

## 📂 Project Structure (Overview)

```text
IPTV-Player/
├── app/                  # Expo Router file-based pages (screens)
│   ├── _layout.tsx       # Root layout
│   ├── index.tsx         # Splash / Initial route
│   └── login.tsx         # Multi-provider login screen
├── assets/               # Static assets (images, fonts, etc.)
├── components/           # Reusable UI components (Shared, Player, etc.)
├── constants/            # Theme, Colors, Fonts, and TVFocus constants
├── contexts/             # React Contexts (Language, Theme, etc.)
├── hooks/                # Custom React Hooks (useAuth, useProviders, etc.)
└── package.json          # Project configuration and dependencies
```

## 🤝 Contact & Inquiries

For inquiries, feature requests, or collaboration opportunities, please reach out directly or check the repository links.

## 📜 License

This project is Proprietary and Closed Source. All rights reserved.
