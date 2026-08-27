---
name: MP2 audio strategy
description: Compatibility boundary for MP2 audio in live IPTV streams while preserving Expo Go.
---

Keep the default phone workflow on `expo-video`: prefer HLS, fall back through MPEG-TS/raw Xtream endpoints, and report native decoder failures explicitly. Do not claim universal MP2 support in Expo Go.

**Why:** MP2 decoding in `expo-video` depends on the Android/iOS decoder available to Expo Go and the device. JavaScript source routing can improve compatibility but cannot add a missing native codec. LibVLC can broaden codec support but requires a custom Development Build/APK.

**How to apply:** When MP2 channels fail, first verify HLS and TS fallbacks and inspect the native decoder error. Only introduce LibVLC or another native decoder as a separate build path that does not replace the Expo Go workflow.