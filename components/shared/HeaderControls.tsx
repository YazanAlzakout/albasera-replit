import { Brand, Colors, FontFamily } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useAppTheme } from '@/contexts/theme-context';
import React, { useState } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { LanguageSelectionModal } from './LanguageSelectionModal';
import { TVPressable } from './TVPressable';

const isTV = Platform.isTV;

interface HeaderControlsProps {
    /** حجم الأيقونات والزر */
    size?: 'sm' | 'md' | 'lg';
    /** لون الخلفية الشفاف أو محدد */
    tinted?: boolean;
}

// ─── Icon: Language Globe ─────────────────────────────────────────────────────
function LangIcon({ color, locale }: { color: string; locale: string }) {
    const labels: Record<string, string> = { ar: 'ع', en: 'EN', fr: 'FR', tr: 'TR', ku: 'KU', ckb: 'کوردی' };
    return (
        <Text style={[styles.iconText, { color }]}>
            {labels[locale] ?? 'EN'}
        </Text>
    );
}

// ─── Icon: Sun / Moon ─────────────────────────────────────────────────────────
function ThemeIcon({ isDark, color }: { isDark: boolean; color: string }) {
    return (
        <Text style={[styles.iconEmoji, { color }]}>
            {isDark ? '☀️' : '🌙'}
        </Text>
    );
}

// ─── Animated Press Button ────────────────────────────────────────────────────
function ControlButton({
    onPress,
    children,
    tinted,
    isDark,
    label,
}: {
    onPress: () => void;
    children: React.ReactNode;
    tinted: boolean;
    isDark: boolean;
    label: string;
}) {
    const scale = useSharedValue(1);
    const rotate = useSharedValue(0);

    const handlePress = () => {
        scale.value = withSequence(
            withTiming(0.85, { duration: 100, easing: Easing.out(Easing.quad) }),
            withSpring(1, { damping: 12, stiffness: 300 }),
        );
        rotate.value = withSequence(
            withTiming(0.05, { duration: 80 }),
            withTiming(-0.05, { duration: 80 }),
            withTiming(0, { duration: 80 }),
        );
        onPress();
    };

    const animStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotate.value}rad` },
        ],
    }));

    const bg = tinted
        ? isDark
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(0,0,0,0.07)'
        : 'transparent';

    const border = isDark
        ? 'rgba(255,255,255,0.15)'
        : 'rgba(0,0,0,0.1)';

    const btnSize = isTV ? 52 : 40;

    return (
        <TVPressable
            onPress={handlePress}
            accessibilityLabel={label}
            accessibilityRole="button"
            focusVariant="control"
        >
            <Animated.View
                style={[
                    styles.btn,
                    {
                        width: btnSize,
                        height: btnSize,
                        borderRadius: btnSize / 2,
                        backgroundColor: bg,
                        borderColor: border,
                    },
                    animStyle,
                ]}
            >
                {children}
            </Animated.View>
        </TVPressable>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function HeaderControls({ tinted = true }: HeaderControlsProps) {
    const { locale } = useLanguage();
    const { isDark, toggleTheme } = useAppTheme();
    const [isLangModalVisible, setIsLangModalVisible] = useState(false);

    const iconColor = isDark
        ? Colors.dark.text
        : Colors.light.text;

    return (
        <View style={styles.container}>
            {/* Language Switcher */}
            <ControlButton
                onPress={() => setIsLangModalVisible(true)}
                tinted={tinted}
                isDark={isDark}
                label="Change Language"
            >
                <LangIcon color={Brand.primary} locale={locale} />
            </ControlButton>

            {/* Theme Toggle */}
            <ControlButton
                onPress={toggleTheme}
                tinted={tinted}
                isDark={isDark}
                label="Toggle Theme"
            >
                <ThemeIcon isDark={isDark} color={iconColor} />
            </ControlButton>

            {/* Language Selection Modal */}
            <LanguageSelectionModal
                visible={isLangModalVisible}
                onClose={() => setIsLangModalVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: isTV ? 14 : 8,
    },
    btn: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    iconText: {
        fontFamily: FontFamily.extraBold,
        fontSize: isTV ? 18 : 13,
        letterSpacing: 0.5,
    },
    iconEmoji: {
        fontSize: isTV ? 22 : 16,
    },
});
