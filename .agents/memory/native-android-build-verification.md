---
name: Native Android build verification
description: Explains the reliable verification boundary for native Android modules in this Replit environment.
---

Run Expo prebuild locally to verify config plugins and native project generation, but use EAS Build for the final APK/AAB compilation.

**Why:** The workspace can provide Java and Gradle, but no Android SDK module or `ANDROID_HOME`; local Gradle therefore stops at SDK discovery even when Expo and native module configuration are valid.

**How to apply:** For custom native modules such as LibVLC, require successful TypeScript, Expo Doctor, platform exports, and TV prebuild locally, then validate the generated Android binary through an EAS development or preview profile.