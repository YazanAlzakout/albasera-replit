---
name: Expo Go compatibility
description: Records the required compatibility boundary for the project's default mobile workflow.
---

Keep the default phone project on an Expo SDK supported by Expo Go and use Expo-provided native modules in that path. Do not make a custom native player mandatory.

**Why:** Moving the whole project to a newer SDK for LibVLC caused Expo Go to stop at its generic blue “Something went wrong” screen before requesting the Metro bundle.

**How to apply:** Treat custom native playback as a separate optional build only. Before any SDK or native-player upgrade, preserve and verify an Expo Go path with a fresh QR and clean Metro cache.