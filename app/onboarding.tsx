import { OnboardingDots } from '@/components/onboarding/OnboardingDots';
import { ChannelsGridIcon, MultiDeviceIcon, TVGlowIcon } from '@/components/onboarding/OnboardingIcons';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { HeaderControls } from '@/components/shared/HeaderControls';
import { TVPressable } from '@/components/shared/TVPressable';
import { Brand, Colors, FontFamily, TVSafe } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useAppTheme } from '@/contexts/theme-context';
import { useOnboarding } from '@/hooks/use-onboarding';
import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    View,
    ViewToken,
} from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Constants ─────────────────────────────────────────────────────────────
const { width: W, height: H } = Dimensions.get('window');
const isTV = Platform.isTV;
const TOTAL_SLIDES = 3;
const SLIDE_ICONS = [TVGlowIcon, ChannelsGridIcon, MultiDeviceIcon];

// Responsive helpers
const scale = (size: number) => (W / 375) * size;
const tvScale = (size: number) => (H / 1080) * size;
const clamp = (val: number, min: number, max: number) =>
    Math.min(Math.max(val, min), max);

// Illustration max height = 40% of screen, so it never touches header/footer
const ILLUSTRATION_MAX_H = isTV ? H * 0.38 : H * 0.38;
const LOGO_SIZE = isTV
    ? clamp(tvScale(200), 120, 260)
    : clamp(scale(160), 100, 220);

// ─── Phone Slide ────────────────────────────────────────────────────────────
function PhoneSlide({ index, isDark }: { index: number; isDark: boolean }) {
    const { t, isRTL } = useLanguage();
    const Icon = SLIDE_ICONS[index];
    const slide = t.onboarding.slides[index];
    const textAlign = isRTL ? 'right' : 'left';
    const textColor = isDark ? Colors.dark.text : Colors.light.text;
    const subtitleColor = isDark
        ? Colors.dark.textSecondary
        : Colors.light.textSecondary;

    return (
        <View style={styles.phoneSlide}>
            {/* Illustration — bounded height so it never bleeds into header */}
            <View style={styles.phoneIllustration}>
                <BrandLogo style={styles.phoneLogo} />
                <Icon />
            </View>

            {/* Text block */}
            <View style={styles.phoneTextBlock}>
                <Text
                    style={[
                        styles.phoneTitle,
                        {
                            color: textColor,
                            textAlign,
                            writingDirection: isRTL ? 'rtl' : 'ltr',
                        },
                    ]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                >
                    {slide.title}
                </Text>
                <View
                    style={[
                        styles.underline,
                        { alignSelf: isRTL ? 'flex-end' : 'flex-start' },
                    ]}
                />
                <Text
                    style={[
                        styles.phoneSubtitle,
                        {
                            color: subtitleColor,
                            textAlign,
                            writingDirection: isRTL ? 'rtl' : 'ltr',
                        },
                    ]}
                    numberOfLines={3}
                >
                    {slide.subtitle}
                </Text>
            </View>
        </View>
    );
}

// ─── TV Slide ────────────────────────────────────────────────────────────────
function TVSlide({ index, isDark }: { index: number; isDark: boolean }) {
    const { t, isRTL } = useLanguage();
    const Icon = SLIDE_ICONS[index];
    const slide = t.onboarding.slides[index];
    const textColor = isDark ? Colors.dark.text : Colors.light.text;
    const subtitleColor = isDark
        ? Colors.dark.textSecondary
        : Colors.light.textSecondary;
    const textAlign = isRTL ? 'right' : 'left';

    return (
        <Animated.View
            entering={FadeIn.duration(400)}
            style={[styles.tvSlideRow, isRTL && styles.tvSlideRowRTL]}
        >
            {/* Left: logo + icon, strictly bounded */}
            <View style={styles.tvIllustration}>
                <BrandLogo style={styles.tvLogo} />
                <View style={styles.tvIconWrap}>
                    <Icon />
                </View>
            </View>

            {/* Right: text */}
            <View style={styles.tvTextSide}>
                <Text
                    style={[
                        styles.tvTitle,
                        {
                            color: textColor,
                            textAlign,
                            writingDirection: isRTL ? 'rtl' : 'ltr',
                        },
                    ]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                >
                    {slide.title}
                </Text>
                <View
                    style={[
                        styles.tvUnderline,
                        { alignSelf: isRTL ? 'flex-end' : 'flex-start' },
                    ]}
                />
                <Text
                    style={[
                        styles.tvSubtitle,
                        {
                            color: subtitleColor,
                            textAlign,
                            writingDirection: isRTL ? 'rtl' : 'ltr',
                        },
                    ]}
                    numberOfLines={4}
                >
                    {slide.subtitle}
                </Text>
            </View>
        </Animated.View>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
    const { isDark } = useAppTheme();
    const { t, isRTL } = useLanguage();
    const { completeOnboarding } = useOnboarding();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatRef = useRef<FlatList>(null);

    const btnScale = useSharedValue(1);
    const btnStyle = useAnimatedStyle(() => ({
        transform: [{ scale: btnScale.value }],
    }));

    const isLast = currentIndex === TOTAL_SLIDES - 1;
    const bg = isDark ? '#0A0A0F' : '#FFFFFF';

    const handleNext = useCallback(async () => {
        btnScale.value = withTiming(
            0.92,
            { duration: 90, easing: Easing.out(Easing.quad) },
            () => {
                btnScale.value = withTiming(1, { duration: 150 });
            }
        );
        if (isLast) {
            await completeOnboarding();
            router.replace('/login');
        } else {
            const next = currentIndex + 1;
            if (isTV) {
                setCurrentIndex(next);
            } else {
                flatRef.current?.scrollToIndex({ index: next, animated: true });
            }
        }
    }, [isLast, currentIndex, completeOnboarding, btnScale]);

    const handleSkip = useCallback(async () => {
        await completeOnboarding();
        router.replace('/login');
    }, [completeOnboarding]);

    const onViewableItemsChanged = useRef(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            if (
                viewableItems.length > 0 &&
                viewableItems[0].index !== null
            ) {
                setCurrentIndex(viewableItems[0].index);
            }
        }
    ).current;

    return (
        <View style={[styles.root, { backgroundColor: bg }]}>
            {/* Decorative background blobs */}
            <View
                style={[
                    styles.bgCircle,
                    { backgroundColor: Brand.primaryGlow },
                ]}
            />
            <View
                style={[
                    styles.bgCircleBottom,
                    { backgroundColor: Brand.primaryMuted },
                ]}
            />

            {/* 
             * KEY FIX: SafeAreaView uses flex:1 so it fills the screen.
             * Inside we split into 3 fixed zones:
             *   1. Header  — fixed height, never grows
             *   2. Content — flex:1, takes all remaining space
             *   3. Footer  — fixed height, never grows
             * This prevents the illustration from ever touching the header.
             */}
            <SafeAreaView style={styles.safeArea}>
                {/* ── Zone 1: Header ────────────────────────── */}
                <View
                    style={[
                        styles.header,
                        isRTL && styles.headerRTL,
                    ]}
                >
                    <HeaderControls tinted />
                </View>

                {/* ── Zone 2: Slide Content (flex:1) ────────── */}
                <View style={styles.contentZone}>
                    {isTV ? (
                        <View style={styles.tvContent}>
                            <TVSlide
                                key={currentIndex}
                                index={currentIndex}
                                isDark={isDark}
                            />
                        </View>
                    ) : (
                        <FlatList
                            ref={flatRef}
                            data={SLIDE_ICONS}
                            keyExtractor={(_, i) => String(i)}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            bounces={false}
                            scrollEventThrottle={16}
                            onViewableItemsChanged={onViewableItemsChanged}
                            viewabilityConfig={{
                                viewAreaCoveragePercentThreshold: 50,
                            }}
                            inverted={isRTL}
                            renderItem={({ index }) => (
                                <PhoneSlide
                                    index={index}
                                    isDark={isDark}
                                />
                            )}
                            style={styles.phoneFlatList}
                        />
                    )}
                </View>

                {/* ── Zone 3: Footer ────────────────────────── */}
                <View
                    style={[
                        styles.footer,
                        isRTL && styles.footerRTL,
                    ]}
                >
                    <OnboardingDots
                        total={TOTAL_SLIDES}
                        current={
                            isRTL
                                ? TOTAL_SLIDES - 1 - currentIndex
                                : currentIndex
                        }
                    />

                    {!isLast && (
                        <TVPressable
                            onPress={handleSkip}
                            hitSlop={14}
                            focusVariant="control"
                            style={styles.skipWrap}
                        >
                            <Text
                                style={[
                                    styles.skipText,
                                    {
                                        color: isDark
                                            ? 'rgba(255,255,255,0.4)'
                                            : 'rgba(0,0,0,0.35)',
                                    },
                                ]}
                            >
                                {t.common.skip}
                            </Text>
                        </TVPressable>
                    )}

                    <Animated.View style={btnStyle}>
                        <TVPressable
                            onPress={handleNext}
                            focusVariant="card"
                            hasTVPreferredFocus={isTV}
                            style={[
                                styles.nextBtn,
                                isLast && styles.nextBtnWide,
                            ]}
                        >
                            {isLast ? (
                                <Text style={styles.nextBtnText}>
                                    {t.common.getStarted}
                                </Text>
                            ) : (
                                <View style={styles.arrowWrap}>
                                    <View
                                        style={[
                                            styles.arrowTriangle,
                                            isRTL && styles.arrowTriangleRTL,
                                        ]}
                                    />
                                </View>
                            )}
                        </TVPressable>
                    </Animated.View>
                </View>

                {/* ── Tagline ──────────────────────────────── */}
                <Text
                    style={[
                        styles.tagline,
                        {
                            color: isDark
                                ? 'rgba(255,255,255,0.2)'
                                : 'rgba(0,0,0,0.15)',
                        },
                    ]}
                >
                    {t.common.appTagline}
                </Text>
            </SafeAreaView>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

// Button sizing — responsive & clamped
const BTN_SIZE = isTV
    ? clamp(tvScale(80), 56, 90)
    : clamp(scale(58), 46, 68);
const BTN_WIDE = isTV
    ? clamp(tvScale(260), 180, 300)
    : clamp(scale(180), 140, 220);

// Header height — fixed zone, never flex
const HEADER_HEIGHT = isTV
    ? clamp(tvScale(80), 60, 100)
    : clamp(scale(56), 48, 72);

// Footer height — fixed zone
const FOOTER_HEIGHT = isTV
    ? clamp(tvScale(100), 72, 120)
    : clamp(scale(80), 64, 96);

const styles = StyleSheet.create({
    // ── Root
    root: {
        flex: 1,
        overflow: 'hidden',
    },

    // ── Background blobs
    bgCircle: {
        position: 'absolute',
        width: isTV ? H * 1.1 : W * 1.3,
        height: isTV ? H * 1.1 : W * 1.3,
        borderRadius: isTV ? H * 0.55 : W * 0.65,
        top: isTV ? -H * 0.45 : -W * 0.55,
        left: isTV ? -H * 0.15 : -W * 0.15,
        zIndex: 0,
    },
    bgCircleBottom: {
        position: 'absolute',
        width: isTV ? H * 0.5 : W * 0.7,
        height: isTV ? H * 0.5 : W * 0.7,
        borderRadius: isTV ? H * 0.25 : W * 0.35,
        bottom: isTV ? -H * 0.1 : -W * 0.15,
        right: isTV ? -H * 0.05 : -W * 0.1,
        zIndex: 0,
    },

    // ── SafeAreaView shell
    safeArea: {
        flex: 1,
        zIndex: 1,
    },

    // ── Zone 1: Header — fixed height, row layout
    header: {
        height: HEADER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',        // HeaderControls on the right
        paddingHorizontal: isTV ? TVSafe.paddingHorizontal : 20,
    },
    headerRTL: {
        flexDirection: 'row-reverse',
        justifyContent: 'flex-start',      // mirror for RTL
    },

    // ── Zone 2: Content — fills all remaining space
    contentZone: {
        flex: 1,
        // overflow hidden so oversized illustrations are clipped,
        // not allowed to push zones 1 & 3
        overflow: 'hidden',
    },

    // Phone
    phoneFlatList: {
        flex: 1,
    },
    phoneSlide: {
        width: W,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: clamp(scale(24), 16, 40),
        // Safe gap from header so illustration never bleeds up
        paddingTop: 12,
        paddingBottom: 12,
    },
    phoneIllustration: {
        // Capped height: illustration can never overflow the content zone
        maxHeight: ILLUSTRATION_MAX_H,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: clamp(scale(20), 12, 32),
    },
    phoneLogo: {
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        marginBottom: clamp(scale(10), 6, 16),
        // resizeMode contained so it scales down on small screens
        resizeMode: 'contain',
    },
    phoneTextBlock: {
        width: '100%',
        paddingHorizontal: 4,
    },
    phoneTitle: {
        fontSize: clamp(scale(26), 18, 32),
        fontFamily: FontFamily.black,
        letterSpacing: -0.5,
        lineHeight: clamp(scale(34), 24, 42),
        marginBottom: clamp(scale(10), 6, 14),
    },
    phoneSubtitle: {
        fontSize: clamp(scale(15), 12, 18),
        fontFamily: FontFamily.regular,
        lineHeight: clamp(scale(23), 18, 28),
        letterSpacing: 0.1,
    },
    underline: {
        width: clamp(scale(50), 36, 64),
        height: 4,
        backgroundColor: Brand.primary,
        borderRadius: 2,
        marginBottom: clamp(scale(14), 8, 18),
    },

    // TV
    tvContent: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: TVSafe.paddingHorizontal,
    },
    tvSlideRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: clamp(tvScale(60), 32, 80),
    },
    tvSlideRowRTL: { flexDirection: 'row-reverse' },
    tvIllustration: {
        flex: 1,
        // Bounded height: logo + icon can't grow beyond this
        maxHeight: ILLUSTRATION_MAX_H,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tvLogo: {
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        marginBottom: clamp(tvScale(16), 8, 24),
        resizeMode: 'contain',
    },
    tvIconWrap: {
        transform: [{ scale: 1.2 }],
    },
    tvTextSide: {
        flex: 1.3,
        justifyContent: 'center',
    },
    tvTitle: {
        fontSize: clamp(tvScale(48), 28, 56),
        fontFamily: FontFamily.black,
        letterSpacing: -0.5,
        lineHeight: clamp(tvScale(60), 36, 70),
        marginBottom: clamp(tvScale(14), 8, 20),
    },
    tvUnderline: {
        width: clamp(tvScale(70), 40, 90),
        height: 5,
        backgroundColor: Brand.primary,
        borderRadius: 3,
        marginBottom: clamp(tvScale(20), 12, 28),
    },
    tvSubtitle: {
        fontSize: clamp(tvScale(24), 14, 28),
        fontFamily: FontFamily.regular,
        lineHeight: clamp(tvScale(38), 22, 44),
        letterSpacing: 0.1,
    },

    // ── Zone 3: Footer — fixed height
    footer: {
        height: FOOTER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: isTV ? TVSafe.paddingHorizontal : 24,
        gap: isTV ? 24 : 12,
    },
    footerRTL: { flexDirection: 'row-reverse' },
    skipWrap: {
        paddingHorizontal: isTV ? 20 : 4,
        paddingVertical: isTV ? 10 : 2,
        borderRadius: isTV ? 12 : 6,
    },
    skipText: {
        fontSize: isTV ? clamp(tvScale(20), 14, 24) : clamp(scale(14), 12, 16),
        fontFamily: FontFamily.medium,
    },

    // Next button
    nextBtn: {
        width: BTN_SIZE,
        height: BTN_SIZE,
        borderRadius: BTN_SIZE / 2,
        backgroundColor: Brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Brand.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 14,
        elevation: 10,
    },
    nextBtnWide: {
        width: BTN_WIDE,
        borderRadius: BTN_SIZE / 2,
    },
    nextBtnText: {
        color: '#FFFFFF',
        fontFamily: FontFamily.extraBold,
        fontSize: isTV
            ? clamp(tvScale(22), 14, 26)
            : clamp(scale(15), 13, 18),
        letterSpacing: 0.3,
    },
    arrowWrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowTriangle: {
        width: 0,
        height: 0,
        borderTopWidth: isTV ? 14 : 10,
        borderBottomWidth: isTV ? 14 : 10,
        borderLeftWidth: isTV ? 22 : 17,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: '#FFFFFF',
        marginLeft: 4,
    },
    arrowTriangleRTL: {
        borderLeftWidth: 0,
        borderRightWidth: isTV ? 22 : 17,
        borderRightColor: '#FFFFFF',
        marginLeft: 0,
        marginRight: 4,
    },

    // ── Tagline
    tagline: {
        textAlign: 'center',
        fontFamily: FontFamily.light,
        fontSize: isTV
            ? clamp(tvScale(16), 10, 20)
            : clamp(scale(11), 9, 13),
        letterSpacing: 1.5,
        paddingBottom: isTV ? 20 : 8,
    },
});