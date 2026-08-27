import { AccountOverviewSections } from '@/components/account/AccountOverviewSections';
import { TVPressable } from '@/components/shared/TVPressable';
import { Brand, Colors, FontFamily, TVSafe } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useSettings } from '@/contexts/settings-context';
import { useAppTheme } from '@/contexts/theme-context';
import { useAuth } from '@/hooks/use-auth';
import { useWatchLibrarySnapshot } from '@/hooks/use-watch-library-snapshot';
import { watchHistoryService } from '@/services/watch-history-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Dimensions, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');
const isTV = Platform.isTV;
const tv = (m: number, t: number) => (isTV ? t : m);

// Calculate 4 columns for large screens/TV, 2 for mobile
const numColumns = isTV || W > 600 ? 4 : 2;
const spacing = 12;
const cardWidth = (W - (isTV ? TVSafe.paddingHorizontal * 2 : 40) - (spacing * (numColumns - 1))) / numColumns;

interface SettingItem {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    color?: string;
}

export default function SettingsScreen() {
    const { isDark, toggleTheme } = useAppTheme();
    const { isRTL, t, locale, cycleLocale } = useLanguage();
    const { hiddenCategories, hiddenStreams } = useSettings();
    const { user } = useAuth();
    const { history, favCount, watchLaterCount, refresh } = useWatchLibrarySnapshot();

    const bg = isDark ? '#09090F' : '#F0F0F8';
    const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)';
    const accountPanelBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)';
    const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textC = isDark ? Colors.dark.text : Colors.light.text;

    const handleClearHistory = async () => {
        Alert.alert(
            t.settings.alerts.clearHistoryTitle,
            t.settings.alerts.clearHistoryMsg,
            [
                { text: t.common.cancel, style: 'cancel' },
                {
                    text: t.settings.alerts.clear, style: 'destructive', onPress: async () => {
                        await watchHistoryService.clearHistory();
                        await refresh();
                        Alert.alert(t.settings.alerts.done, t.settings.alerts.historyCleared);
                    }
                },
            ]
        );
    };

    const handleClearFavorites = async () => {
        Alert.alert(
            t.settings.alerts.clearFavoritesTitle,
            t.settings.alerts.clearFavoritesMsg,
            [
                { text: t.common.cancel, style: 'cancel' },
                {
                    text: t.settings.alerts.clear, style: 'destructive', onPress: async () => {
                        await watchHistoryService.clearFavorites();
                        await refresh();
                        Alert.alert(t.settings.alerts.done, t.settings.alerts.favoritesCleared);
                    }
                },
            ]
        );
    };

    const handleClearWatchLater = async () => {
        Alert.alert(
            t.settings.alerts.clearWatchLaterTitle,
            t.settings.alerts.clearWatchLaterMsg,
            [
                { text: t.common.cancel, style: 'cancel' },
                {
                    text: t.settings.alerts.clear, style: 'destructive', onPress: async () => {
                        await watchHistoryService.clearWatchLater();
                        await refresh();
                        Alert.alert(t.settings.alerts.done, t.settings.alerts.watchLaterCleared);
                    }
                },
            ]
        );
    };

    const settings: SettingItem[] = [
        {
            id: 'lang',
            icon: 'globe-outline',
            label: `${t.settings.language} (${locale.toUpperCase()})`,
            onPress: cycleLocale,
        },
        {
            id: 'theme',
            icon: isDark ? 'moon-outline' : 'sunny-outline',
            label: isDark ? t.settings.darkMode : t.settings.lightMode,
            onPress: toggleTheme,
        },
        {
            id: 'playlist',
            icon: 'list-circle-outline',
            label: t.settings.playlistProvider,
            onPress: () => router.push('/login'),
        },
        {
            id: 'lock_live',
            icon: 'lock-closed-outline',
            label: `${t.settings.liveProtection} (${hiddenCategories.live.length + hiddenStreams.live.length})`,
            color: textC,
            onPress: () => router.push({ pathname: '/content-lock', params: { type: 'live' } }),
        },
        {
            id: 'lock_movies',
            icon: 'film-outline',
            label: `${t.settings.moviesProtection} (${hiddenCategories.movie.length + hiddenStreams.movie.length})`,
            color: textC,
            onPress: () => router.push({ pathname: '/content-lock', params: { type: 'movie' } }),
        },
        {
            id: 'lock_series',
            icon: 'play-circle-outline',
            label: `${t.settings.seriesProtection} (${hiddenCategories.series.length + hiddenStreams.series.length})`,
            color: textC,
            onPress: () => router.push({ pathname: '/content-lock', params: { type: 'series' } }),
        },
        {
            id: 'clear_history',
            icon: 'trash-outline',
            label: t.settings.clearWatchHistory,
            onPress: handleClearHistory,
        },
        {
            id: 'clear_fav',
            icon: 'trash-bin-outline',
            label: t.settings.clearFavorites,
            onPress: handleClearFavorites,
        },
        {
            id: 'clear_wl',
            icon: 'backspace-outline',
            label: t.settings.clearWatchLater,
            onPress: handleClearWatchLater,
        },
    ];

    return (
        <View style={[styles.root, { backgroundColor: bg }]}>
            <LinearGradient
                colors={isDark ? ['#1a0005', '#09090F', '#09090F'] : ['#fff4f4', '#F0F0F8', '#F0F0F8']}
                style={StyleSheet.absoluteFill}
            />
            <View style={[styles.topGlow, { backgroundColor: `${Brand.primary}20` }]} />

            <SafeAreaView style={styles.safe}>
                {/* ─── Header ───────────────────────────────────────────── */}
                <Animated.View entering={FadeIn.duration(500)} style={[styles.header, isRTL && styles.rowReverse]}>
                    <TVPressable onPress={() => router.back()} style={styles.backBtn} focusVariant="control" hasTVPreferredFocus={isTV}>
                        <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={26} color={textC} />
                    </TVPressable>
                    <Text style={[styles.title, { color: textC, fontFamily: FontFamily.bold }]}>
                        {t.settings.title}
                    </Text>
                    <View style={{ width: 40 }} />
                </Animated.View>

                <ScrollView
                    contentContainerStyle={[styles.scroll, { paddingHorizontal: tv(20, TVSafe.paddingHorizontal) }]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.grid, isRTL && styles.rowReverseWrap]}>
                        {settings.map((item, index) => (
                            <Animated.View key={item.id} entering={FadeInDown.delay(index * 40).duration(400).springify()}>
                                <TVPressable
                                    style={[
                                        styles.card, { width: cardWidth, backgroundColor: cardBg, borderColor: cardBorder },
                                    ]}
                                    onPress={item.onPress}
                                >
                                    <Ionicons name={item.icon} size={tv(28, 36)} color={item.color || textC} style={styles.icon} />
                                    <Text style={[styles.cardLabel, { color: textC, fontFamily: FontFamily.medium }]} numberOfLines={2}>
                                        {item.label}
                                    </Text>
                                </TVPressable>
                            </Animated.View>
                        ))}
                    </View>
                    <Animated.View entering={FadeInDown.delay(40).duration(400).springify()}>
                        <AccountOverviewSections
                            user={user}
                            isDark={isDark}
                            isRTL={isRTL}
                            locale={locale}
                            t={t}
                            historyCount={history.length}
                            favCount={favCount}
                            wlCount={watchLaterCount}
                            cardBg={accountPanelBg}
                            cardBorder={cardBorder}
                        />
                    </Animated.View>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, overflow: 'hidden' },
    safe: { flex: 1 },
    topGlow: {
        position: 'absolute', top: -120,
        left: W * 0.5 - 160, width: 320, height: 320, borderRadius: 160,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: tv(12, 24),
        paddingBottom: 20,
    },
    rowReverse: { flexDirection: 'row-reverse' },
    rowReverseWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    title: { fontSize: tv(20, 26) },
    scroll: { paddingBottom: 24, paddingTop: 10 },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing,
        justifyContent: 'flex-start'
    },
    card: {
        height: tv(100, 130),
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
    },
    icon: {
        marginBottom: 10,
    },
    cardLabel: {
        fontSize: tv(12, 16),
        textAlign: 'center',
    },
});
