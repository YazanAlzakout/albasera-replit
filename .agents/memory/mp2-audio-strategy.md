---
name: MP2 audio strategy
description: How MP2 audio in live IPTV streams is decoded on Android (superseded LibVLC plan).
---

MP2 (MPEG Layer I/II) audio is decoded via `modules/decoder-ffmpeg-mp2`, a from-scratch LGPL-safe FFmpeg build (`--enable-decoder=mp3`, which FFmpeg registers as its generic MPEG-audio decoder covering all three layers) wired into Media3 as an extension audio renderer (`app.config.js`'s `withDecoderFfmpegMp2` plugin + `patches/expo-video`'s `setExtensionRendererMode`). This requires a custom Development/Preview build (not Expo Go) since it's native code built by `.github/workflows/build-ffmpeg-mp2-decoder.yml`.

**LibVLC (react-native-vlc-media-player) was removed entirely** after this FFmpeg path proved sufficient — a category-diverse codec survey of the production IPTV provider found effectively zero channels needing anything beyond AAC (native to Media3) or MP1/MP2/MP3 (covered by this module). `app/player.tsx` no longer has a dual-engine fallback; Media3 is the only Android video engine.

**How to apply:** If a stream reports missing/unsupported audio, check the actual codec first (see the PMT-probing approach used for this investigation) before assuming it needs a new native decoder — most real-world gaps turn out to be MP1/2/3, already covered.