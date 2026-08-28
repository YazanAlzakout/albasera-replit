/**
 * dashboard.tsx — AlBasira Player Premium Home
 * Quick Actions, Browse, Continue Watching, Featured Content.
 * Account, activity stats, and server info live in Settings.
 */

import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { HeaderControls } from '@/components/shared/HeaderControls';
import { TVPressable } from '@/components/shared/TVPressable';
import { TVColumn, TVRow, TVScrollView } from '@/components/tv/SpatialWrappers';
import { Brand, Colors, FontFamily, TVSafe } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useSettings } from '@/contexts/settings-context';
import { useAppTheme } from '@/contexts/theme-context';
import { useAuth } from '@/hooks/use-auth';
import { useProviders } from '@/hooks/use-providers';
import { useWatchLibrarySnapshot } from '@/hooks/use-watch-library-snapshot';
import { WatchedItem, watchHistoryService } from '@/services/watch-history-service';
import { xtreamService, XtreamStream } from '@/services/xtream-service';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    ToastAndroid,
    useWindowDimensions,
    View
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const isTV = Platform.isTV;
const tv = (m: number, t: number) => (isTV ? t : m);
const TV_H_PAD = TVSafe.paddingHorizontal;

// ─── Time Ago Helper ──────────────────────────────────────────────────────────
function timeAgo(ts: number, isAr: boolean): string {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return isAr ? 'الآن' : 'Just now';
    if (diff < 3600) {
        const m = Math.floor(diff / 60);
        return isAr ? `${m} د` : `${m}m ago`;
    }
    if (diff < 86400) {
        const h = Math.floor(diff / 3600);
        return isAr ? `${h} س` : `${h}h ago`;
    }
    const d = Math.floor(diff / 86400);
    return isAr ? `${d} ي` : `${d}d ago`;
}

// ─── Quick-nav Section Card ───────────────────────────────────────────────────
interface NavCardProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    count: number;
    accentColor: string;
    gradientColors: [string, string];
    onPress: () => void;
    delay: number;
    isDark: boolean;
    preferredFocus?: boolean;
    width: number;
}

function NavCard({ icon, label, count, accentColor, gradientColors, onPress, delay, isDark, preferredFocus, width }: NavCardProps) {
    const scale = useSharedValue(1);
    const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    const handlePress = () => {
        scale.value = withSpring(0.93, { damping: 12 }, () => { scale.value = withSpring(1); });
        onPress();
    };

    return (
        <Animated.View entering={FadeInDown.delay(delay).duration(600).springify()} style={isTV && { flex: 1 }}>
            <Animated.View style={scaleStyle}>
                <TVPressable onPress={handlePress} hasTVPreferredFocus={preferredFocus} style={[
                    styles.navCard, isTV ? { flex: 1 } : { width },
                ]}>
                    <LinearGradient
                        colors={gradientColors}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={[styles.navGlow, { backgroundColor: accentColor }]} />
                    <View style={[styles.navIconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                        <Ionicons name={icon} size={tv(24, 32)} color="#fff" />
                    </View>
                    <Text style={[styles.navCount, { fontFamily: FontFamily.black }]}>{count > 0 ? count : '—'}</Text>
                    <Text style={[styles.navLabel, { fontFamily: FontFamily.medium }]} numberOfLines={1}>{label}</Text>
                </TVPressable>
            </Animated.View>
        </Animated.View>
    );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, onViewAll, isDark, isRTL, rightAction }: {
    title: string; onViewAll?: () => void; isDark: boolean; isRTL: boolean; rightAction?: React.ReactNode;
}) {
    const textColor = isDark ? Colors.dark.text : Colors.light.text;
    return (
        <View style={[styles.sectionHeader, isRTL && styles.rowReverse]}>
            <View style={[styles.accentBar, !isRTL && { marginRight: 8 }, isRTL && { marginLeft: 8 }]} />
            <Text style={[styles.sectionTitle, { color: textColor, fontFamily: FontFamily.bold, flex: 1, textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
            {rightAction}
            {onViewAll && (
                <TVPressable onPress={onViewAll} focusVariant="control">
                    <Text style={[styles.viewAll, { fontFamily: FontFamily.medium }]}>
                        {isRTL ? 'عرض الكل' : 'See All'}
                    </Text>
                </TVPressable>
            )}
        </View>
    );
}

// ─── Continue Watching Card ───────────────────────────────────────────────────
function ContinueCard({ item, isDark, isRTL, onPress }: {
    item: WatchedItem; isDark: boolean; isRTL: boolean; onPress: () => void;
}) {
    const scale = useSharedValue(1);
    const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const [imgErr, setImgErr] = useState(false);
    const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textC = isDark ? Colors.dark.text : Colors.light.text;
    const subC = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;

    const handlePress = () => {
        scale.value = withSpring(0.95, { damping: 12 }, () => { scale.value = withSpring(1); });
        onPress();
    };

    const typeIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
        live: 'radio-outline',
        movie: 'film-outline',
        series: 'play-circle-outline',
    };

    const typeLabel: Record<string, string> = {
        live: 'LIVE',
        movie: 'MOV',
        series: 'SER',
    };

    return (
        <Animated.View style={scaleStyle}>
            <TVPressable onPress={handlePress} style={[
                styles.continueCard, { backgroundColor: cardBg, borderColor: border },
            ]}>
                {/* Thumbnail */}
                <View style={styles.continueThumb}>
                    {!!item.cover && !imgErr ? (
                        <Image source={{ uri: item.cover }} style={styles.continueImg} contentFit="cover" cachePolicy="disk" transition={200} onError={() => setImgErr(true)} />
                    ) : (
                        <View style={[styles.continueImg, { backgroundColor: isDark ? '#1C1C28' : '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}>
                            <Ionicons name={typeIcon[item.type] ?? 'play-outline'} size={tv(28, 36)} color={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} />
                        </View>
                    )}
                    {/* Play overlay */}
                    <View style={styles.continuePlayOverlay}>
                        <View style={styles.continuePlayCircle}>
                            <Ionicons name="play" size={tv(14, 20)} color="#fff" />
                        </View>
                    </View>
                    {/* Type badge */}
                    <View style={styles.continueTypeBadge}>
                        <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800', letterSpacing: 0.5 }}>{typeLabel[item.type] ?? '?'}</Text>
                    </View>
                </View>
                {/* Progress bar */}
                {item.progress != null && item.progress > 0 && (
                    <View style={[styles.progressBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                        <View style={[styles.progressFill, { width: `${Math.min(100, item.progress)}%` }]} />
                    </View>
                )}
                {/* Name */}
                <Text style={[styles.continueName, { color: textC, fontFamily: FontFamily.bold }]} numberOfLines={1}>{item.name}</Text>
                {/* Time ago */}
                <Text style={[styles.continueEp, { color: subC, fontFamily: FontFamily.regular }]} numberOfLines={1}>
                    {item.episode ? `${item.episode} · ` : ''}{timeAgo(item.timestamp, isRTL)}
                </Text>
            </TVPressable>
        </Animated.View>
    );
}

// ─── Featured Banner Card ─────────────────────────────────────────────────────
function FeaturedCard({ item, isDark, onPress }: {
    item: XtreamStream; isDark: boolean; onPress: () => void;
}) {
    const scale = useSharedValue(1);
    const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const [imgErr, setImgErr] = useState(false);
    const coverUrl = item.stream_icon || (item as any).cover || '';

    const handlePress = () => {
        scale.value = withSpring(0.96, { damping: 12 }, () => { scale.value = withSpring(1); });
        onPress();
    };

    const rating = (item as any).rating ?? (item as any).rate;

    return (
        <Animated.View style={scaleStyle}>
            <TVPressable onPress={handlePress} style={styles.featuredCard}>
                {coverUrl && !imgErr ? (
                    <Image source={{ uri: coverUrl }} style={styles.featuredImg} contentFit="cover" cachePolicy="disk" transition={200} onError={() => setImgErr(true)} />
                ) : (
                    <LinearGradient colors={['#1C1C28', '#09090F']} style={styles.featuredImg} />
                )}
                {/* Gradient overlay */}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                    style={styles.featuredGradient}
                />
                {/* Info */}
                <View style={styles.featuredInfo}>
                    <Text style={[styles.featuredName, { fontFamily: FontFamily.black }]} numberOfLines={2}>{item.name}</Text>
                    {!!rating && (
                        <View style={styles.featuredRating}>
                            <Ionicons name="star" size={tv(12, 16)} color="#FBBF24" />
                            <Text style={[styles.featuredRatingText, { fontFamily: FontFamily.bold }]}>{parseFloat(String(rating)).toFixed(1)}</Text>
                        </View>
                    )}
                </View>
            </TVPressable>
        </Animated.View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DashboardScreen() {
    const { width: windowWidth } = useWindowDimensions();
    const navCardWidth = isTV
        ? (windowWidth - TV_H_PAD * 2 - 20) / 3
        : Math.max(92, (windowWidth - 60) / 3);

    useFocusEffect(useCallback(() => {
        if (isTV) return undefined;
        void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
        return undefined;
    }, []));
    const { user, logout } = useAuth();
    const { activeProvider } = useProviders();
    const { isDark } = useAppTheme();
    const { isRTL, t } = useLanguage();
    const { hideLive, hideMovies, hideSeries } = useSettings();
    const { history, favCount, watchLaterCount, refresh } = useWatchLibrarySnapshot();
    const [stats, setStats] = useState({ live: 0, vod: 0, series: 0 });
    const [featured, setFeatured] = useState<XtreamStream[]>([]);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);

    const bg = isDark ? '#09090F' : '#F0F0F8';
    const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? Colors.dark.text : Colors.light.text;
    const subColor = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;

    const fetchStats = async () => {
        try {
            // Show real section sizes (stream counts), not category counts.
            const [live, vod, series] = await Promise.all([
                xtreamService.getStreams('live'),
                xtreamService.getStreams('movie'),
                xtreamService.getStreams('series'),
            ]);
            setStats({ live: live.length, vod: vod.length, series: series.length });
        } catch (e) {
            console.warn('Stats fetch error', e);
        }
    };

    const fetchFeatured = async () => {
        try {
            const [movies, series] = await Promise.all([
                xtreamService.getStreams('movie').catch(() => [] as XtreamStream[]),
                xtreamService.getStreams('series').catch(() => [] as XtreamStream[]),
            ]);
            const all = [...movies, ...series].filter(
                s => (s.stream_icon || (s as any).cover) && s.name
            );
            const shuffled = all.sort(() => Math.random() - 0.5).slice(0, 8);
            setFeatured(shuffled);
        } catch (e) {
            console.warn('Featured fetch error', e);
        }
    };

    const loadDashboardData = useCallback(() => {
        void Promise.allSettled([fetchStats(), fetchFeatured()]);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadDashboardData();
        }, [loadDashboardData])
    );

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const handleClearHistory = () => {
        if (history.length === 0) return;
        setShowClearHistoryConfirm(true);
    };

    const doClearHistory = async () => {
        await watchHistoryService.clearHistory();
        await refresh();
        setShowClearHistoryConfirm(false);
        if (Platform.OS === 'android') {
            ToastAndroid.show(isRTL ? 'تم مسح السجل' : 'History cleared', ToastAndroid.SHORT);
        }
    };

    // ─── Quick Action Handlers ────────────────────────────────────────────
    const quickActions = [
        {
            icon: 'heart-outline' as const,
            label: t.dashboard.favorites,
            color: '#ec4899',
            count: favCount,
            onPress: () => router.push('/favorites'),
        },
        {
            icon: 'time-outline' as const,
            label: t.dashboard.watchLater,
            color: '#f59e0b',
            count: watchLaterCount,
            onPress: () => router.push('/watchlater'),
        },
        {
            icon: 'settings-outline' as const,
            label: t.dashboard.settings,
            color: '#8b5cf6',
            onPress: () => {
                router.push('/settings');
            },
        },
    ];

    // Navigate to details from continue watching
    const handleContinuePress = (item: WatchedItem) => {
        router.push({
            pathname: '/details',
            params: {
                streamId: item.id,
                type: item.type,
                extension: item.extension ?? 'mp4',
            },
        });
    };

    // Navigate to details from featured
    const handleFeaturedPress = (item: XtreamStream) => {
        const isSeries = !!(item as any).series_id;
        const streamId = isSeries ? ((item as any).series_id ?? item.stream_id) : item.stream_id;
        router.push({
            pathname: '/details',
            params: {
                streamId: String(streamId),
                type: isSeries ? 'series' : 'movie',
                extension: item.container_extension || 'mp4',
            },
        });
    };

    return (
        <View style={[styles.root, { backgroundColor: bg }]}>
            <LinearGradient
                colors={isDark ? ['#1a0005', '#09090F', '#09090F'] : ['#fff4f4', '#F0F0F8', '#F0F0F8']}
                style={StyleSheet.absoluteFill}
            />
            <View style={[styles.topGlow, { backgroundColor: `${Brand.primary}20`, left: windowWidth * 0.5 - 160 }]} />

            <SafeAreaView style={styles.safe}>
                <ScrollView
                    contentContainerStyle={[styles.scroll, { paddingHorizontal: tv(20, TVSafe.paddingHorizontal) }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ─── Header ───────────────────────────────────────────── */}
                    <Animated.View entering={FadeIn.duration(500)} style={[styles.header, isRTL && styles.rowReverse]}>
                        <View style={[styles.headerLeft, isRTL && { alignItems: 'flex-end' }]}>
                            <Text style={[styles.welcomeText, { color: subColor, fontFamily: FontFamily.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                                {t.dashboard.welcome}
                            </Text>
                            <Text style={[styles.userName, { color: textColor, fontFamily: FontFamily.black, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                                {user?.user_info.username ?? '—'}
                            </Text>
                            {activeProvider && (
                                <View style={styles.providerPill}>
                                    <View style={styles.providerDot} />
                                    <Text style={[styles.providerPillText, { fontFamily: FontFamily.medium }]} numberOfLines={1}>
                                        {activeProvider.name}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.headerRight}>
                            <HeaderControls tinted />
                            <TVPressable onPress={handleLogout} style={styles.logoutBtn} focusVariant="control">
                                <Ionicons name="log-out-outline" size={tv(20, 26)} color={Brand.primary} />
                            </TVPressable>
                        </View>
                    </Animated.View>

                    {/* ─── TV: Quick actions row ─────────────────────────────── */}
                    {isTV && (
                        <View style={styles.tvQuickBlock}>
                            <SectionHeader title={t.dashboard.quickActions} isDark={isDark} isRTL={isRTL} />
                            <View style={[styles.quickRow, isRTL && styles.rowReverse]}>
                                {quickActions.map((item, i) => (
                                    <TVPressable
                                        key={i}
                                        onPress={item.onPress}
                                        style={[styles.quickAction, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: cardBorder }]}
                                    >
                                        <View style={[styles.quickIcon, { backgroundColor: `${item.color}20` }]}>
                                            <Ionicons name={item.icon} size={24} color={item.color} />
                                        </View>
                                        <Text style={[styles.quickLabel, { color: subColor, fontFamily: FontFamily.medium }]} numberOfLines={1}>{item.label}</Text>
                                        {'count' in item && (item as any).count != null && (item as any).count > 0 && (
                                            <View style={[styles.quickBadge, { backgroundColor: `${item.color}25` }]}>
                                                <Text style={[styles.quickBadgeText, { fontFamily: FontFamily.bold, color: item.color }]}>{(item as any).count}</Text>
                                            </View>
                                        )}
                                    </TVPressable>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ─── Navigation Cards ─────────────────────────────────── */}
                    {!(hideLive && hideMovies && hideSeries) && (
                        <SectionHeader title={t.dashboard.browse} isDark={isDark} isRTL={isRTL} />
                    )}
                    <View style={[styles.navGrid, isRTL && styles.rowReverse]}>
                        {!hideLive && (
                            <NavCard
                                icon="tv-outline"
                                label={t.dashboard.liveTV}
                                count={stats.live}
                                accentColor="#E50914"
                                gradientColors={['#E50914', '#a00']}
                                onPress={() => router.push('/(tabs)/live')}
                                delay={300}
                                isDark={isDark}
                                preferredFocus={isTV}
                                width={navCardWidth}
                            />
                        )}
                        {!hideMovies && (
                            <NavCard
                                icon="film-outline"
                                label={t.dashboard.movies}
                                count={stats.vod}
                                accentColor="#8b5cf6"
                                gradientColors={['#7c3aed', '#4c1d95']}
                                onPress={() => router.push('/(tabs)/movies')}
                                delay={400}
                                isDark={isDark}
                                preferredFocus={isTV && hideLive}
                                width={navCardWidth}
                            />
                        )}
                        {!hideSeries && (
                            <NavCard
                                icon="play-circle-outline"
                                label={t.dashboard.series}
                                count={stats.series}
                                accentColor="#ec4899"
                                gradientColors={['#db2777', '#831843']}
                                onPress={() => router.push('/(tabs)/series')}
                                delay={500}
                                isDark={isDark}
                                preferredFocus={isTV && hideLive && hideMovies}
                                width={navCardWidth}
                            />
                        )}
                    </View>

                    {/* ─── Quick Actions (mobile only, TV has them in the top row) */}
                    {!isTV && (
                        <>
                            <SectionHeader title={t.dashboard.quickActions} isDark={isDark} isRTL={isRTL} />
                            <Animated.View entering={FadeInUp.delay(500).duration(600)} style={[styles.quickRow, isRTL && styles.rowReverse]}>
                                {quickActions.map((item, i) => (
                                    <TVPressable
                                        key={i}
                                        onPress={item.onPress}
                                        style={[styles.quickAction, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: cardBorder }]}
                                    >
                                        <View style={[styles.quickIcon, { backgroundColor: `${item.color}20` }]}>
                                            <Ionicons name={item.icon} size={18} color={item.color} />
                                        </View>
                                        <Text style={[styles.quickLabel, { color: subColor, fontFamily: FontFamily.medium }]} numberOfLines={1}>{item.label}</Text>
                                        {'count' in item && (item as any).count != null && (item as any).count > 0 && (
                                            <View style={[styles.quickBadge, { backgroundColor: `${item.color}25` }]}>
                                                <Text style={[styles.quickBadgeText, { fontFamily: FontFamily.bold, color: item.color }]}>{(item as any).count}</Text>
                                            </View>
                                        )}
                                    </TVPressable>
                                ))}
                            </Animated.View>
                        </>
                    )}

                    {/* ─── Continue Watching ────────────────────────────────── */}
                    <SectionHeader
                        title={t.dashboard.continueWatching}
                        onViewAll={history.length > 3 ? () => { } : undefined}
                        isDark={isDark}
                        isRTL={isRTL}
                        rightAction={history.length > 0 ? (
                            <TVPressable onPress={handleClearHistory} style={{ marginRight: 10, marginLeft: 10 }} focusVariant="control">
                                <Ionicons name="trash-outline" size={tv(16, 22)} color={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)'} />
                            </TVPressable>
                        ) : undefined}
                    />
                    <Animated.View entering={FadeInUp.delay(650).duration(600)}>
                        {history.length > 0 ? (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={[styles.continueScroll, isRTL && { flexDirection: 'row-reverse' }]}
                            >
                                {history.slice(0, 10).map((item, i) => (
                                    <ContinueCard
                                        key={item.id + i}
                                        item={item}
                                        isDark={isDark}
                                        isRTL={isRTL}
                                        onPress={() => handleContinuePress(item)}
                                    />
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={[styles.emptyState, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: cardBorder }]}>
                                <Ionicons name="play-circle-outline" size={tv(40, 56)} color={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'} />
                                <Text style={[styles.emptyText, { color: subColor, fontFamily: FontFamily.medium }]}>{t.dashboard.noHistory}</Text>
                            </View>
                        )}
                    </Animated.View>

                    {/* ─── Featured Content ─────────────────────────────────── */}
                    {featured.length > 0 && (
                        <>
                            <SectionHeader
                                title={t.dashboard.featured}
                                isDark={isDark}
                                isRTL={isRTL}
                            />
                            <Animated.View entering={FadeInUp.delay(750).duration(600)}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={[styles.featuredScroll, isRTL && { flexDirection: 'row-reverse' }]}
                                >
                                    {featured.map((item, i) => (
                                        <FeaturedCard
                                            key={(item.stream_id ?? (item as any).series_id ?? i) + ''}
                                            item={item}
                                            isDark={isDark}
                                            onPress={() => handleFeaturedPress(item)}
                                        />
                                    ))}
                                </ScrollView>
                            </Animated.View>
                        </>
                    )}

                    <View style={{ height: 30 }} />
                </ScrollView>
            </SafeAreaView>

            {/* ── Logout Confirm Dialog ───────────────────────── */}
            <ConfirmDialog
                visible={showLogoutConfirm}
                title={t.dashboard.logoutConfirmTitle}
                message={t.dashboard.logoutConfirmMsg}
                confirmLabel={t.dashboard.logout}
                cancelLabel={t.common.cancel}
                icon="log-out-outline"
                danger
                isDark={isDark}
                onConfirm={() => { setShowLogoutConfirm(false); logout(); }}
                onCancel={() => setShowLogoutConfirm(false)}
            />

            {/* ── Clear History Confirm Dialog ─────────────────── */}
            <ConfirmDialog
                visible={showClearHistoryConfirm}
                title={isRTL ? 'مسح السجل' : 'Clear History'}
                message={isRTL ? 'هل تريد مسح سجل المشاهدة بالكامل؟' : 'Are you sure you want to clear all watch history?'}
                confirmLabel={isRTL ? 'مسح' : 'Clear'}
                cancelLabel={t.common.cancel}
                icon="trash-outline"
                danger
                isDark={isDark}
                onConfirm={doClearHistory}
                onCancel={() => setShowClearHistoryConfirm(false)}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, overflow: 'hidden' },
    safe: { flex: 1 },
    scroll: { paddingBottom: tv(24, TVSafe.paddingVertical) },
    topGlow: {
        position: 'absolute', top: -120,
        width: 320, height: 320, borderRadius: 160,
    },
    rowReverse: { flexDirection: 'row-reverse' },

    tvQuickBlock: { marginBottom: 20 },

    // Header
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: tv(12, TVSafe.paddingVertical), paddingBottom: 20 },
    headerLeft: { flex: 1 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
    welcomeText: { fontSize: tv(13, 18), marginBottom: 2 },
    userName: { fontSize: tv(22, 30), letterSpacing: -0.5 },
    providerPill: {
        flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 5,
        backgroundColor: `${Brand.primary}18`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
    },
    providerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Brand.primary },
    providerPillText: { color: Brand.primary, fontSize: 11 },
    logoutBtn: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: `${Brand.primary}14`, alignItems: 'center', justifyContent: 'center',
    },

    // Section
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: 6 },
    accentBar: { width: 4, height: 18, borderRadius: 2, backgroundColor: Brand.primary },
    sectionTitle: { fontSize: tv(16, 20) },
    viewAll: { color: Brand.primary, fontSize: 13 },

    // Nav Cards
    navGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    navCard: {
        height: tv(120, 160), borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', gap: 6, padding: 10,
    },
    navGlow: { position: 'absolute', width: 80, height: 80, borderRadius: 40, top: -30, right: -20, opacity: 0.4 },
    navIconWrap: { width: tv(42, 54), height: tv(42, 54), borderRadius: tv(13, 16), alignItems: 'center', justifyContent: 'center' },
    navCount: { color: '#fff', fontSize: tv(17, 22) },
    navLabel: { color: 'rgba(255,255,255,0.8)', fontSize: tv(11, 14), textAlign: 'center' },

    // Quick Actions
    quickRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    quickAction: { flex: 1, borderRadius: 16, borderWidth: 1, alignItems: 'center', paddingVertical: 14, gap: 8 },
    quickIcon: { width: tv(38, 48), height: tv(38, 48), borderRadius: tv(12, 16), alignItems: 'center', justifyContent: 'center' },
    quickLabel: { fontSize: tv(10, 13), textAlign: 'center' },
    quickBadge: {
        position: 'absolute', top: 8, right: 8,
        minWidth: 20, height: 20, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
    },
    quickBadgeText: { fontSize: 10 },

    // Continue watching
    continueScroll: { flexDirection: 'row', gap: tv(12, 16), paddingRight: 20, marginBottom: 16 },
    continueCard: { width: tv(140, 200), borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
    continueThumb: { width: '100%', height: tv(90, 130), position: 'relative' },
    continueImg: { width: '100%', height: '100%' },
    continuePlayOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    continuePlayCircle: {
        width: tv(32, 44), height: tv(32, 44), borderRadius: tv(16, 22),
        backgroundColor: `${Brand.primary}CC`,
        alignItems: 'center', justifyContent: 'center',
    },
    continueTypeBadge: {
        position: 'absolute', top: 6, left: 6,
        paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center', justifyContent: 'center',
    },
    progressBg: { height: 3, borderRadius: 2, marginHorizontal: 10, marginTop: 8 },
    progressFill: { height: '100%', backgroundColor: Brand.primary, borderRadius: 2 },
    continueName: { fontSize: tv(11, 15), marginHorizontal: 10, marginTop: 8, marginBottom: 2 },
    continueEp: { fontSize: tv(9, 13), marginHorizontal: 10, marginBottom: 10 },

    // Empty state
    emptyState: {
        alignItems: 'center', justifyContent: 'center',
        paddingVertical: tv(32, 48), borderRadius: 16, borderWidth: 1,
        marginBottom: 16, gap: 10,
    },
    emptyText: { fontSize: tv(13, 18) },

    // Featured
    featuredScroll: { flexDirection: 'row', gap: tv(12, 16), paddingRight: 20, marginBottom: 16 },
    featuredCard: {
        width: tv(200, 280), height: tv(260, 380),
        borderRadius: tv(18, 24), overflow: 'hidden',
    },
    featuredImg: { width: '100%', height: '100%' },
    featuredGradient: { ...StyleSheet.absoluteFillObject, top: '50%' },
    featuredInfo: { position: 'absolute', bottom: tv(14, 22), left: tv(14, 20), right: tv(14, 20) },
    featuredName: { color: '#fff', fontSize: tv(14, 20), lineHeight: tv(18, 26), marginBottom: 4 },
    featuredRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    featuredRatingText: { color: '#FBBF24', fontSize: tv(12, 16) },
});
