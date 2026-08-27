/**
 * components/shared/Skeleton.tsx — Premium Shimmer Skeleton
 * Uses a linear-gradient shimmer that sweeps left→right (or right→left in RTL)
 * Matches the app's dark/light theme colors.
 */

import { useLanguage } from '@/contexts/language-context';
import { useAppTheme } from '@/contexts/theme-context';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
    const { isDark } = useAppTheme();
    const { isRTL } = useLanguage();

    // Shimmer translate: moves from -1 (off-screen left) to +1 (off-screen right)
    const shimmer = useSharedValue(-1);

    useEffect(() => {
        shimmer.value = withRepeat(
            withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
            -1,
            false
        );
    }, []);

    const shimmerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: `${shimmer.value * 100}%` as any }],
    }));

    // Base colours
    const baseBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

    // Shimmer gradient colours — a bright sweep on the base
    const shimmerColors: [string, string, string] = isDark
        ? ['transparent', 'rgba(255,255,255,0.13)', 'transparent']
        : ['transparent', 'rgba(255,255,255,0.7)', 'transparent'];

    const gradientStart = isRTL ? { x: 1, y: 0 } : { x: 0, y: 0 };
    const gradientEnd = isRTL ? { x: 0, y: 0 } : { x: 1, y: 0 };

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: baseBg,
                    overflow: 'hidden',
                },
                style,
            ]}
        >
            {/* Sweeping shimmer stripe */}
            <Animated.View
                style={[
                    {
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0,
                    },
                    shimmerStyle,
                ]}
            >
                <LinearGradient
                    colors={shimmerColors}
                    start={gradientStart}
                    end={gradientEnd}
                    style={{ flex: 1 }}
                />
            </Animated.View>
        </Animated.View>
    );
}
