import { Brand } from '@/constants/theme';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface DotsProps {
    total: number;
    current: number;
    color?: string;
}

export function OnboardingDots({ total, current, color = Brand.primary }: DotsProps) {
    return (
        <Animated.View style={styles.container}>
            {Array.from({ length: total }).map((_, i) => (
                <AnimatedDot key={i} active={i === current} color={color} />
            ))}
        </Animated.View>
    );
}

function AnimatedDot({ active, color }: { active: boolean; color: string }) {
    const width = useSharedValue(active ? 28 : 8);
    const opacity = useSharedValue(active ? 1 : 0.35);

    useEffect(() => {
        width.value = withSpring(active ? 28 : 8, { damping: 15, stiffness: 200 });
        opacity.value = withTiming(active ? 1 : 0.35, { duration: 250 });
    }, [active]);

    const style = useAnimatedStyle(() => ({
        width: width.value,
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                styles.dot,
                { backgroundColor: color },
                style,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
});
