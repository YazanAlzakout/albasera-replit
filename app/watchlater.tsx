/**
 * watchlater.tsx — Watch Later Screen
 * Displays all items the user has saved for later viewing.
 * Premium grid with poster cards, remove option, and multilingual support.
 */

import { TVPressable } from '@/components/shared/TVPressable';
import { Brand, Colors, FontFamily, TVSafe } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useAppTheme } from '@/contexts/theme-context';
import { DownloadStatus, downloadService } from '@/services/download-service';
import { WatchedItem, watchHistoryService } from '@/services/watch-history-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Platform,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const isTV = Platform.isTV;
const tv = (m: number, t: number) => (isTV ? t : m);
const GAP = tv(12, 16);

type LibraryItem = WatchedItem & {
    downloadStatus?: DownloadStatus;
    downloadProgress?: number;
};

// ─── Item Card ────────────────────────────────────────────────────────────────
function ItemCard({
    item, width, isDark, isRTL, onPress, onRemove,
}: {
    item: LibraryItem; width: number; isDark: boolean; isRTL: boolean;
    onPress: () => void; onRemove: () => void;
}) {
    const scale = useSharedValue(1);
    const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const [imgErr, setImgErr] = useState(false);
    const textC = isDark ? Colors.dark.text : Colors.light.text;
    const subC = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
    const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    const typeMap: Record<string, { label: string; color: string }> = {
        live: { label: 'LIVE', color: '#E50914' },
        movie: { label: 'MOV', color: '#8b5cf6' },
        series: { label: 'SER', color: '#ec4899' },
    };
    const typeInfo = typeMap[item.type] ?? { label: '?', color: '#888' };

    const handlePress = () => {
        scale.value = withSpring(0.95, { damping: 12 }, () => { scale.value = withSpring(1); });
        onPress();
    };

    return (
        <Animated.View entering={FadeInDown.duration(400)} style={{ width, marginBottom: GAP }}>
            <Animated.View style={scaleStyle}>
                <TVPressable onPress={handlePress} style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
                    {/* Poster */}
                    <View style={styles.poster}>
                        {!!item.cover && !imgErr ? (
                            <Image source={{ uri: item.cover }} style={styles.posterImg} resizeMode="cover" onError={() => setImgErr(true)} />
                        ) : (
                            <LinearGradient colors={isDark ? ['#1C1C28', '#09090F'] : ['#E5E7EB', '#D1D5DB']} style={styles.posterImg}>
                                <Ionicons name="film-outline" size={tv(32, 44)} color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} />
                            </LinearGradient>
                        )}
                        {/* Type badge */}
                        <View style={[styles.typeBadge, { backgroundColor: typeInfo.color }]}>
                            <Text style={styles.typeBadgeText}>{typeInfo.label}</Text>
                        </View>
                        {!!item.downloadStatus && (
                            <View style={styles.downloadBadge}>
                                <Ionicons
                                    name={item.downloadStatus === 'completed' ? 'checkmark-circle' : 'download-outline'}
                                    size={tv(12, 16)}
                                    color="#fff"
                                />
                                <Text style={styles.downloadBadgeText}>
                                    {item.downloadStatus === 'completed'
                                        ? (isRTL ? 'محمّل' : 'OFFLINE')
                                        : `${Math.round(item.downloadProgress ?? 0)}%`}
                                </Text>
                            </View>
                        )}
                        {/* Remove button */}
                        <TVPressable onPress={onRemove} style={styles.removeBtn} focusVariant="control">
                            <Ionicons name="close-circle" size={tv(22, 28)} color="rgba(255,255,255,0.85)" />
                        </TVPressable>
                        {/* Play overlay */}
                        <View style={styles.playOverlay}>
                            <View style={styles.playCircle}>
                                <Ionicons name="play" size={tv(16, 22)} color="#fff" />
                            </View>
                        </View>
                    </View>
                    {/* Name */}
                    <Text style={[styles.name, { color: textC, fontFamily: FontFamily.bold, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                        {item.name}
                    </Text>
                    {/* Episode if series */}
                    {!!item.episode && (
                        <Text style={[styles.episode, { color: subC, fontFamily: FontFamily.regular, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                            {item.episode}
                        </Text>
                    )}
                </TVPressable>
            </Animated.View>
        </Animated.View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WatchLaterScreen() {
    const { isDark } = useAppTheme();
    const { t, isRTL } = useLanguage();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const columns = isTV ? 4 : width >= 900 ? 4 : width >= 600 ? 3 : 2;
    const cardWidth = (width - tv(40, 120) - GAP * (columns - 1)) / columns;
    const [items, setItems] = useState<LibraryItem[]>([]);

    const bg = isDark ? '#09090F' : '#F0F0F8';
    const textColor = isDark ? Colors.dark.text : Colors.light.text;
    const subColor = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;

    useFocusEffect(
        useCallback(() => {
            loadItems();
        }, [])
    );

    const loadItems = async () => {
        const [watchLater, downloads] = await Promise.all([
            watchHistoryService.getWatchLater(),
            downloadService.getDownloads(),
        ]);
        const downloadedItems: LibraryItem[] = downloads.map((item) => ({
            ...item,
            downloadStatus: item.status,
            downloadProgress: item.progress,
        }));
        const downloadIds = new Set(downloadedItems.map((item) => item.id));
        setItems([...downloadedItems, ...watchLater.filter((item) => !downloadIds.has(item.id))]);
    };

    const handlePress = (item: WatchedItem) => {
        const libraryItem = item as LibraryItem;
        if (libraryItem.downloadStatus === 'completed' && item.localUri) {
            router.push({
                pathname: '/player',
                params: {
                    streamId: item.id,
                    type: item.type,
                    extension: item.extension ?? 'mp4',
                    name: item.name,
                    cover: item.cover,
                    episode: item.episode,
                    localUri: item.localUri,
                },
            });
            return;
        }
        router.push({
            pathname: '/details',
            params: { streamId: item.id, type: item.type, extension: item.extension ?? 'mp4' },
        });
    };

    const handleRemove = (item: LibraryItem) => {
        Alert.alert(t.dashboard.removeConfirm, item.name, [
            { text: t.common.cancel, style: 'cancel' },
            {
                text: t.common.delete ?? t.common.confirm, style: 'destructive',
                onPress: async () => {
                    if (item.downloadStatus) {
                        await downloadService.deleteDownload(item.id);
                    } else {
                        await watchHistoryService.toggleWatchLater(item);
                    }
                    setItems(prev => prev.filter(i => i.id !== item.id));
                },
            },
        ]);
    };

    return (
        <View style={[styles.root, { backgroundColor: bg }]}>
            <LinearGradient
                colors={isDark ? ['#1a0f00', '#09090F'] : ['#fffbf0', '#F0F0F8']}
                style={styles.headerGradient}
            />

            {/* Header */}
            <Animated.View entering={FadeIn.duration(400)} style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TVPressable onPress={() => router.back()} style={styles.backBtn} focusVariant="control">
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={tv(22, 28)} color={textColor} />
                </TVPressable>
                <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.headerTitle, { color: textColor, fontFamily: FontFamily.black, textAlign: isRTL ? 'right' : 'left' }]}>
                        {t.dashboard.watchLaterTitle}
                    </Text>
                    <Text style={[styles.headerSub, { color: subColor, fontFamily: FontFamily.regular }]}>
                        {items.length} {isRTL ? 'عنصر' : items.length === 1 ? 'item' : 'items'}
                    </Text>
                </View>
                <Ionicons name="bookmark" size={tv(24, 30)} color="#f59e0b" />
            </Animated.View>

            {/* Grid or Empty */}
            {items.length > 0 ? (
                <FlatList
                    key={`watch-later-${columns}`}
                    data={items}
                    keyExtractor={(item) => item.id}
                    numColumns={columns}
                    contentContainerStyle={[styles.grid, { paddingHorizontal: tv(20, TVSafe.paddingHorizontal) }]}
                    columnWrapperStyle={{ gap: GAP, flexDirection: isRTL ? 'row-reverse' : 'row' }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <ItemCard
                            item={item}
                            width={cardWidth}
                            isDark={isDark}
                            isRTL={isRTL}
                            onPress={() => handlePress(item)}
                            onRemove={() => handleRemove(item)}
                        />
                    )}
                />
            ) : (
                <View style={styles.emptyWrap}>
                    <Animated.View entering={FadeIn.delay(200).duration(600)} style={styles.emptyInner}>
                        <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)' }]}>
                            <Ionicons name="bookmark-outline" size={tv(48, 64)} color="#f59e0b" />
                        </View>
                        <Text style={[styles.emptyTitle, { color: textColor, fontFamily: FontFamily.bold }]}>
                            {t.dashboard.watchLaterTitle}
                        </Text>
                        <Text style={[styles.emptyText, { color: subColor, fontFamily: FontFamily.regular, textAlign: 'center' }]}>
                            {t.dashboard.noWatchLater}
                        </Text>
                        <TVPressable
                            onPress={() => router.push('/(tabs)/series')}
                            style={[styles.emptyBtn, { backgroundColor: '#f59e0b' }]}
                        >
                            <Ionicons name="search-outline" size={tv(16, 20)} color="#fff" />
                            <Text style={[styles.emptyBtnText, { fontFamily: FontFamily.bold }]}>
                                {isRTL ? 'تصفح المحتوى' : 'Browse Content'}
                            </Text>
                        </TVPressable>
                    </Animated.View>
                </View>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1 },
    headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: tv(200, 260) },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: tv(20, TVSafe.paddingHorizontal), paddingBottom: 16,
    },
    backBtn: {
        width: tv(38, 48), height: tv(38, 48), borderRadius: tv(12, 16),
        backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: tv(22, 30) },
    headerSub: { fontSize: tv(12, 16), marginTop: 2 },

    // Grid
    grid: { paddingTop: 16, paddingBottom: 40 },

    // Card
    card: { borderRadius: tv(14, 18), overflow: 'hidden', borderWidth: 1 },
    poster: { width: '100%', aspectRatio: 0.67, position: 'relative' },
    posterImg: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    typeBadge: {
        position: 'absolute', top: tv(6, 10), left: tv(6, 10),
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    },
    typeBadgeText: { color: '#fff', fontSize: tv(8, 11), fontWeight: '800', letterSpacing: 0.5 },
    downloadBadge: {
        position: 'absolute', bottom: tv(7, 10), left: tv(7, 10),
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8,
        backgroundColor: 'rgba(15,118,110,0.92)',
    },
    downloadBadgeText: { color: '#fff', fontSize: tv(8, 11), fontWeight: '800' },
    removeBtn: { position: 'absolute', top: tv(4, 8), right: tv(4, 8) },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
    playCircle: {
        width: tv(36, 48), height: tv(36, 48), borderRadius: tv(18, 24),
        backgroundColor: `${Brand.primary}CC`, alignItems: 'center', justifyContent: 'center',
    },
    name: { fontSize: tv(12, 16), marginHorizontal: tv(8, 12), marginTop: tv(8, 12), marginBottom: 2 },
    episode: { fontSize: tv(10, 14), marginHorizontal: tv(8, 12), marginBottom: tv(8, 12) },

    // Empty
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    emptyInner: { alignItems: 'center', gap: 16 },
    emptyIcon: {
        width: tv(80, 110), height: tv(80, 110), borderRadius: tv(40, 55),
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    emptyTitle: { fontSize: tv(20, 28) },
    emptyText: { fontSize: tv(13, 18), lineHeight: tv(20, 28), maxWidth: 300 },
    emptyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: tv(20, 28), paddingVertical: tv(12, 16),
        borderRadius: tv(12, 16), marginTop: 8,
    },
    emptyBtnText: { color: '#fff', fontSize: tv(14, 18) },
});
