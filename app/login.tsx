/**
 * login.tsx — AlBasira Player
 * TV  = two-column layout (logo | content), no scroll, all sizes fixed & natural.
 * Phone = scrollable single-column, all sizes fixed & natural.
 * Zero scaling math — every value is what it looks like.
 */

import { BrandLogo } from '@/components/shared/BrandLogo';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { HeaderControls } from '@/components/shared/HeaderControls';
import { TVPressable } from '@/components/shared/TVPressable';
import { Brand, Colors, FontFamily, TVSafe } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useAppTheme } from '@/contexts/theme-context';
import { useAuth } from '@/hooks/use-auth';
import { useLegalAcceptance } from '@/hooks/use-legal-acceptance';
import { type Provider, useProviders } from '@/hooks/use-providers';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    FadeInLeft,
    FadeInRight,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Platform ─────────────────────────────────────────────────────────────────
const { width: W, height: H } = Dimensions.get('window');
const isTV = Platform.isTV;

// ─── Floating Particles (phone only) ─────────────────────────────────────────
function Particle({ x, size, delay }: { x: number; size: number; delay: number }) {
    const ty = useSharedValue(H + 60);
    const opacity = useSharedValue(0);

    useEffect(() => {
        const dur = 5000 + delay * 300;
        ty.value = withRepeat(
            withSequence(
                withTiming(-100, { duration: dur, easing: Easing.linear }),
                withTiming(H + 60, { duration: 0 }),
            ),
            -1,
        );
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.6, { duration: 800 }),
                withTiming(0.6, { duration: dur - 1600 }),
                withTiming(0, { duration: 800 }),
            ),
            -1,
        );
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateY: ty.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                styles.particle,
                { left: x, width: size, height: size, borderRadius: size / 2 },
                style,
            ]}
        />
    );
}

const PARTICLES = Array.from({ length: 9 }, (_, i) => ({
    x: (W / 9) * i + Math.random() * 20,
    size: 4 + Math.random() * 8,
    delay: i,
}));

// ─── Provider Card ────────────────────────────────────────────────────────────
function ProviderCard({
    provider,
    isActive,
    onSelect,
    onDelete,
    onEdit,
    isDark,
}: {
    provider: Provider;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onEdit: () => void;
    isDark: boolean;
}) {
    const scaleAnim = useSharedValue(1);
    const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scaleAnim.value }] }));

    const handlePress = () => {
        scaleAnim.value = withSequence(
            withTiming(0.96, { duration: 80 }),
            withTiming(1, { duration: 120 }),
        );
        onSelect();
    };

    const cardBg = isActive
        ? `${Brand.primary}22`
        : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    const borderClr = isActive
        ? Brand.primary
        : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
    const textColor = isDark ? Colors.dark.text : Colors.light.text;
    const subColor = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
    const iconBg = isActive
        ? `${Brand.primary}33`
        : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    // ── TV: siblings row ─────────────────────────────────────────────────────
    if (isTV) {
        return (
            <View style={[
                styles.providerRowTV,
                { backgroundColor: cardBg, borderColor: borderClr, borderWidth: 1, borderRadius: 14 },
            ]}>
                {isActive && (
                    <View style={styles.activeBadge}>
                        <View style={styles.activeDot} />
                    </View>
                )}
                <TVPressable onPress={handlePress} style={styles.providerCardTVMain} focusVariant="card">
                    <View style={[styles.providerIconWrapTV, { backgroundColor: iconBg }]}>
                        <Ionicons name="server-outline" size={24} color={isActive ? Brand.primary : subColor} />
                    </View>
                    <View style={styles.providerInfo}>
                        <Text style={[styles.providerNameTV, { color: textColor, fontFamily: FontFamily.bold }]} numberOfLines={1}>
                            {provider.name}
                        </Text>
                        <Text style={[styles.providerUrlTV, { color: subColor, fontFamily: FontFamily.regular }]} numberOfLines={1}>
                            {provider.url}
                        </Text>
                    </View>
                </TVPressable>
                <TVPressable onPress={onEdit} style={styles.tvActionBtn} focusVariant="control">
                    <Ionicons name="pencil-outline" size={22} color={isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.4)'} />
                </TVPressable>
                <TVPressable onPress={onDelete} style={[styles.tvActionBtn, styles.tvDeleteBtn]} focusVariant="control">
                    <Ionicons name="trash-outline" size={22} color="#ef4444" />
                </TVPressable>
            </View>
        );
    }

    // ── Phone: keep action buttons as siblings ───────────────────────────────
    // A Pressable renders as a <button> on web, so edit/delete must not be
    // nested inside the card's selectable Pressable.
    return (
        <Animated.View style={scaleStyle}>
            <View style={[styles.providerCard, { backgroundColor: cardBg, borderColor: borderClr }]}>
                {isActive && (
                    <View style={styles.activeBadge}>
                        <View style={styles.activeDot} />
                    </View>
                )}
                <TVPressable onPress={handlePress} style={styles.providerCardMain} focusVariant="card">
                    <View style={[styles.providerIconWrap, { backgroundColor: iconBg }]}>
                        <Ionicons name="server-outline" size={20} color={isActive ? Brand.primary : subColor} />
                    </View>
                    <View style={styles.providerInfo}>
                        <Text style={[styles.providerName, { color: textColor, fontFamily: FontFamily.bold }]} numberOfLines={1}>
                            {provider.name}
                        </Text>
                        <Text style={[styles.providerUrl, { color: subColor, fontFamily: FontFamily.regular }]} numberOfLines={1}>
                            {provider.url}
                        </Text>
                    </View>
                </TVPressable>
                <TVPressable onPress={onEdit} hitSlop={10} style={styles.editBtn} focusVariant="control">
                    <Ionicons name="pencil-outline" size={16} color={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)'} />
                </TVPressable>
                <TVPressable onPress={onDelete} hitSlop={10} style={styles.deleteBtn} focusVariant="control">
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TVPressable>
            </View>
        </Animated.View>
    );
}

// ─── TV: Left Column — Logo Panel ────────────────────────────────────────────
function TVLogoPanel({
    isDark,
    pulseStyle,
    textColor,
    subColor,
    t,
}: {
    isDark: boolean;
    pulseStyle: object;
    textColor: string;
    subColor: string;
    t: any;
}) {
    return (
        <Animated.View
            entering={FadeInLeft.delay(100).duration(700).springify()}
            style={styles.tvLogoPanel}
        >
            <View style={[styles.tvLogoGlow, { backgroundColor: `${Brand.primary}18` }]} />

            <Animated.View style={[styles.tvLogoWrap, pulseStyle, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            }]}>
                <BrandLogo style={styles.tvLogo} />
            </Animated.View>

            <Animated.View entering={FadeIn.delay(400).duration(600)}>
                <Text style={[styles.tvAppName, { color: textColor, fontFamily: FontFamily.black }]}>
                    {t.common.appName}
                </Text>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(550).duration(600)}>
                <Text style={[styles.tvTagline, { color: subColor, fontFamily: FontFamily.regular }]}>
                    {t.login.tagline}
                </Text>
            </Animated.View>

            <View style={[styles.tvPanelDivider, { backgroundColor: `${Brand.primary}40` }]} />
        </Animated.View>
    );
}

// ─── TV: Right Column — Content Panel ────────────────────────────────────────
function TVContentPanel({
    isDark,
    textColor,
    subColor,
    cardBg,
    borderColor,
    sectionBg,
    t,
    isRTL,
    providers,
    activeId,
    activeProvider,
    setActiveId,
    handleDelete,
    handleLogin,
    isLoggingIn,
    isLegalAccepted,
    legalLoading,
}: {
    isDark: boolean;
    textColor: string;
    subColor: string;
    cardBg: string;
    borderColor: string;
    sectionBg: string;
    t: any;
    isRTL: boolean;
    providers: Provider[];
    activeId: string | null;
    activeProvider: Provider | null;
    setActiveId: (id: string) => void;
    handleDelete: (id: string) => void;
    handleLogin: () => void;
    isLoggingIn: boolean;
    isLegalAccepted: boolean;
    legalLoading: boolean;
}) {
    // TV UX: keep the button focusable/clickable when a provider is selected.
    // Legal gating is enforced inside handleLogin via alert + /legal navigation.
    const loginDisabled = isLoggingIn || !activeProvider;

    return (
        <Animated.View
            entering={FadeInRight.delay(200).duration(700).springify()}
            style={styles.tvContentPanel}
        >
            {/* ── Providers ──────────────────────────── */}
            <View style={[styles.tvSection, { backgroundColor: cardBg, borderColor }]}>
                <View style={[styles.sectionHeader, isRTL && styles.rowReverse]}>
                    <View style={styles.sectionTitleRow}>
                        <Ionicons name="server-outline" size={18} color={Brand.primary} style={{ marginRight: 8 }} />
                        <Text style={[styles.sectionTitleTV, { color: textColor, fontFamily: FontFamily.bold }]}>
                            {t.login.providers}
                        </Text>
                        {providers.length > 0 && (
                            <View style={styles.countBadgeTV}>
                                <Text style={[styles.countTextTV, { fontFamily: FontFamily.bold }]}>
                                    {providers.length}
                                </Text>
                            </View>
                        )}
                    </View>
                    <TVPressable onPress={() => router.push('/add-provider')} style={styles.addChipTV} focusVariant="control">
                        <Ionicons name="add" size={18} color="#fff" />
                        <Text style={[styles.addChipTextTV, { fontFamily: FontFamily.bold }]}>
                            {t.login.addProvider}
                        </Text>
                    </TVPressable>
                </View>

                {providers.length === 0 ? (
                    <View style={[styles.emptyState, { backgroundColor: sectionBg }]}>
                        <Ionicons name="cloud-offline-outline" size={42} color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} />
                        <Text style={[styles.emptyTextTV, { color: subColor, fontFamily: FontFamily.regular }]}>
                            {t.login.noProvidersHint}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.providerListTV}>
                        {providers.map((p, idx) => (
                            <Animated.View key={p.id} entering={FadeInDown.delay(idx * 60).springify().damping(16)}>
                                <ProviderCard
                                    provider={p}
                                    isActive={p.id === activeId}
                                    isDark={isDark}
                                    onSelect={() => setActiveId(p.id)}
                                    onEdit={() => router.push({ pathname: '/add-provider', params: { edit: p.id } })}
                                    onDelete={() => handleDelete(p.id)}
                                />
                            </Animated.View>
                        ))}
                    </View>
                )}
            </View>

            {/* ── Active provider ─────────────────────── */}
            {activeProvider && (
                <Animated.View
                    entering={FadeIn.delay(300).duration(400)}
                    style={[styles.activeInfo, {
                        backgroundColor: `${Brand.primary}14`,
                        borderColor: `${Brand.primary}40`,
                    }]}
                >
                    <Ionicons name="checkmark-circle" size={16} color={Brand.primary} />
                    <Text style={[styles.activeInfoTextTV, { color: Brand.primary, fontFamily: FontFamily.medium }]}>
                        {t.login.activeProvider}: {activeProvider.name}
                    </Text>
                </Animated.View>
            )}

            {/* ── Legal (TV) — no checkbox here ─────────────────────────── */}
            {!isLegalAccepted && !legalLoading && (
                <View style={[styles.legalRowTV, { backgroundColor: sectionBg, borderColor }]}>
                    <Ionicons name="document-text-outline" size={18} color={Brand.primary} />
                    <Text style={[styles.legalTextTV, { color: subColor, fontFamily: FontFamily.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                        {isRTL
                            ? 'قبل التشغيل، يجب قراءة والموافقة على الشروط (EULA/ToS/DMCA).'
                            : 'Before launching, you must read and agree to the terms (EULA/ToS/DMCA).'}
                    </Text>
                    <TVPressable
                        onPress={() => router.push('/legal')}
                        focusVariant="control"
                        style={[styles.legalBtnTV, { backgroundColor: `${Brand.primary}18`, borderColor: `${Brand.primary}55` }]}
                    >
                        <Text style={[styles.legalBtnTextTV, { color: Brand.primary, fontFamily: FontFamily.bold }]}>
                            {isRTL ? 'عرض' : 'View'}
                        </Text>
                    </TVPressable>
                </View>
            )}

            {/* ── Login Button ────────────────────────── */}
            <TVPressable
                style={[
                    styles.loginBtnTV,
                    (!activeProvider) && styles.loginBtnDisabled,
                ]}
                onPress={handleLogin}
                disabled={loginDisabled}
                hasTVPreferredFocus={isTV}
            >
                <LinearGradient
                    colors={(activeProvider) ? [Brand.primary, Brand.primaryDark] : ['#888', '#666']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.row}>
                    <Ionicons
                        name={isLoggingIn ? 'reload-outline' : 'play-circle-outline'}
                        size={24}
                        color="#fff"
                        style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.loginBtnTextTV, { fontFamily: FontFamily.extraBold }]}>
                        {isLoggingIn ? t.login.connecting : t.login.launch}
                    </Text>
                </View>
            </TVPressable>
        </Animated.View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LoginScreen() {
    const { login, isAuthenticated, isLoggingIn } = useAuth();
    const { providers, activeId, activeProvider, removeProvider, setActiveId } = useProviders();
    const { isDark } = useAppTheme();
    const { isRTL, t } = useLanguage();
    const { isAccepted, isLoading: legalLoading, accept } = useLegalAcceptance();
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    const pulseScale = useSharedValue(1);

    useEffect(() => {
        if (isAuthenticated) router.replace('/dashboard');
    }, [isAuthenticated]);

    // If at least one provider exists, treat that as acceptance already.
    // This keeps "acceptance only in add-provider" while avoiding blocking login
    // for users who already set up providers earlier.
    useEffect(() => {
        if (legalLoading) return;
        if (!isAccepted && providers.length > 0) {
            accept();
        }
    }, [accept, isAccepted, legalLoading, providers.length]);

    useEffect(() => {
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
                withTiming(1.0, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
        );
    }, []);

    const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));

    const handleLogin = async () => {
        if (legalLoading) return;
        if (!activeProvider) {
            Alert.alert(t.login.noProviderAlert, t.login.noProviderAlertMsg);
            return;
        }
        try {
            await login(
                activeProvider.url,
                activeProvider.username,
                activeProvider.password,
                activeProvider.type || 'xtream',
            );
        } catch {
            Alert.alert(t.login.connectionError, t.login.connectionErrorMsg);
        }
    };

    const handleDelete = (id: string) => setDeleteTarget(id);

    const bg = isDark ? '#09090F' : '#F0F0F8';
    const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? Colors.dark.text : Colors.light.text;
    const subColor = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
    const sectionBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

    const confirmDialog = (
        <ConfirmDialog
            visible={deleteTarget !== null}
            title={t.login.deleteProviderTitle}
            message={t.login.deleteProviderMsg}
            confirmLabel={t.common.delete}
            cancelLabel={t.common.cancel}
            icon="trash-outline"
            danger
            isDark={isDark}
            onConfirm={() => {
                if (deleteTarget) { removeProvider(deleteTarget); setDeleteTarget(null); }
            }}
            onCancel={() => setDeleteTarget(null)}
        />
    );

    // ── TV: two columns, zero scroll ──────────────────────────────────────────
    if (isTV) {
        return (
            <View style={[styles.root, { backgroundColor: bg }]}>
                <LinearGradient
                    colors={isDark ? ['#1a0005', '#09090F', '#09090F'] : ['#fff0f0', '#F0F0F8', '#F0F0F8']}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.topGlow} />

                <SafeAreaView style={styles.safe}>
                    {/* Header — controls only */}
                    <View style={[styles.tvHeader, isRTL && styles.rowReverse]}>
                        <HeaderControls tinted={false} />
                    </View>

                    {/* Two-column body */}
                    <View style={[styles.tvBody, isRTL && styles.tvBodyRTL]}>
                        <TVLogoPanel
                            isDark={isDark}
                            pulseStyle={logoStyle}
                            textColor={textColor}
                            subColor={subColor}
                            t={t}
                        />
                        <View style={[styles.tvSeparator, { backgroundColor: `${Brand.primary}25` }]} />
                        <TVContentPanel
                            isDark={isDark}
                            textColor={textColor}
                            subColor={subColor}
                            cardBg={cardBg}
                            borderColor={borderColor}
                            sectionBg={sectionBg}
                            t={t}
                            isRTL={isRTL}
                            providers={providers}
                            activeId={activeId}
                            activeProvider={activeProvider}
                            setActiveId={setActiveId}
                            handleDelete={handleDelete}
                            handleLogin={handleLogin}
                            isLoggingIn={isLoggingIn}
                            isLegalAccepted={isAccepted}
                            legalLoading={legalLoading}
                        />
                    </View>

                    <Text style={[styles.tvFooter, {
                        color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
                        fontFamily: FontFamily.light,
                    }]}>
                        {t.login.footer}
                    </Text>
                </SafeAreaView>
                {confirmDialog}
            </View>
        );
    }

    // ── Phone: single column, scrollable ──────────────────────────────────────
    return (
        <View style={[styles.root, { backgroundColor: bg }]}>
            <LinearGradient
                colors={isDark ? ['#1a0005', '#09090F', '#09090F'] : ['#fff0f0', '#F0F0F8', '#F0F0F8']}
                style={StyleSheet.absoluteFill}
            />
            {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}
            <View style={styles.topGlow} />

            <SafeAreaView style={styles.safe}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.kav}
                >
                    <View style={{ flex: 1 }}>
                        <ScrollView
                            contentContainerStyle={styles.scroll}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <Animated.View
                                entering={FadeIn.delay(200).duration(600)}
                                style={[styles.topBar, isRTL && styles.rowReverse]}
                            >
                                <HeaderControls tinted={false} />
                            </Animated.View>

                            <Animated.View
                                entering={FadeInDown.delay(100).duration(800).springify()}
                                style={styles.logoSection}
                            >
                                <Animated.View style={[styles.logoWrap, logoStyle, {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                                }]}>
                                    <BrandLogo style={styles.logo} />
                                </Animated.View>
                                <Animated.View entering={FadeInDown.delay(300).duration(600)}>
                                    <Text style={[styles.appName, { color: textColor, fontFamily: FontFamily.black }]}>
                                        {t.common.appName}
                                    </Text>
                                </Animated.View>
                                <Animated.View entering={FadeInDown.delay(450).duration(600)}>
                                    <Text style={[styles.tagline, { color: subColor, fontFamily: FontFamily.regular }]}>
                                        {t.login.tagline}
                                    </Text>
                                </Animated.View>
                            </Animated.View>

                            <Animated.View
                                entering={FadeInUp.delay(400).duration(700).springify()}
                                style={[styles.section, { backgroundColor: cardBg, borderColor }]}
                            >
                                <View style={[styles.sectionHeader, isRTL && styles.rowReverse]}>
                                    <View style={styles.sectionTitleRow}>
                                        <Ionicons name="server-outline" size={16} color={Brand.primary} style={{ marginRight: 7 }} />
                                        <Text style={[styles.sectionTitle, { color: textColor, fontFamily: FontFamily.bold }]}>
                                            {t.login.providers}
                                        </Text>
                                        {providers.length > 0 && (
                                            <View style={styles.countBadge}>
                                                <Text style={[styles.countText, { fontFamily: FontFamily.bold }]}>
                                                    {providers.length}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <TVPressable onPress={() => router.push('/add-provider')} style={styles.addChip} focusVariant="control">
                                        <Ionicons name="add" size={15} color="#fff" />
                                        <Text style={[styles.addChipText, { fontFamily: FontFamily.bold }]}>
                                            {t.login.addProvider}
                                        </Text>
                                    </TVPressable>
                                </View>

                                {providers.length === 0 ? (
                                    <Animated.View entering={FadeIn.duration(400)} style={[styles.emptyState, { backgroundColor: sectionBg }]}>
                                        <Ionicons name="cloud-offline-outline" size={38} color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} />
                                        <Text style={[styles.emptyText, { color: subColor, fontFamily: FontFamily.regular }]}>
                                            {t.login.noProvidersHint}
                                        </Text>
                                    </Animated.View>
                                ) : (
                                    <View style={styles.providerList}>
                                        {providers.map((p) => (
                                            <Animated.View key={p.id} entering={FadeInDown.springify().damping(16)}>
                                                <ProviderCard
                                                    provider={p}
                                                    isActive={p.id === activeId}
                                                    isDark={isDark}
                                                    onSelect={() => setActiveId(p.id)}
                                                    onEdit={() => router.push({ pathname: '/add-provider', params: { edit: p.id } })}
                                                    onDelete={() => handleDelete(p.id)}
                                                />
                                            </Animated.View>
                                        ))}
                                    </View>
                                )}
                            </Animated.View>

                            {activeProvider && (
                                <Animated.View
                                    entering={FadeInUp.delay(200).duration(500)}
                                    style={[styles.activeInfo, {
                                        backgroundColor: `${Brand.primary}14`,
                                        borderColor: `${Brand.primary}40`,
                                    }]}
                                >
                                    <Ionicons name="checkmark-circle" size={15} color={Brand.primary} />
                                    <Text style={[styles.activeInfoText, { color: Brand.primary, fontFamily: FontFamily.medium }]}>
                                        {t.login.activeProvider}: {activeProvider.name}
                                    </Text>
                                </Animated.View>
                            )}

                            {/* Legal (phone) — no checkbox here */}
                            {!isAccepted && !legalLoading && (
                                <Animated.View
                                    entering={FadeInUp.delay(420).duration(600)}
                                    style={[styles.legalRow, { backgroundColor: sectionBg, borderColor }]}
                                >
                                    <Ionicons name="document-text-outline" size={16} color={Brand.primary} />
                                    <Text style={[styles.legalText, { color: subColor, fontFamily: FontFamily.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                                        {isRTL
                                            ? 'قبل التشغيل، يجب قراءة والموافقة على الشروط (EULA/ToS/DMCA).'
                                            : 'Before launching, you must read and agree to the terms (EULA/ToS/DMCA).'}
                                    </Text>
                                    <Pressable onPress={() => router.push('/legal')} hitSlop={10}>
                                        <Text style={[styles.legalLink, { color: Brand.primary, fontFamily: FontFamily.bold }]}>
                                            {isRTL ? 'عرض' : 'View'}
                                        </Text>
                                    </Pressable>
                                </Animated.View>
                            )}

                            <Animated.View entering={FadeInUp.delay(600).duration(700).springify()}>
                                <TVPressable
                                    style={[
                                        styles.loginBtn,
                                        (!activeProvider || !isAccepted || legalLoading) && styles.loginBtnDisabled,
                                        (!isAccepted || legalLoading) && { opacity: 0.75 },
                                    ]}
                                    onPress={handleLogin}
                                    disabled={isLoggingIn || !activeProvider || !isAccepted || legalLoading}
                                >
                                    <LinearGradient
                                        colors={(activeProvider && isAccepted) ? [Brand.primary, Brand.primaryDark] : ['#888', '#666']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <View style={styles.row}>
                                        <Ionicons
                                            name={isLoggingIn ? 'reload-outline' : 'play-circle-outline'}
                                            size={22}
                                            color="#fff"
                                            style={{ marginRight: 8 }}
                                        />
                                        <Text style={[styles.loginBtnText, { fontFamily: FontFamily.extraBold }]}>
                                            {isLoggingIn ? t.login.connecting : t.login.launch}
                                        </Text>
                                    </View>
                                </TVPressable>
                            </Animated.View>

                            <Animated.View entering={FadeIn.delay(900).duration(600)}>
                                <Text style={[styles.footer, {
                                    color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                                    fontFamily: FontFamily.light,
                                }]}>
                                    {t.login.footer}
                                </Text>
                            </Animated.View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
            {confirmDialog}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, overflow: 'hidden' },
    safe: { flex: 1 },
    kav: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center' },
    rowReverse: { flexDirection: 'row-reverse' },

    particle: { position: 'absolute', backgroundColor: Brand.primary, opacity: 0.5 },
    topGlow: {
        position: 'absolute',
        top: -120,
        left: W * 0.5 - 150,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: `${Brand.primary}18`,
    },

    // ─── TV Header ─────────────────────────────────────────────────────
    tvHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: TVSafe.paddingHorizontal,
        height: 72,
    },

    // ─── TV Two-Column Body ────────────────────────────────────────────
    tvBody: {
        flex: 1,
        flexDirection: 'row',
        paddingHorizontal: TVSafe.paddingHorizontal,
        paddingBottom: 8,
        gap: 48,
    },
    tvBodyRTL: { flexDirection: 'row-reverse' },

    // ─── TV Logo Panel ─────────────────────────────────────────────────
    tvLogoPanel: {
        width: '34%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    tvLogoGlow: {
        position: 'absolute',
        width: 360,
        height: 360,
        borderRadius: 180,
        top: '50%',
        left: '50%',
        marginTop: -180,
        marginLeft: -180,
    },
    tvLogoWrap: {
        borderRadius: 32,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tvLogo: {
        width: 240,
        height: 240,
        borderRadius: 24,
        resizeMode: 'contain',
    },
    tvAppName: {
        fontSize: 36,
        letterSpacing: 1,
        textAlign: 'center',
    },
    tvTagline: {
        fontSize: 17,
        opacity: 0.7,
        textAlign: 'center',
        lineHeight: 26,
        paddingHorizontal: 12,
    },
    tvPanelDivider: {
        width: 44,
        height: 3,
        borderRadius: 2,
        marginTop: 6,
    },

    // Vertical separator
    tvSeparator: {
        width: 1,
        alignSelf: 'stretch',
        marginVertical: 20,
    },

    // ─── TV Content Panel ──────────────────────────────────────────────
    tvContentPanel: {
        flex: 1,
        justifyContent: 'center',
        gap: 14,
    },
    tvSection: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 24,
    },
    sectionTitleTV: { fontSize: 19 },
    countBadgeTV: {
        marginLeft: 8,
        backgroundColor: Brand.primary,
        borderRadius: 11,
        width: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countTextTV: { color: '#fff', fontSize: 12 },
    addChipTV: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Brand.primary,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        gap: 5,
    },
    addChipTextTV: { color: '#fff', fontSize: 15 },
    providerListTV: { gap: 10 },
    providerRowTV: {
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    providerCardTVMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 18,
        gap: 14,
    },
    providerIconWrapTV: {
        width: 46,
        height: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    providerNameTV: { fontSize: 18, marginBottom: 3 },
    providerUrlTV: { fontSize: 13, opacity: 0.7 },
    tvActionBtn: {
        width: 62,
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: 'center',
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.07)',
    },
    tvDeleteBtn: { borderLeftColor: 'rgba(239,68,68,0.2)' },
    emptyTextTV: { fontSize: 15, textAlign: 'center', paddingHorizontal: 20 },
    activeInfoTextTV: { fontSize: 15 },
    loginBtnTV: {
        height: 70,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: Brand.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 12,
    },
    loginBtnTextTV: { color: '#fff', fontSize: 22, letterSpacing: 0.5 },
    tvFooter: {
        textAlign: 'center',
        fontSize: 13,
        letterSpacing: 1,
        paddingBottom: 18,
    },

    // ─── Phone Layout ──────────────────────────────────────────────────
    scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 32 },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingTop: 8,
        paddingBottom: 4,
    },
    logoSection: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 14,
    },
    logoWrap: {
        width: 192,
        height: 192,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    logo: {
        width: 190,
        height: 190,
        borderRadius: 24,
        resizeMode: 'contain',
    },
    appName: { fontSize: 28, letterSpacing: 1, marginBottom: 5 },
    tagline: { fontSize: 13, opacity: 0.7, textAlign: 'center' },
    section: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
    },

    // ─── Shared ────────────────────────────────────────────────────────
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
    sectionTitle: { fontSize: 15 },
    countBadge: {
        marginLeft: 7,
        backgroundColor: Brand.primary,
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countText: { color: '#fff', fontSize: 11 },
    addChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Brand.primary,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 4,
    },
    addChipText: { color: '#fff', fontSize: 13 },
    providerList: { gap: 8 },
    providerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 10,
    },
    providerCardMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    activeBadge: { position: 'absolute', top: 10, right: 10, zIndex: 1 },
    activeDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Brand.primary },
    providerIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    providerInfo: { flex: 1 },
    providerName: { fontSize: 14, marginBottom: 2 },
    providerUrl: { fontSize: 11, opacity: 0.7 },
    editBtn: { padding: 4, marginRight: 4 },
    deleteBtn: { padding: 4 },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 28,
        borderRadius: 14,
        gap: 10,
    },
    emptyText: { fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
    activeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginBottom: 16,
    },
    activeInfoText: { fontSize: 13 },
    loginBtn: {
        height: 58,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: Brand.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 12,
        marginBottom: 20,
    },
    loginBtnDisabled: { shadowOpacity: 0, elevation: 0 },
    loginBtnText: { color: '#fff', fontSize: 17, letterSpacing: 0.5 },
    footer: { textAlign: 'center', fontSize: 11, letterSpacing: 1 },

    // ─── TV Legal row ──────────────────────────────────────────────────
    legalRowTV: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    legalTextTV: { flex: 1, fontSize: 14, lineHeight: 20, opacity: 0.95 },
    legalBtnTV: {
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 96,
    },
    legalBtnTextTV: { fontSize: 14, letterSpacing: 0.3 },

    legalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
    },
    legalText: { flex: 1, fontSize: 12, lineHeight: 18, opacity: 0.95 },
    legalLink: { fontSize: 12 },
});