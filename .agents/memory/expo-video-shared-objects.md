---
name: Expo Video shared objects
description: Lifecycle rule for safely changing expo-video sources without released SharedObject crashes.
---

Treat a native `expo-video` player as invalid once a source-driven replacement can recreate or release its underlying SharedObject. Keep UI adapters tied to the current player, and ensure each source change has exactly one owner: either state-driven replacement or an imperative retry on the current object, never both.

**Why:** Rapid IPTV channel changes and duplicate state-plus-imperative reloads can leave callbacks pointing at a released native player, producing `Cannot use shared object that was already released`.

**How to apply:** For a genuinely new channel URL, update source state once and let `useVideoPlayer` handle it. For retrying the exact same URL, use `replaceAsync` on the current player. On web, prevent duplicate error notifications from advancing fallback more than once.