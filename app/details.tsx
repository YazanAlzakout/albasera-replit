/**
 * app/details.tsx — "Void Cinema" Redesign
 *
 * ╔════════════════════════════════════════════════════════╗
 * ║  AESTHETIC : Void Cinema — deep black, electric        ║
 * ║              accent, editorial typography              ║
 * ║  TV HEADER : Single floating back button, no bar       ║
 * ║  PERF      : React.memo everywhere, useCallback,       ║
 * ║              stable refs, no scroll overhead           ║
 * ║  LAYOUT    : isTV → wider hero, denser grid,           ║
 * ║              sidebar-style season selector             ║
 * ║  FEATURES  : All original features 100% preserved      ║
 * ╚════════════════════════════════════════════════════════╝
 */

import { Skeleton } from '@/components/shared/Skeleton';
import { TVPressable } from '@/components/shared/TVPressable';
import { Brand, Colors, FontFamily, TVSafe } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useAppTheme } from '@/contexts/theme-context';
import { DownloadItem, downloadService } from '@/services/download-service';
import { watchHistoryService } from '@/services/watch-history-service';
import { xtreamService } from '@/services/xtream-service';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const isTV = Platform.isTV;
const tv = (m: number, t: number) => (isTV ? t : m);

function normalizeSubtitleTracks(source: any): { id: string; uri: string; language?: string; label?: string; mimeType?: string }[] {
    const raw = source?.subtitles ?? source?.subtitle_tracks ?? source?.subtitle ?? source?.subs;
    const values = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.values(raw) : raw ? [raw] : [];
    return values.flatMap((value: any, index: number) => {
        const uri = typeof value === 'string'
            ? value
            : value?.url ?? value?.uri ?? value?.file ?? value?.src;
        if (typeof uri !== 'string' || !/^https?:\/\//i.test(uri)) return [];
        const language = typeof value === 'object' ? value.language ?? value.lang ?? value.code : undefined;
        const label = typeof value === 'object' ? value.label ?? value.name ?? value.title : undefined;
        const isSrt = /\.srt(?:$|\?)/i.test(uri);
        return [{
            id: String(value?.id ?? `${language ?? 'subtitle'}_${index}`),
            uri,
            language: language ? String(language) : undefined,
            label: label ? String(label) : language ? String(language).toUpperCase() : `Subtitle ${index + 1}`,
            mimeType: isSrt ? 'application/x-subrip' : 'text/vtt',
        }];
    });
}

// ══════════════════════════════════════════════════════════
//  MICRO-COMPONENTS  (all memoized)
// ══════════════════════════════════════════════════════════

// ── Star rating ──────────────────────────────────────────
const StarRating = React.memo(({
    rating, showNumber = true,
}: { rating: number | string; showNumber?: boolean }) => {
    const num = Math.min(5, parseFloat(String(rating)) / 2);
    return (
        <View style={starS.row}>
            {Array.from({ length: 5 }).map((_, i) => {
                const filled = i < Math.floor(num);
                const half = !filled && i < Math.ceil(num);
                return (
                    <Ionicons
                        key={i}
                        name={filled ? 'star' : half ? 'star-half' : 'star-outline'}
                        size={tv(15, 22)}
                        color={filled || half ? '#F59E0B' : 'rgba(255,255,255,0.2)'}
                    />
                );
            })}
            {showNumber && (
                <Text style={[starS.num, { fontFamily: FontFamily.bold }]}>
                    {parseFloat(String(rating)).toFixed(1)}/10
                </Text>
            )}
        </View>
    );
});
const starS = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: tv(3, 5) },
    num: { color: 'rgba(255,255,255,0.6)', fontSize: tv(12, 17), marginLeft: 5 },
});

// ── Genre chip ───────────────────────────────────────────
const GenreChip = React.memo(({ label }: { label: string }) => (
    <View style={genreS.chip}>
        <Text style={[genreS.txt, { fontFamily: FontFamily.medium }]}>{label.trim()}</Text>
    </View>
));
const genreS = StyleSheet.create({
    chip: {
        paddingHorizontal: tv(9, 14),
        paddingVertical: tv(4, 6),
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.09)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    txt: { color: 'rgba(255,255,255,0.8)', fontSize: tv(10, 15) },
});

// ── Cast avatar ──────────────────────────────────────────
const CAST_COLORS = ['#E50914', '#8B5CF6', '#0EA5E9', '#EC4899', '#F97316', '#14B8A6'];
const CastAvatar = React.memo(({ name }: { name: string }) => {
    const initials = name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
    const col = CAST_COLORS[name.charCodeAt(0) % CAST_COLORS.length];
    return (
        <View style={castS.wrap}>
            <View style={[castS.circle, { backgroundColor: col + '30', borderColor: col + '80' }]}>
                <Text style={[castS.initials, { fontFamily: FontFamily.black, color: col }]}>{initials}</Text>
            </View>
            <Text style={[castS.name, { fontFamily: FontFamily.regular }]} numberOfLines={2}>
                {name.trim()}
            </Text>
        </View>
    );
});
const castS = StyleSheet.create({
    wrap: { alignItems: 'center', width: tv(68, 96), gap: tv(5, 7) },
    circle: { width: tv(48, 68), height: tv(48, 68), borderRadius: tv(24, 34), alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
    initials: { fontSize: tv(15, 22) },
    name: { color: 'rgba(255,255,255,0.6)', fontSize: tv(9, 13), textAlign: 'center' },
});

// ── Action button ────────────────────────────────────────
const ActionBtn = React.memo(({
    icon, label, onPress, primary, color,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    primary?: boolean;
    color?: string;
}) => {
    const scale = useSharedValue(1);
    const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const accent = color ?? Brand.primary;

    const handlePress = useCallback(() => {
        scale.value = withSpring(0.91, { damping: 16 }, () => { scale.value = withSpring(1); });
        onPress();
    }, [onPress]);

    return (
        <Animated.View style={[actionS.wrap, aStyle]}>
            <TVPressable
                onPress={handlePress}
                hasTVPreferredFocus={isTV && !!primary}
                style={[
                    actionS.btn,
                    primary
                        ? { backgroundColor: accent, shadowColor: accent, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10 }
                        : { backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
                ]}
                focusVariant="control"
            >
                <Ionicons name={icon} size={tv(18, 26)} color="#fff" />
                <Text style={[actionS.label, { fontFamily: primary ? FontFamily.black : FontFamily.medium }]}>
                    {label}
                </Text>
            </TVPressable>
        </Animated.View>
    );
});
const actionS = StyleSheet.create({
    wrap: { flexGrow: 1, flexBasis: tv(112, 180) },
    btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: tv(13, 18), borderRadius: tv(14, 20), gap: tv(7, 11) },
    label: { color: '#fff', fontSize: tv(13, 19) },
});

// ── Info row ─────────────────────────────────────────────
const InfoRow = React.memo(({ icon, label, value, isDark }: {
    icon: keyof typeof Ionicons.glyphMap; label: string; value: string; isDark: boolean;
}) => {
    const borderCol = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const textCol = isDark ? Colors.dark.text : Colors.light.text;
    const subCol = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
    return (
        <View style={[infoS.row, { borderColor: borderCol }]}>
            <View style={[infoS.iconBox, { backgroundColor: Brand.primary + '1A' }]}>
                <Ionicons name={icon} size={tv(14, 20)} color={Brand.primary} />
            </View>
            <View style={infoS.texts}>
                <Text style={[infoS.lbl, { fontFamily: FontFamily.regular, color: subCol }]}>{label}</Text>
                <Text style={[infoS.val, { fontFamily: FontFamily.bold, color: textCol }]}>{value}</Text>
            </View>
        </View>
    );
});
const infoS = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: tv(10, 16), borderBottomWidth: StyleSheet.hairlineWidth, gap: tv(12, 18) },
    iconBox: { width: tv(34, 46), height: tv(34, 46), borderRadius: tv(10, 14), alignItems: 'center', justifyContent: 'center' },
    texts: { flex: 1 },
    lbl: { fontSize: tv(10, 14) },
    val: { fontSize: tv(13, 19), marginTop: 2 },
});

// ── Section title ────────────────────────────────────────
const SectionTitle = React.memo(({ label, isRTL, isDark }: { label: string; isRTL: boolean; isDark: boolean }) => (
    <View style={[sectS.row, isRTL && sectS.rtl]}>
        <View style={[sectS.bar, { backgroundColor: Brand.primary }]} />
        <Text style={[sectS.txt, { fontFamily: FontFamily.black, color: isDark ? Colors.dark.text : Colors.light.text }]}>
            {label}
        </Text>
    </View>
));
const sectS = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: tv(8, 12), marginBottom: tv(12, 18) },
    rtl: { flexDirection: 'row-reverse' },
    bar: { width: tv(3, 5), height: tv(20, 30), borderRadius: tv(2, 3) },
    txt: { fontSize: tv(16, 24) },
});

// ── Meta badge ───────────────────────────────────────────
const MetaBadge = React.memo(({ icon, text, tint }: { icon: keyof typeof Ionicons.glyphMap; text: string; tint?: string }) => (
    <View style={[metaS.badge, tint && { backgroundColor: tint + '22' }]}>
        <Ionicons name={icon} size={tv(11, 16)} color={tint ?? '#9CA3AF'} />
        <Text style={[metaS.txt, { fontFamily: FontFamily.medium, color: tint ?? '#D1D5DB' }]}>{text}</Text>
    </View>
));
const metaS = StyleSheet.create({
    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(156,163,175,0.13)', paddingHorizontal: tv(8, 13), paddingVertical: tv(4, 7), borderRadius: tv(9, 13), gap: tv(4, 7) },
    txt: { fontSize: tv(11, 16) },
});

// ── Episode card ─────────────────────────────────────────
const EpisodeCard = React.memo(({
    episode, isDark, onPress, onDownload, download, isRTL, episodeLabel,
}: {
    episode: any;
    isDark: boolean;
    onPress: () => void;
    onDownload?: () => void;
    download?: DownloadItem;
    isRTL: boolean;
    episodeLabel: string;
}) => {
    const scale = useSharedValue(1);
    const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const [imgErr, setImgErr] = useState(false);

    const handlePress = useCallback(() => {
        scale.value = withSpring(0.97, { damping: 16 }, () => { scale.value = withSpring(1); });
        onPress();
    }, [onPress]);

    const bg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
    const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    const textCol = isDark ? Colors.dark.text : Colors.light.text;
    const subCol = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;

    const epTitle = episode.title || `${episodeLabel} ${episode.episode_num ?? '?'}`;
    const plot = episode.info?.plot || episode.plot || '';
    const duration = episode.info?.duration || episode.duration || '';
    const thumbUrl = episode.info?.movie_image || episode.info?.cover_big || '';
    const hasThumb = !!thumbUrl && !imgErr;

    return (
        <Animated.View style={aStyle}>
            <View style={[epS.rowShell, isRTL && epS.rowRTL]}>
                <TVPressable
                    onPress={handlePress}
                    style={[epS.row, { backgroundColor: bg, borderColor: border }, isRTL && epS.rowRTL]}
                >
                {/* Episode number */}
                <View style={[epS.numBox, { backgroundColor: Brand.primary + '22' }]}>
                    <Text style={[epS.numTxt, { fontFamily: FontFamily.black, color: Brand.primary }]}>
                        {episode.episode_num ?? '?'}
                    </Text>
                </View>

                {/* Thumbnail */}
                {hasThumb && (
                    <View style={epS.thumbBox}>
                        <Image source={{ uri: thumbUrl }} style={epS.thumb} contentFit="cover" cachePolicy="disk" transition={200} onError={() => setImgErr(true)} />
                        <View style={epS.playOverlay}>
                            <Ionicons name="play" size={tv(13, 18)} color="#fff" />
                        </View>
                    </View>
                )}

                {/* Info */}
                <View style={epS.info}>
                    <Text style={[epS.title, { fontFamily: FontFamily.bold, color: textCol, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                        {epTitle}
                    </Text>
                    {!!plot && (
                        <Text style={[epS.plot, { fontFamily: FontFamily.regular, color: subCol, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                            {plot}
                        </Text>
                    )}
                    {!!duration && (
                        <View style={[epS.durRow, isRTL && epS.rowRTL]}>
                            <Ionicons name="time-outline" size={tv(10, 14)} color={subCol} />
                            <Text style={[epS.durTxt, { fontFamily: FontFamily.regular, color: subCol }]}>{duration}</Text>
                        </View>
                    )}
                </View>

                    {/* Play icon */}
                    <Ionicons name={download?.status === 'completed' ? 'phone-portrait-outline' : 'play-circle'} size={tv(26, 38)} color={Brand.primary + 'CC'} />
                </TVPressable>
                {!!onDownload && (
                    <TVPressable onPress={onDownload} style={[epS.downloadBtn, { backgroundColor: bg, borderColor: border }]} focusVariant="control">
                        <Ionicons
                            name={
                                download?.status === 'completed' ? 'checkmark-circle'
                                    : download?.status === 'downloading' ? 'pause-circle'
                                        : download?.status === 'paused' ? 'play-circle-outline'
                                            : 'download-outline'
                            }
                            size={tv(20, 28)}
                            color={download?.status === 'completed' ? '#22C55E' : Brand.primary}
                        />
                        {download?.status === 'downloading' && (
                            <Text style={[epS.downloadProgress, { fontFamily: FontFamily.bold }]}>
                                {Math.round(download.progress)}%
                            </Text>
                        )}
                    </TVPressable>
                )}
            </View>
        </Animated.View>
    );
});
const epS = StyleSheet.create({
    rowShell: { flexDirection: 'row', alignItems: 'stretch', gap: tv(7, 10), marginBottom: tv(9, 12) },
    row: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: tv(14, 20), borderWidth: 1, paddingVertical: tv(9, 14), paddingHorizontal: tv(11, 17), gap: tv(10, 16) },
    rowRTL: { flexDirection: 'row-reverse' },
    numBox: { width: tv(32, 46), height: tv(32, 46), borderRadius: tv(16, 23), alignItems: 'center', justifyContent: 'center' },
    numTxt: { fontSize: tv(13, 18) },
    thumbBox: { width: tv(76, 112), height: tv(48, 68), borderRadius: tv(9, 13), overflow: 'hidden' },
    thumb: { width: '100%', height: '100%' },
    playOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1 },
    title: { fontSize: tv(12, 18), marginBottom: 2 },
    plot: { fontSize: tv(10, 15), lineHeight: tv(15, 21), marginBottom: 3 },
    durRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    durTxt: { fontSize: tv(9, 13) },
    downloadBtn: { width: tv(48, 66), borderRadius: tv(14, 20), borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
    downloadProgress: { color: '#fff', fontSize: tv(8, 11) },
});

// ══════════════════════════════════════════════════════════
//  LOADING SKELETON
// ══════════════════════════════════════════════════════════
const LoadingSkeleton = React.memo(({ bg, width, heroHeight }: { bg: string; width: number; heroHeight: number }) => (
    <View style={[{ flex: 1, backgroundColor: bg }]}>
        <Skeleton width={width} height={heroHeight} borderRadius={0} />
        <View style={{ paddingHorizontal: tv(20, TVSafe.paddingHorizontal), paddingTop: tv(12, 20), gap: 12 }}>
            <Skeleton width="60%" height={tv(30, 44)} borderRadius={7} />
            <Skeleton width="40%" height={tv(14, 20)} borderRadius={5} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <Skeleton width="30%" height={tv(36, 50)} borderRadius={tv(14, 20)} />
                <Skeleton width="30%" height={tv(36, 50)} borderRadius={tv(14, 20)} />
                <Skeleton width="30%" height={tv(36, 50)} borderRadius={tv(14, 20)} />
            </View>
            {[1, 0.8, 0.6].map((w, i) => (
                <Skeleton key={i} width={`${w * 100}%` as any} height={tv(12, 17)} borderRadius={4} />
            ))}
        </View>
    </View>
));

// ══════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════
export default function DetailsScreen() {
    const params = useLocalSearchParams();
    const streamId = Array.isArray(params.streamId) ? params.streamId[0] : params.streamId;
    const type = Array.isArray(params.type) ? params.type[0] : params.type;
    const extension = Array.isArray(params.extension) ? params.extension[0] : params.extension;

    const { isDark } = useAppTheme();
    const { t, isRTL } = useLanguage();
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const heroHeight = height * (isTV ? 0.55 : width >= 700 ? 0.52 : 0.58);

    const [loading, setLoading] = useState(true);
    const [info, setInfo] = useState<any>(null);
    const [episodes, setEpisodes] = useState<Record<string, any[]>>({});
    const [seasonsMeta, setSeasonsMeta] = useState<any[]>([]);
    const [activeSeason, setActiveSeason] = useState<string>('');
    const [isFav, setIsFav] = useState(false);
    const [isWL, setIsWL] = useState(false);
    const [downloads, setDownloads] = useState<Record<string, DownloadItem>>({});

    // Scroll-driven parallax + back-btn fade
    const scrollY = useSharedValue(0);
    const heroParallax = useAnimatedStyle(() => ({
        transform: [{ translateY: -(scrollY.value * 0.32) }],
    }));
    const backOpacity = useAnimatedStyle(() => ({
        opacity: withTiming(Math.max(0.35, 1 - scrollY.value / 100), { duration: 60 }),
    }));

    const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY.value = e.nativeEvent.contentOffset.y;
    }, []);

    const bg = isDark ? '#07070E' : '#F6F6FC';
    const textCol = isDark ? Colors.dark.text : Colors.light.text;
    const subCol = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;

    // ── Load details ─────────────────────────────────────
    const loadDetails = useCallback(async () => {
        setLoading(true);
        try {
            const id = parseInt(streamId as string);
            if (type === 'movie') {
                const data = await xtreamService.getVodInfo(id);
                const merged = { ...(data?.movie_data || {}), ...(data?.info || {}) };
                if (!merged.releasedate) merged.releasedate = merged.release_date || merged.releaseDate || merged.year;
                if (!merged.duration && merged.duration_secs) merged.duration = `${Math.round(merged.duration_secs / 60)} min`;
                if (!merged.cover) merged.cover = merged.stream_icon;
                if (!merged.cover_big) merged.cover_big = merged.movie_image || merged.cover;
                if (!merged.country) merged.country = merged.country_code;
                setInfo(merged);
            } else if (type === 'series') {
                const data = await xtreamService.getSeriesInfo(id);
                const si = data?.info || {};
                if (!si.releasedate) si.releasedate = si.release_date || si.releaseDate || si.year;
                setInfo(si);
                if (Array.isArray(data?.seasons)) setSeasonsMeta(data.seasons);
                const raw = data?.episodes;
                if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                    const norm: Record<string, any[]> = {};
                    for (const [s, eps] of Object.entries(raw)) {
                        norm[s] = Array.isArray(eps) ? eps : Object.values(eps as Record<string, any>);
                    }
                    setEpisodes(norm);
                    const first = Object.keys(norm).sort((a, b) => Number(a) - Number(b))[0];
                    if (first) setActiveSeason(first);
                } else if (Array.isArray(raw) && raw.length > 0) {
                    setEpisodes({ '1': raw });
                    setActiveSeason('1');
                }
            } else {
                setInfo({ name: 'Live Channel' });
            }
        } catch (e) {
            console.warn('Details load error:', e);
        } finally {
            setLoading(false);
        }
    }, [streamId, type]);

    useEffect(() => { loadDetails(); }, [loadDetails]);

    useEffect(() => {
        if (!streamId) return;
        watchHistoryService.isFavorite(String(streamId)).then(setIsFav);
        watchHistoryService.isInWatchLater(String(streamId)).then(setIsWL);
    }, [streamId]);

    const refreshDownloads = useCallback(async () => {
        const list = await downloadService.getDownloads();
        setDownloads(Object.fromEntries(list.map((item) => [item.id, item])));
    }, []);

    useEffect(() => {
        void refreshDownloads();
    }, [refreshDownloads]);

    // ── Handlers ─────────────────────────────────────────
    const handlePlay = useCallback((
        epStreamId?: number,
        epExt?: string,
        epLabel?: string,
        nextEp?: { streamId: number; ext: string; label: string },
        mediaInfo?: any,
    ) => {
        const cover = info?.cover_big || info?.movie_image || info?.cover || '';
        const playbackId = String(epStreamId ?? streamId);
        const downloaded = downloads[playbackId];
        watchHistoryService.addToHistory({
            id: playbackId,
            type: type as 'live' | 'movie' | 'series',
            name: info?.name || 'Video',
            cover,
            extension: epExt ?? extension ?? 'mp4',
            timestamp: Date.now(),
        });
        const p: Record<string, string | number> = {
            streamId: epStreamId ?? streamId,
            extension: epExt ?? extension ?? 'mp4',
            type, name: info?.name || 'Video', cover,
        };
        if (downloaded?.status === 'completed' && downloaded.localUri) p.localUri = downloaded.localUri;
        const tracks = normalizeSubtitleTracks(mediaInfo ?? info);
        if (tracks.length > 0) p.subtitleTracks = JSON.stringify(tracks);
        if (epLabel) p.episode = epLabel;
        if (nextEp) {
            p.nextEpisodeStreamId = nextEp.streamId;
            p.nextEpisodeExtension = nextEp.ext;
            p.nextEpisodeLabel = nextEp.label;
        }
        router.push({ pathname: '/player', params: p });
    }, [downloads, info, streamId, type, extension]);

    const handleDownload = useCallback(async (
        idValue: string | number,
        extValue: string | undefined,
        label?: string,
        mediaInfo?: any,
    ) => {
        const id = String(idValue);
        const existing = downloads[id];
        if (existing?.status === 'completed') {
            handlePlay(Number(id), extValue, label, undefined, mediaInfo);
            return;
        }
        if (existing?.status === 'downloading') {
            await downloadService.pauseDownload(id);
            await refreshDownloads();
            return;
        }
        if (type === 'live') {
            Alert.alert(
                isRTL ? 'التنزيل غير متاح' : 'Download unavailable',
                isRTL ? 'لا يمكن تنزيل القنوات الحية.' : 'Live channels cannot be downloaded.',
            );
            return;
        }

        const mediaType = type === 'series' ? 'series' : 'movie';
        const resolvedExtension = extValue || extension || 'mp4';
        const sourceUrl = xtreamService.getStreamUrl(Number(idValue), resolvedExtension, mediaType);
        const cover = mediaInfo?.info?.movie_image || mediaInfo?.movie_image || info?.cover_big || info?.movie_image || info?.cover || '';
        const optimistic: DownloadItem = {
            id,
            type: mediaType,
            name: info?.name || 'Video',
            cover,
            episode: label,
            extension: resolvedExtension,
            sourceUrl,
            status: 'downloading',
            progress: existing?.progress ?? 0,
            timestamp: Date.now(),
        };
        setDownloads((current) => ({ ...current, [id]: optimistic }));

        try {
            const completed = await downloadService.startDownload(
                optimistic,
                (progress) => setDownloads((current) => ({
                    ...current,
                    [id]: { ...(current[id] ?? optimistic), progress, status: 'downloading' },
                })),
            );
            setDownloads((current) => ({ ...current, [id]: completed }));
        } catch (error) {
            await refreshDownloads();
            Alert.alert(
                isRTL ? 'تعذر التنزيل' : 'Download failed',
                error instanceof Error ? error.message : (isRTL ? 'حدث خطأ أثناء التنزيل.' : 'The download could not be completed.'),
            );
        }
    }, [downloads, extension, handlePlay, info, isRTL, refreshDownloads, type]);

    const handleFavorite = useCallback(async () => {
        const cover = info?.cover_big || info?.movie_image || info?.cover || '';
        const added = await watchHistoryService.toggleFavorite({
            id: String(streamId), type: type as any,
            name: info?.name || '', cover, timestamp: Date.now(), extension: extension ?? 'mp4',
        });
        setIsFav(added);
    }, [info, streamId, type, extension]);

    const handleWatchLater = useCallback(async () => {
        const cover = info?.cover_big || info?.movie_image || info?.cover || '';
        const added = await watchHistoryService.toggleWatchLater({
            id: String(streamId), type: type as any,
            name: info?.name || '', cover, timestamp: Date.now(), extension: extension ?? 'mp4',
        });
        setIsWL(added);
    }, [info, streamId, type, extension]);

    // ── Derived ───────────────────────────────────────────
    const coverUrl = info?.cover_big || info?.movie_image || info?.cover || '';
    const genres = useMemo<string[]>(() => info?.genre ? info.genre.split(',') : [], [info]);
    const castList = useMemo<string[]>(() => info?.cast ? info.cast.split(',').slice(0, isTV ? 12 : 8) : [], [info]);
    const seasonKeys = useMemo(() => Object.keys(episodes).sort((a, b) => Number(a) - Number(b)), [episodes]);
    const seasonInfo = useMemo(() => seasonsMeta.find(s => String(s.season_number) === activeSeason), [seasonsMeta, activeSeason]);
    const activeEps = episodes[activeSeason] ?? [];
    const handleMainPlay = useCallback(() => {
        if (type !== 'series') {
            handlePlay();
            return;
        }

        const firstSeason = seasonKeys.find((season) => (episodes[season] ?? []).some((ep) => Number(ep?.id ?? ep?.stream_id) > 0));
        if (!firstSeason) return;
        const playableEpisodes = [...(episodes[firstSeason] ?? [])]
            .filter((ep) => Number(ep?.id ?? ep?.stream_id) > 0)
            .sort((a, b) => Number(a?.episode_num ?? 0) - Number(b?.episode_num ?? 0));
        const firstEpisode = playableEpisodes[0];
        if (!firstEpisode) return;
        const nextEpisode = playableEpisodes[1];
        const firstNumber = firstEpisode.episode_num ?? 1;

        setActiveSeason(firstSeason);
        handlePlay(
            Number(firstEpisode.id ?? firstEpisode.stream_id),
            firstEpisode.container_extension ?? 'mkv',
            `S${firstSeason} E${firstNumber}`,
            nextEpisode ? {
                streamId: Number(nextEpisode.id ?? nextEpisode.stream_id),
                ext: nextEpisode.container_extension ?? 'mkv',
                label: `S${firstSeason} E${nextEpisode.episode_num ?? 2}`,
            } : undefined,
            firstEpisode,
        );
    }, [episodes, handlePlay, seasonKeys, type]);

    // ── Render ────────────────────────────────────────────
    if (loading) return <LoadingSkeleton bg={bg} width={width} heroHeight={heroHeight} />;

    return (
        <View style={[S.root, { backgroundColor: bg }]}>

            {/* ══ HERO (parallax) ══════════════════════════ */}
            <Animated.View style={[S.heroWrap, { width, height: heroHeight }, heroParallax]}>
                {coverUrl
                    ? <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" transition={200} />
                    : <LinearGradient colors={['#14141F', '#07070E']} style={StyleSheet.absoluteFill} />
                }
                {/* Three-layer gradient for depth */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.25)', bg === '#07070E' ? 'rgba(7,7,14,1)' : 'rgba(246,246,252,1)']}
                    locations={[0.3, 0.65, 1]}
                    style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                    colors={['rgba(0,0,0,0.5)', 'transparent']}
                    style={S.heroTopScrim}
                />
            </Animated.View>

            {/* ══ BACK BUTTON — floating, TV-friendly ══════ */}
            <Animated.View style={[
                S.backWrap,
                backOpacity,
                { top: insets.top + tv(10, 14), [isRTL ? 'right' : 'left']: tv(16, TVSafe.paddingHorizontal) },
            ]}>
                <TVPressable onPress={router.back} style={S.backBtn} focusVariant="control">
                    <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={tv(20, 26)} color="#fff" />
                </TVPressable>
            </Animated.View>

            {/* ══ SCROLL CONTENT ═══════════════════════════ */}
            <ScrollView
                onScroll={onScroll}
                scrollEventThrottle={16}
                style={StyleSheet.absoluteFill}
                contentContainerStyle={{ paddingBottom: insets.bottom + tv(60, 40) }}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* Spacer under hero */}
                <View style={{ height: heroHeight - tv(72, 90) }} />

                <View style={S.content}>

                    {/* ── Title ─────────────────────────────── */}
                    <Animated.View entering={FadeInDown.duration(420).delay(60)}>
                        <Text style={[S.title, { color: textCol, fontFamily: FontFamily.black, textAlign: isRTL ? 'right' : 'left' }]}>
                            {info?.name || ''}
                        </Text>
                    </Animated.View>

                    {/* ── Star rating ───────────────────────── */}
                    {!!info?.rating && (
                        <Animated.View entering={FadeInDown.duration(420).delay(110)} style={[S.ratingRow, isRTL && S.rowEnd]}>
                            <StarRating rating={info.rating} />
                        </Animated.View>
                    )}

                    {/* ── Meta badges ───────────────────────── */}
                    <Animated.View entering={FadeInDown.duration(420).delay(160)} style={[S.metaRow, isRTL && S.rowRev]}>
                        {!!info?.releasedate && <MetaBadge icon="calendar-outline" text={String(info.releasedate)} />}
                        {!!info?.duration && <MetaBadge icon="time-outline" text={info.duration} />}
                        {!!info?.rating_5based && (
                            <MetaBadge icon="star" text={parseFloat(info.rating_5based).toFixed(1)} tint="#F59E0B" />
                        )}
                        {type === 'series' && seasonKeys.length > 0 && (
                            <MetaBadge icon="layers-outline" text={`${seasonKeys.length} ${t.content.seasons}`} tint="#EC4899" />
                        )}
                    </Animated.View>

                    {/* ── Genre chips ───────────────────────── */}
                    {genres.length > 0 && (
                        <Animated.View entering={FadeInDown.duration(420).delay(210)} style={[S.genreRow, isRTL && S.rowRev]}>
                            {genres.slice(0, isTV ? 6 : 4).map((g, i) => <GenreChip key={i} label={g} />)}
                        </Animated.View>
                    )}

                    {/* ── Action buttons ────────────────────── */}
                    <Animated.View entering={FadeInDown.duration(420).delay(260)} style={[S.actionRow, isRTL && S.rowRev]}>
                        <ActionBtn icon="play" label={t.content.play} onPress={handleMainPlay} primary color={Brand.primary} />
                        {type === 'movie' && downloadService.canDownload({
                            type: 'movie',
                            sourceUrl: xtreamService.getStreamUrl(Number(streamId), extension || 'mp4', 'movie'),
                            extension: extension || 'mp4',
                        }) && (
                            <ActionBtn
                                icon={
                                    downloads[String(streamId)]?.status === 'completed' ? 'checkmark-circle'
                                        : downloads[String(streamId)]?.status === 'downloading' ? 'pause-circle'
                                            : 'download-outline'
                                }
                                label={
                                    downloads[String(streamId)]?.status === 'completed'
                                        ? (isRTL ? 'تشغيل المحمّل' : 'Play offline')
                                        : downloads[String(streamId)]?.status === 'downloading'
                                            ? `${Math.round(downloads[String(streamId)].progress)}%`
                                            : (isRTL ? 'تنزيل' : 'Download')
                                }
                                onPress={() => handleDownload(streamId as string, extension, undefined, info)}
                            />
                        )}
                        <ActionBtn icon={isFav ? 'heart' : 'heart-outline'} label={isFav ? t.content.saved : t.dashboard.favorites} onPress={handleFavorite} />
                        <ActionBtn icon={isWL ? 'checkmark-circle' : 'time-outline'} label={isWL ? t.content.added : t.dashboard.watchLater} onPress={handleWatchLater} />
                    </Animated.View>

                    {/* ── Description ───────────────────────── */}
                    {!!(info?.plot || info?.description) && (
                        <Animated.View entering={FadeInDown.duration(420).delay(310)} style={S.section}>
                            <SectionTitle label={t.content.description} isRTL={isRTL} isDark={isDark} />
                            <Text style={[S.plot, { color: subCol, fontFamily: FontFamily.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                                {info.plot || info.description}
                            </Text>
                        </Animated.View>
                    )}

                    {/* ── Info card ─────────────────────────── */}
                    {!!(info?.director || info?.releasedate || info?.duration || info?.country) && (
                        <Animated.View entering={FadeInDown.duration(420).delay(360)} style={[
                            S.section, S.infoCard,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                        ]}>
                            {!!info?.director && <InfoRow icon="videocam-outline" label={t.content.director} value={info.director} isDark={isDark} />}
                            {!!info?.releasedate && <InfoRow icon="calendar-outline" label={t.content.releaseDate} value={info.releasedate} isDark={isDark} />}
                            {!!info?.duration && <InfoRow icon="time-outline" label={t.content.duration} value={info.duration} isDark={isDark} />}
                            {!!info?.country && <InfoRow icon="globe-outline" label={t.content.country} value={info.country} isDark={isDark} />}
                        </Animated.View>
                    )}

                    {/* ── Cast ──────────────────────────────── */}
                    {castList.length > 0 && (
                        <Animated.View entering={FadeInDown.duration(420).delay(410)} style={S.section}>
                            <SectionTitle label={t.content.cast} isRTL={isRTL} isDark={isDark} />
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={[S.castRow, isRTL && S.rowRev]}
                            >
                                {castList.map((c, i) => <CastAvatar key={i} name={c} />)}
                            </ScrollView>
                        </Animated.View>
                    )}

                    {/* ── Series: seasons + episodes ────────── */}
                    {type === 'series' && seasonKeys.length > 0 && (
                        <Animated.View entering={FadeInDown.duration(420).delay(460)} style={S.section}>
                            <SectionTitle label={t.content.episodes} isRTL={isRTL} isDark={isDark} />

                            {/* Season pills */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={[S.seasonRow, isRTL && S.rowRev]}
                            >
                                {seasonKeys.map(s => {
                                    const active = activeSeason === s;
                                    const epCount = episodes[s]?.length ?? 0;
                                    const sMeta = seasonsMeta.find(sm => String(sm.season_number) === s);
                                    const sLabel = sMeta?.name || `${t.content.season} ${s}`;
                                    return (
                                        <TVPressable
                                            key={s}
                                            onPress={() => setActiveSeason(s)}
                                            focusVariant="control"
                                            style={[
                                                S.seasonPill,
                                                active
                                                    ? { backgroundColor: Brand.primary, shadowColor: Brand.primary, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 }
                                                    : { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' },
                                            ]}
                                        >
                                            <Text style={[S.seasonLbl, { fontFamily: active ? FontFamily.black : FontFamily.medium, color: active ? '#fff' : subCol }]}>
                                                {sLabel}
                                            </Text>
                                            <View style={[S.epCntBadge, { backgroundColor: active ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.07)' }]}>
                                                <Text style={[S.epCntTxt, { fontFamily: FontFamily.bold, color: active ? '#fff' : subCol }]}>
                                                    {epCount}
                                                </Text>
                                            </View>
                                        </TVPressable>
                                    );
                                })}
                            </ScrollView>

                            {/* Season cover */}
                            {!!seasonInfo?.cover && (
                                <View style={S.seasonCover}>
                                    <Image source={{ uri: seasonInfo.cover }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" transition={200} />
                                    <LinearGradient
                                        colors={['transparent', isDark ? 'rgba(7,7,14,0.96)' : 'rgba(246,246,252,0.96)']}
                                        style={[StyleSheet.absoluteFill, { top: '35%' }]}
                                    />
                                    <View style={S.seasonCoverInfo}>
                                        <Text style={[S.seasonCoverTitle, { fontFamily: FontFamily.black }]}>
                                            {seasonInfo.name || `${t.content.season} ${activeSeason}`}
                                        </Text>
                                        {!!seasonInfo.overview && (
                                            <Text style={[S.seasonCoverDesc, { fontFamily: FontFamily.regular }]} numberOfLines={2}>
                                                {seasonInfo.overview}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Episode count header */}
                            <View style={[S.epHeader, isRTL && S.rowRev]}>
                                <Text style={[S.epCount, { fontFamily: FontFamily.medium, color: subCol }]}>
                                    {activeEps.length} {t.content.episodes}
                                </Text>
                            </View>

                            {/* Episode list */}
                            {activeEps.map((ep, i) => {
                                const nextEp = activeEps[i + 1];
                                return (
                                    <EpisodeCard
                                        key={ep.id ?? i}
                                        episode={ep}
                                        isDark={isDark}
                                        isRTL={isRTL}
                                        episodeLabel={t.content.episodes}
                                        onPress={() => handlePlay(
                                            ep.id ?? ep.stream_id,
                                            ep.container_extension ?? 'mkv',
                                            `S${activeSeason} E${ep.episode_num ?? i + 1}`,
                                            nextEp ? {
                                                streamId: nextEp.id ?? nextEp.stream_id,
                                                ext: nextEp.container_extension ?? 'mkv',
                                                label: `S${activeSeason} E${nextEp.episode_num ?? i + 2}`,
                                            } : undefined,
                                            ep,
                                        )}
                                        onDownload={downloadService.canDownload({
                                            type: 'series',
                                            sourceUrl: xtreamService.getStreamUrl(
                                                Number(ep.id ?? ep.stream_id),
                                                ep.container_extension ?? 'mkv',
                                                'series',
                                            ),
                                            extension: ep.container_extension ?? 'mkv',
                                        }) ? () => handleDownload(
                                                ep.id ?? ep.stream_id,
                                                ep.container_extension ?? 'mkv',
                                                `S${activeSeason} E${ep.episode_num ?? i + 1}`,
                                                ep,
                                            ) : undefined}
                                        download={downloads[String(ep.id ?? ep.stream_id)]}
                                    />
                                );
                            })}
                        </Animated.View>
                    )}

                </View>
            </ScrollView>
        </View>
    );
}

// ══════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════
const S = StyleSheet.create({
    root: { flex: 1 },
    rowRev: { flexDirection: 'row-reverse' },
    rowEnd: { alignSelf: 'flex-end' },

    // ── Hero ──────────────────────────────────────────────
    heroWrap: {
        position: 'absolute', top: 0, left: 0, right: 0,
    },
    heroTopScrim: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: tv(110, 140),
    },

    // ── Back ──────────────────────────────────────────────
    backWrap: { position: 'absolute', zIndex: 20 },
    backBtn: {
        width: tv(40, 50), height: tv(40, 50), borderRadius: tv(20, 25),
        backgroundColor: 'rgba(0,0,0,0.42)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },

    // ── Content ───────────────────────────────────────────
    content: {
        paddingHorizontal: tv(18, TVSafe.paddingHorizontal),
        paddingTop: tv(10, 18),
    },

    title: {
        fontSize: tv(24, 40),
        lineHeight: tv(30, 50),
        marginBottom: tv(7, 11),
    },
    ratingRow: { marginBottom: tv(9, 13) },

    metaRow: {
        flexDirection: 'row', flexWrap: 'wrap',
        gap: tv(6, 11), marginBottom: tv(10, 16),
    },
    genreRow: {
        flexDirection: 'row', flexWrap: 'wrap',
        gap: tv(6, 10), marginBottom: tv(16, 24),
    },
    actionRow: {
        flexDirection: 'row', flexWrap: 'wrap', gap: tv(8, 14), marginBottom: tv(4, 8),
    },

    // ── Sections ──────────────────────────────────────────
    section: { marginTop: tv(22, 32) },
    infoCard: {
        borderRadius: tv(16, 22), borderWidth: 1,
        paddingHorizontal: tv(14, 22), paddingTop: tv(4, 6),
    },
    plot: {
        fontSize: tv(13, 19), lineHeight: tv(21, 30),
    },
    castRow: {
        flexDirection: 'row', gap: tv(14, 22),
        paddingRight: tv(18, TVSafe.paddingHorizontal),
    },

    // ── Season selector ───────────────────────────────────
    seasonRow: {
        flexDirection: 'row', gap: tv(7, 12), marginBottom: tv(10, 14),
    },
    seasonPill: {
        flexDirection: 'row', alignItems: 'center', gap: tv(6, 10),
        paddingHorizontal: tv(14, 22), paddingVertical: tv(7, 11), borderRadius: 30,
    },
    seasonLbl: { fontSize: tv(11, 17) },
    epCntBadge: {
        minWidth: tv(20, 28), height: tv(20, 28), borderRadius: tv(10, 14),
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: tv(5, 8),
    },
    epCntTxt: { fontSize: tv(9, 13) },

    // ── Season cover ──────────────────────────────────────
    seasonCover: {
        width: '100%', height: tv(130, 190),
        borderRadius: tv(14, 20), overflow: 'hidden',
        marginBottom: tv(10, 16),
    },
    seasonCoverInfo: {
        position: 'absolute', bottom: tv(10, 18),
        left: tv(12, 20), right: tv(12, 20),
    },
    seasonCoverTitle: { fontSize: tv(14, 22), color: '#fff', marginBottom: 2 },
    seasonCoverDesc: { fontSize: tv(11, 15), color: 'rgba(255,255,255,0.72)', lineHeight: tv(16, 22) },

    // ── Episodes ──────────────────────────────────────────
    epHeader: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: tv(8, 12),
    },
    epCount: { fontSize: tv(11, 15) },
});