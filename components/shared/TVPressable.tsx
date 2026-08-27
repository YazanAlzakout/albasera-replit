import { Brand, TVFocus } from '@/constants/theme';
import React from 'react';
import { Platform, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { SpatialNavigationFocusableView } from 'react-tv-space-navigation';

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
    // ─── Mobile / non-TV: plain Pressable ────────────────────────────────────
    if (!isTV) {
        return (
            <Pressable
                ref={ref}
                style={style}
                onPress={onPress}
                onFocus={onFocusProp}
                onBlur={onBlurProp}
                hitSlop={hitSlop}
                disabled={disabled}
                accessibilityRole={accessibilityRole}
                {...rest}
            >
                {children}
            </Pressable>
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
                onFocus={onFocusProp}
                onBlur={onBlurProp}
                hitSlop={hitSlop}
                disabled={disabled}
                accessibilityRole={accessibilityRole}
                style={style}
                {...rest}
            >
                {({ focused }: { focused: boolean }) => (
                    <>
                        {children}
                        {focused && (
                            <View
                                pointerEvents="none"
                                style={[
                                    StyleSheet.absoluteFill,
                                    focusStyle ?? {
                                        borderWidth: bw + 0.5,
                                        borderColor: Brand.focus,
                                        borderRadius,
                                    },
                                ]}
                            />
                        )}
                    </>
                )}
            </Pressable>
        );
    }

    // ─── Web TV: SpatialNavigationFocusableView for keyboard/remote support ──
    return (
        <SpatialNavigationFocusableView
            onSelect={() => {
                if (!disabled && typeof onPress === 'function') {
                    (onPress as () => void)();
                }
            }}
            onFocus={() => {
                if (typeof onFocusProp === 'function') {
                    (onFocusProp as () => void)();
                }
            }}
            onBlur={() => {
                if (typeof onBlurProp === 'function') {
                    (onBlurProp as () => void)();
                }
            }}
        >
            {({ isFocused }) => (
                <View
                    style={[
                        style as ViewStyle,
                        disabled && localStyles.disabled,
                        isFocused && (focusStyle || TVFocus[focusVariant]),
                    ]}
                    accessibilityRole={accessibilityRole}
                    accessibilityState={{ disabled: Boolean(disabled) }}
                >
                    {children}
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
