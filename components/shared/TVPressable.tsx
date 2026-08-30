import { Brand, TVFocus } from '@/constants/theme';
import React from 'react';
import { Platform, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { SpatialNavigationFocusableView } from 'react-tv-space-navigation';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
// Focus-ring fade duration for both TV branches below - kept short since this
// fires on every D-pad move, not a one-time entrance.
const FOCUS_FADE_MS = 120;

const isTV = Platform.isTV;
const isNativeTV = isTV && Platform.OS !== 'web';

type FocusVariant = 'card' | 'control' | 'input';

const FOCUS_BORDER_WIDTH: Record<FocusVariant, number> = {
    card: 2.5,
    control: 2,
    input: 2.5,
};

interface TVPressableProps extends Omit<PressableProps, 'style'> {
    style?: StyleProp<ViewStyle>;
    focusVariant?: FocusVariant;
    focusStyle?: StyleProp<ViewStyle>;
    hasTVPreferredFocus?: boolean;
    children: React.ReactNode;
}

export const TVPressable = React.forwardRef<View, TVPressableProps>(function TVPressable({
    style,
    focusVariant = 'card',
    focusStyle,
    hasTVPreferredFocus,
    children,
    onPress,
    onFocus: onFocusProp,
    onBlur: onBlurProp,
    hitSlop,
    disabled,
    accessibilityRole = 'button',
    ...rest
}, ref) {
    // ─── Mobile / non-TV: plain Pressable with press-scale feedback ──────────
    // `style` stays on this exact element (never moved to a wrapper) so every
    // existing caller's flex/sizing assumptions are unaffected - only an
    // animated `transform` is layered on top via AnimatedPressable.
    const pressScale = useSharedValue(1);
    const pressAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pressScale.value }],
    }));

    // Shared by both TV branches below: the focus ring/style stays mounted at
    // all times and only its opacity animates, so focus moves fade instead of
    // snapping. No transform is ever applied here - the TV focus system is
    // deliberately border/opacity-only so the D-pad highlight never shifts
    // layout or scales content.
    const focusOpacity = useSharedValue(0);
    const focusAnimatedStyle = useAnimatedStyle(() => ({
        opacity: focusOpacity.value,
    }));
    const handleTVFocus: NonNullable<PressableProps['onFocus']> = (e) => {
        focusOpacity.value = withTiming(1, { duration: FOCUS_FADE_MS });
        onFocusProp?.(e);
    };
    const handleTVBlur: NonNullable<PressableProps['onBlur']> = (e) => {
        focusOpacity.value = withTiming(0, { duration: FOCUS_FADE_MS });
        onBlurProp?.(e);
    };

    if (!isTV) {
        return (
            <AnimatedPressable
                ref={ref}
                style={[style, pressAnimatedStyle]}
                onPress={onPress}
                onPressIn={() => { pressScale.value = withSpring(0.95, { damping: 12 }); }}
                onPressOut={() => { pressScale.value = withSpring(1); }}
                onFocus={onFocusProp}
                onBlur={onBlurProp}
                hitSlop={hitSlop}
                disabled={disabled}
                accessibilityRole={accessibilityRole}
                {...rest}
            >
                {children}
            </AnimatedPressable>
        );
    }

    // ─── Native TV (Android TV / tvOS): overlay focus ring ───────────────────
    // The base `style` is NEVER modified so layout never shifts.
    // Focus indicator is an absolutely-positioned child overlay: no border-width
    // change on the element itself means neighbours and content never move.
    if (isNativeTV) {
        const flat = StyleSheet.flatten(style) as ViewStyle | undefined;
        const borderRadius = flat?.borderRadius ?? 0;
        const bw = FOCUS_BORDER_WIDTH[focusVariant];

        return (
            <Pressable
                ref={ref}
                hasTVPreferredFocus={hasTVPreferredFocus}
                onPress={onPress}
                onFocus={handleTVFocus}
                onBlur={handleTVBlur}
                hitSlop={hitSlop}
                disabled={disabled}
                accessibilityRole={accessibilityRole}
                style={style}
                {...rest}
            >
                {children}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        StyleSheet.absoluteFill,
                        focusStyle ?? {
                            borderWidth: bw + 0.5,
                            borderColor: Brand.focus,
                            borderRadius,
                        },
                        focusAnimatedStyle,
                    ]}
                />
            </Pressable>
        );
    }

    // ─── Web TV: SpatialNavigationFocusableView for keyboard/remote support ──
    // Same fade-not-snap treatment as native TV above: the focus style is its
    // own always-mounted overlay with animated opacity, kept separate from the
    // content box so the fade never dims `children` itself.
    return (
        <SpatialNavigationFocusableView
            onSelect={() => {
                if (!disabled && typeof onPress === 'function') {
                    (onPress as () => void)();
                }
            }}
            onFocus={() => {
                focusOpacity.value = withTiming(1, { duration: FOCUS_FADE_MS });
                if (typeof onFocusProp === 'function') {
                    (onFocusProp as () => void)();
                }
            }}
            onBlur={() => {
                focusOpacity.value = withTiming(0, { duration: FOCUS_FADE_MS });
                if (typeof onBlurProp === 'function') {
                    (onBlurProp as () => void)();
                }
            }}
        >
            {() => (
                <View
                    style={[style as ViewStyle, disabled && localStyles.disabled]}
                    accessibilityRole={accessibilityRole}
                    accessibilityState={{ disabled: Boolean(disabled) }}
                >
                    {children}
                    <Animated.View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, focusStyle || TVFocus[focusVariant], focusAnimatedStyle]}
                    />
                </View>
            )}
        </SpatialNavigationFocusableView>
    );
});

TVPressable.displayName = 'TVPressable';

const localStyles = StyleSheet.create({
    disabled: {
        opacity: 0.55,
    },
});
