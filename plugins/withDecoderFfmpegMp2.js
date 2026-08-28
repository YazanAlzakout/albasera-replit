const { withSettingsGradle } = require('@expo/config-plugins');

/**
 * Wires the vendored modules/decoder-ffmpeg-mp2/android module into the
 * generated Android project's settings.gradle, so
 * `implementation project(':decoder-ffmpeg-mp2')` (added to expo-video's
 * android/build.gradle via patches/expo-video+*.patch) resolves.
 *
 * The module lives outside android/ (which `expo prebuild --clean` wipes),
 * at the stable repo path modules/decoder-ffmpeg-mp2/android — this plugin
 * just points Gradle at it, it does not copy any files.
 */
const withDecoderFfmpegMp2 = (config) => {
    return withSettingsGradle(config, (config) => {
        if (config.modResults.contents.includes(":decoder-ffmpeg-mp2")) {
            return config;
        }

        config.modResults.contents += `
include ':decoder-ffmpeg-mp2'
project(':decoder-ffmpeg-mp2').projectDir = new File(rootDir, '../modules/decoder-ffmpeg-mp2/android')
`;

        return config;
    });
};

module.exports = withDecoderFfmpegMp2;
