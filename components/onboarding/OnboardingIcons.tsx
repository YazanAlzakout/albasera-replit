import { Brand } from '@/constants/theme';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';



// ─── Particle ────────────────────────────────────────────────────────────────
function Particle({ x, y, delay, size }: { x: number; y: number; delay: number; size: number }) {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(0.5);

    useEffect(() => {
        opacity.value = withDelay(delay, withRepeat(
            withSequence(
                withTiming(0.8, { duration: 1200, easing: Easing.out(Easing.ease) }),
                withTiming(0, { duration: 1200, easing: Easing.in(Easing.ease) }),
            ), -1, false
        ));
        translateY.value = withDelay(delay, withRepeat(
            withTiming(-30, { duration: 2400, easing: Easing.inOut(Easing.ease) }), -1, true
        ));
        scale.value = withDelay(delay, withRepeat(
            withSequence(
                withTiming(1.2, { duration: 1200 }),
                withTiming(0.5, { duration: 1200 }),
            ), -1, false
        ));
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }, { scale: scale.value }],
    }));

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: Brand.primary,
                },
                animStyle,
            ]}
        />
    );
}

// ─── TV Glow Icon (Slide 1) ───────────────────────────────────────────────────
export function TVGlowIcon() {
    const glow = useSharedValue(0.5);
    const scaleAnim = useSharedValue(1);

    useEffect(() => {
        glow.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            ), -1, false
        );
        scaleAnim.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 2000 }),
                withTiming(1, { duration: 2000 }),
            ), -1, true
        );
    }, []);

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glow.value,
        transform: [{ scale: scaleAnim.value }],
    }));

    const particles = [
        { x: 30, y: 20, delay: 0, size: 6 },
        { x: 250, y: 40, delay: 400, size: 4 },
        { x: 60, y: 180, delay: 800, size: 5 },
        { x: 220, y: 160, delay: 200, size: 7 },
        { x: 130, y: 10, delay: 600, size: 4 },
        { x: 290, y: 100, delay: 1000, size: 5 },
        { x: 10, y: 100, delay: 300, size: 6 },
        { x: 150, y: 210, delay: 700, size: 4 },
    ];

    return (
        <View style={styles.iconContainer}>
            {/* Particles */}
            {particles.map((p, i) => <Particle key={i} {...p} />)}

            {/* Glow ring */}
            <Animated.View style={[styles.glowRing, glowStyle]} />
            <Animated.View style={[styles.glowRingOuter, { opacity: glow.value * 0.3 }]} />

            {/* TV Body */}
            <Animated.View style={[styles.tvBody, { transform: [{ scale: scaleAnim.value }] }]}>
                {/* Screen */}
                <View style={styles.tvScreen}>
                    <View style={styles.tvScanline1} />
                    <View style={styles.tvScanline2} />
                    {/* Play icon */}
                    <View style={styles.playButton}>
                        <View style={styles.playTriangle} />
                    </View>
                </View>
                {/* Stand */}
                <View style={styles.tvStand} />
                <View style={styles.tvBase} />
            </Animated.View>
        </View>
    );
}

// ─── Channels Grid Icon (Slide 2) ─────────────────────────────────────────────
interface GridCellProps {
    index: number;
    color: string;
}

function GridCell({ index, color }: GridCellProps) {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        const delay = index * 150;
        scale.value = withDelay(delay, withRepeat(
            withSequence(
                withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) }),
                withTiming(0.95, { duration: 1000 }),
                withTiming(1, { duration: 500 }),
            ), -1, false
        ));
        opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.gridCell, { backgroundColor: color }, animStyle]}>
            <View style={styles.gridCellInner} />
        </Animated.View>
    );
}

export function ChannelsGridIcon() {
    const channelColors = [
        Brand.primary, '#1E90FF', '#2ECC71',
        '#F39C12', Brand.primaryLight, '#9B59B6',
        '#1ABC9C', '#E74C3C', Brand.primaryDark,
    ];

    return (
        <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
                {channelColors.map((color, i) => (
                    <GridCell key={i} index={i} color={color} />
                ))}
            </View>
        </View>
    );
}

// ─── Multi Device Icon (Slide 3) ──────────────────────────────────────────────
export function MultiDeviceIcon() {
    const orbit = useSharedValue(0);
    const floatY = useSharedValue(0);

    useEffect(() => {
        orbit.value = withRepeat(
            withTiming(1, { duration: 6000, easing: Easing.linear }), -1, false
        );
        floatY.value = withRepeat(
            withSequence(
                withTiming(-12, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            ), -1, false
        );
    }, []);

    const tvStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: floatY.value }],
    }));

    const phone1Style = useAnimatedStyle(() => ({
        transform: [
            { translateX: Math.cos(orbit.value * 2 * Math.PI) * 85 },
            { translateY: Math.sin(orbit.value * 2 * Math.PI) * 40 - 10 },
        ],
    }));

    const tabletStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: Math.cos((orbit.value + 0.5) * 2 * Math.PI) * 85 },
            { translateY: Math.sin((orbit.value + 0.5) * 2 * Math.PI) * 40 - 10 },
        ],
    }));

    return (
        <View style={styles.deviceContainer}>
            {/* Center TV */}
            <Animated.View style={[styles.centerTV, tvStyle]}>
                <View style={styles.centerTVScreen} />
                <View style={styles.centerTVStand} />
            </Animated.View>

            {/* Orbiting phone */}
            <Animated.View style={[styles.orbitPhone, phone1Style]}>
                <View style={styles.phoneScreen} />
                <View style={styles.phoneHomeBar} />
            </Animated.View>

            {/* Orbiting tablet */}
            <Animated.View style={[styles.orbitTablet, tabletStyle]}>
                <View style={styles.tabletScreen} />
            </Animated.View>

            {/* Orbit ring */}
            <View style={styles.orbitRing} />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    iconContainer: {
        width: 300,
        height: 240,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glowRing: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: Brand.primaryGlow,
    },
    glowRingOuter: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: Brand.primaryGlow,
    },
    tvBody: {
        alignItems: 'center',
        zIndex: 10,
    },
    tvScreen: {
        width: 150,
        height: 100,
        backgroundColor: '#0A0A0F',
        borderRadius: 10,
        borderWidth: 4,
        borderColor: Brand.primary,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tvScanline1: {
        position: 'absolute',
        left: 0,
        top: 25,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(229,9,20,0.2)',
    },
    tvScanline2: {
        position: 'absolute',
        left: 0,
        top: 65,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(229,9,20,0.2)',
    },
    playButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Brand.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playTriangle: {
        width: 0,
        height: 0,
        borderTopWidth: 8,
        borderBottomWidth: 8,
        borderLeftWidth: 14,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: '#fff',
        marginLeft: 3,
    },
    tvStand: {
        width: 10,
        height: 20,
        backgroundColor: Brand.primaryDark,
        borderRadius: 2,
    },
    tvBase: {
        width: 60,
        height: 8,
        backgroundColor: Brand.primaryDark,
        borderRadius: 4,
    },
    // Grid
    gridContainer: {
        width: 280,
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 240,
        gap: 8,
        justifyContent: 'center',
    },
    gridCell: {
        width: 70,
        height: 55,
        borderRadius: 10,
        overflow: 'hidden',
        justifyContent: 'flex-end',
        padding: 6,
    },
    gridCellInner: {
        width: '60%',
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 2,
    },
    // Devices
    deviceContainer: {
        width: 300,
        height: 240,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerTV: {
        alignItems: 'center',
        zIndex: 5,
    },
    centerTVScreen: {
        width: 110,
        height: 75,
        backgroundColor: Brand.primary,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: Brand.primaryLight,
    },
    centerTVStand: {
        width: 30,
        height: 12,
        backgroundColor: Brand.primaryDark,
        borderRadius: 2,
    },
    orbitPhone: {
        position: 'absolute',
        alignItems: 'center',
        zIndex: 4,
    },
    phoneScreen: {
        width: 32,
        height: 58,
        backgroundColor: Brand.primaryDark,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: Brand.primary,
    },
    phoneHomeBar: {
        width: 16,
        height: 3,
        backgroundColor: Brand.primary,
        borderRadius: 2,
        marginTop: 2,
    },
    orbitTablet: {
        position: 'absolute',
        zIndex: 4,
    },
    tabletScreen: {
        width: 55,
        height: 42,
        backgroundColor: Brand.primaryDark,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: Brand.primary,
    },
    orbitRing: {
        position: 'absolute',
        width: 190,
        height: 90,
        borderRadius: 95,
        borderWidth: 1,
        borderColor: Brand.primaryMuted,
        borderStyle: 'dashed',
    },
});
