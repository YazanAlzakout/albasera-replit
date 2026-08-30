const isTV = process.env.EXPO_TV === "1";
const isLocalDev = process.env.EXPO_LOCAL_DEV === "1";

module.exports = {
    expo: {
        name: isTV ? "AlBasera Player TV" : "AlBasera Player",
        slug: "albasera-player",
        version: "1.0.0",

        orientation: isTV ? "landscape" : "default",

        icon: "./assets/images/icon.png",
        scheme: "albasera",
        userInterfaceStyle: "automatic",
        newArchEnabled: true,

        ios: {
            supportsTablet: true,
            infoPlist: {
                NSAppTransportSecurity: {
                    NSAllowsArbitraryLoads: true
                }
            }
        },

        android: {
            adaptiveIcon: {
                backgroundColor: "#E6F4FE",
                foregroundImage: "./assets/images/android-icon-foreground.png",
                backgroundImage: "./assets/images/android-icon-background.png",
                monochromeImage: "./assets/images/android-icon-monochrome.png"
            },

            edgeToEdgeEnabled: true,
            predictiveBackGestureEnabled: false,

            package: "com.albasera.player",

            intentFilters: isTV
                ? [
                    {
                        action: "MAIN",
                        category: [
                            "LEANBACK_LAUNCHER"
                        ]
                    }
                ]
                : undefined,

            // إعدادات Android TV
            ...(isTV && {
                usesFeatures: [
                    {
                        name: "android.software.leanback",
                        required: false
                    },
                    {
                        name: "android.hardware.touchscreen",
                        required: false
                    }
                ]
            })
        },

        web: {
            output: "static",
            favicon: "./assets/images/favicon.png"
        },

        plugins: [
            "expo-router",

            [
                "expo-splash-screen",
                {
                    image: "./assets/images/splash-icon.png",
                    imageWidth: 200,
                    resizeMode: "contain",
                    backgroundColor: "#ffffff",
                    dark: {
                        backgroundColor: "#000000"
                    }
                }
            ],

            [
                "expo-video",
                {
                    supportsBackgroundPlayback: true,
                    supportsPictureInPicture: true
                }
            ],

            "expo-font",
            "expo-secure-store",

            [
                "expo-build-properties",
                {
                    android: {
                        usesCleartextTraffic: true,
                        minSdkVersion: 26,
                        packagingOptions: {
                            // Multiple native modules can bundle their own copy of
                            // libc++_shared.so; picking the first avoids a native-libs
                            // merge conflict during the build.
                            pickFirst: ["**/libc++_shared.so"]
                        }
                    }
                }
            ],

            "expo-localization",

            // Wires modules/decoder-ffmpeg-mp2 (a from-scratch, LGPL-safe FFmpeg
            // build with only the MP2 decoder enabled, Apache-2.0 wrapper code
            // vendored from androidx/media) into Media3 as an extension audio
            // renderer, so MP2 live channels decode natively. See
            // patches/expo-video+*.patch for the two lines this depends on
            // (build.gradle dependency + setExtensionRendererMode).
            "./plugins/withDecoderFfmpegMp2",

            ...(isTV ? ["@react-native-tvos/config-tv"] : [])
        ],

        experiments: {
            typedRoutes: true,
            reactCompiler: true
        },

        extra: {
            router: {},

            ...(!isLocalDev && {
                eas: {
                    projectId: "1d07ed3f-21b5-40ef-bcf6-7cc2c84fc92c"
                }
            })
        },

        ...(!isLocalDev && {
            runtimeVersion: {
                policy: "appVersion"
            }
        }),

        updates: isLocalDev
            ? {
                enabled: false
            }
            : {
                url: "https://u.expo.dev/70cbf9df-a1ae-4ce1-ab2b-f314e7646e9f"
            }
    }
};
