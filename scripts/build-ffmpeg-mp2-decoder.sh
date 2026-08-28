#!/bin/bash
#
# Builds a minimal, LGPL-safe FFmpeg (decoder-only, no libavformat/avfilter,
# no --enable-gpl) for the modules/decoder-ffmpeg-mp2 module, so Media3 can
# decode MP2 (MPEG Layer II) audio via FfmpegAudioRenderer instead of falling
# back to VLC for those streams.
#
# WHY THIS EXISTS: androidx/media's decoder_ffmpeg module (which this repo
# vendors into modules/decoder-ffmpeg-mp2/android, Apache-2.0) requires
# FFmpeg's native source to be built locally — it is not published as a
# prebuilt Maven artifact by Google (see modules/decoder-ffmpeg-mp2/android/
# UPSTREAM_README.md). This script automates exactly the steps that README
# describes, scoped to only the "mp2" decoder so the resulting .so has no
# GPL-triggering components — LGPL 2.1+, safe to bundle in a closed-source app.
#
# REQUIRES: Linux or macOS, Android NDK r26b, ~15-30 min build time.
# Does NOT run on Windows and does NOT run in this repo's normal `expo
# prebuild`/EAS build — it must be run once (e.g. in CI) to produce the .so
# files, which then get committed into modules/decoder-ffmpeg-mp2/android/
# src/main/jni/ffmpeg/android-libs/. Until that's done, this module has no
# native code and is a silent no-op (see its build.gradle).
#
# Usage:
#   NDK_PATH=/path/to/android-ndk-r26b ./scripts/build-ffmpeg-mp2-decoder.sh
#
set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MODULE_ANDROID_DIR="${REPO_ROOT}/modules/decoder-ffmpeg-mp2/android"
FFMPEG_MODULE_PATH="${MODULE_ANDROID_DIR}/src/main"

: "${NDK_PATH:?Set NDK_PATH to an Android NDK r26b install (r23c if ANDROID_ABI < 21)}"

HOST_PLATFORM="linux-x86_64"
if [[ "$(uname -s)" == "Darwin" ]]; then
    HOST_PLATFORM="darwin-x86_64"
fi

# Must not exceed the app's minSdkVersion (24, see app.config.js / this
# module's build.gradle).
ANDROID_ABI="${ANDROID_ABI:-24}"

# Only the MP2 (MPEG Audio Layer II) decoder. Verify this is FFmpeg's exact
# decoder name for your checked-out FFmpeg version before running for real:
#   cd <ffmpeg-checkout> && ./configure >/dev/null 2>&1; ffmpeg -decoders 2>/dev/null | grep -i mp2
# If it differs (e.g. "mp2float"), update this array — a wrong name fails
# the ./configure step loudly, it does not silently build the wrong thing.
ENABLED_DECODERS=(mp2)

FFMPEG_CHECKOUT="${FFMPEG_CHECKOUT:-${REPO_ROOT}/.ffmpeg-src}"
FFMPEG_REF="${FFMPEG_REF:-release/6.0}" # per UPSTREAM_README.md's tested version

echo "== Fetching FFmpeg (${FFMPEG_REF}) into ${FFMPEG_CHECKOUT} =="
if [[ ! -d "${FFMPEG_CHECKOUT}/.git" ]]; then
    git clone --depth 1 --branch "${FFMPEG_REF}" https://git.ffmpeg.org/ffmpeg.git "${FFMPEG_CHECKOUT}"
fi
FFMPEG_PATH="${FFMPEG_CHECKOUT}"

echo "== Linking FFmpeg source into the decoder module's jni dir =="
mkdir -p "${FFMPEG_MODULE_PATH}/jni"
ln -sfn "${FFMPEG_PATH}" "${FFMPEG_MODULE_PATH}/jni/ffmpeg"

echo "== Building FFmpeg (decoders: ${ENABLED_DECODERS[*]}) for armeabi-v7a, arm64-v8a, x86, x86_64 =="
"${FFMPEG_MODULE_PATH}/jni/build_ffmpeg.sh" \
    "${FFMPEG_MODULE_PATH}" "${NDK_PATH}" "${HOST_PLATFORM}" "${ANDROID_ABI}" "${ENABLED_DECODERS[@]}"

echo "== Done. Static libs are under: ${FFMPEG_MODULE_PATH}/jni/ffmpeg/android-libs/<abi>/ =="
echo "== These get linked into libffmpegJNI.so by CMakeLists.txt during the normal Android/Gradle build. =="
echo "== Commit modules/decoder-ffmpeg-mp2/android/src/main/jni/ffmpeg/android-libs/ (or repoint the"
echo "== 'ffmpeg' symlink at a committed FFmpeg source checkout) so the .so is reproducible on EAS."
