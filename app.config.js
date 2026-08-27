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
            intentFilters: isTV ? [
                {
                    action: "MAIN",
                    category: [
                        "LEANBACK_LAUNCHER"
                    ]
                }
            ] : undefined,
            // ✅ التصريح بميزة Leanback لشاشات التلفاز
            ...(isTV && {
                usesFeatures: [
                    {
                        name: "android.software.leanback",
                        required: false  // false حتى يعمل على الهواتف أيضاً
                    },
                    {
                        name: "android.hardware.touchscreen",
                        required: false  // false لأن التلفاز لا يدعم اللمس
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
                        usesCleartextTraffic: true
                    }
                }
            ],
            "expo-localization",
            ...(isTV ? ["@react-native-tvos/config-tv"] : [])
        ],
        experiments: {
            typedRoutes: true,
            reactCompiler: true
        },
extra: {
    router: {},
    ...(!isLocalDev && { eas: {
        projectId: "1d07ed3f-21b5-40ef-bcf6-7cc2c84fc92c"
    } })
},
        ...(!isLocalDev && { runtimeVersion: {
            policy: "appVersion"
        } }),
        updates: isLocalDev ? {
            enabled: false
        } : {
            url: "https://u.expo.dev/70cbf9df-a1ae-4ce1-ab2b-f314e7646e9f"
        }
    }
};