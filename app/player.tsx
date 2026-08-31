import { TVPressable } from '@/components/shared/TVPressable';
import { MediaTrack, WebVideoPlayer, WebVideoPlayerRef } from '@/components/shared/WebVideoPlayer';
import { ThemedText } from '@/components/themed-text';
import { TVRow } from '@/components/tv/SpatialWrappers';
import { Brand } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { watchHistoryService } from '@/services/watch-history-service';
import { xtreamService } from '@/services/xtream-service';
import { diagnoseNativeAudioError, getNativeMediaContentType } from '@/utils/media-codec';
import type { AudioPlaybackDiagnostic } from '@/utils/media-codec';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    useTVEventHandler as _useTVEventHandler,
    ActivityIndicator,
    FlatList,
    findNodeHandle,
    Platform,
    StatusBar,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, {
    cancelAnimation,
    FadeIn,
    FadeInDown,
    FadeOut,
    interpolateColor,
    SlideInLeft,
    SlideInRight,
    SlideOutLeft,
    SlideOutRight,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const SKIP_SECONDS = 60; // تقديم 60 ثانية 
const TV_SEEK_STEP = 60; // 60 ثانية لكل ضغطة على التلفزيون
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const CONTROLS_TIMEOUT = 5000;
const isTV = Platform.isTV;
const isWeb = Platform.OS === 'web';
const isIOS = Platform.OS === 'ios';
const LIVE_CHANNELS_CACHE_MS = 5 * 60 * 1000;
const CHANNEL_ROW_HEIGHT = isTV ? 62 : 54;
const CHANNEL_ROW_GAP = 5;
const CHANNEL_ROW_TOTAL_HEIGHT = CHANNEL_ROW_HEIGHT + CHANNEL_ROW_GAP;

type LiveChannel = {
    id: string;
    name: string;
    extension: string;
    icon?: string;
    categoryId?: string;
};

let liveChannelsCache: { loadedAt: number; channels: LiveChannel[] } | null = null;
let orientationQueue: Promise<void> = Promise.resolve();

function queueOrientation(lock: ScreenOrientation.OrientationLock): Promise<void> {
    orientationQueue = orientationQueue
        .catch(() => undefined)
        .then(async () => {
            try {
                await ScreenOrientation.lockAsync(lock);
            } catch {
                // Orientation locking is unavailable on web and some devices.
            }
        });
    return orientationQueue;
}

const useTVEventHandler: typeof _useTVEventHandler = isWeb
    ? (_handler) => { /* no-op on web */ }
    : _useTVEventHandler;

function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

type PlayerStatus = 'idle' | 'loading' | 'readyToPlay' | 'error';

// Extracted + memoized so the channel guide (which can hold hundreds of rows)
// doesn't re-render every visible row on every player progress tick — only
// `renderChannelItem`'s own dependencies (active channel, RTL, selection
// handler) changing forces new rows, not every parent re-render.
const ChannelListItem = React.memo(({
    item, index, isActive, isRTL, onPressItem, hasTVPreferredFocus,
}: {
    item: LiveChannel;
    index: number;
    isActive: boolean;
    isRTL: boolean;
    onPressItem: (item: LiveChannel) => void;
    hasTVPreferredFocus: boolean;
}) => {
    const handlePress = useCallback(() => onPressItem(item), [onPressItem, item]);

    // Cross-fade the active-channel highlight instead of an instant style
    // swap. Deliberately NOT an `entering=`/`exiting=` animation - this is a
    // FlatList row, and entering animations firing on every row that mounts
    // while scrolling (rather than just on selection) was the exact anti-
    // pattern removed elsewhere in this app earlier today. `activeProgress`
    // only moves when `isActive` itself changes, never on mount/scroll.
    const activeProgress = useSharedValue(isActive ? 1 : 0);
    useEffect(() => {
        activeProgress.value = withTiming(isActive ? 1 : 0, { duration: 150 });
    }, [isActive]);
    const rowAnimatedStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(activeProgress.value, [0, 1], ['transparent', 'rgba(229,9,20,0.15)']),
        borderColor: interpolateColor(activeProgress.value, [0, 1], ['transparent', 'rgba(229,9,20,0.65)']),
    }));
    const numberAnimatedStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(activeProgress.value, [0, 1], ['rgba(255,255,255,0.08)', Brand.primary]),
    }));

    return (
        <TVPressable
            onPress={handlePress}
            hasTVPreferredFocus={hasTVPreferredFocus}
            focusVariant="card"
            style={[styles.channelListItem, isRTL && styles.rowRTL]}
        >
            {/* TVPressable's own `style` isn't guaranteed to be an Animated
                component on every platform branch, so the animated highlight
                is its own always-mounted overlay here instead - same pattern
                as TVPressable's own focus ring. */}
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.channelListItemHighlight, rowAnimatedStyle]} />
            <Animated.View style={[styles.channelNumber, numberAnimatedStyle]}>
                <ThemedText style={styles.channelNumberText}>{index + 1}</ThemedText>
            </Animated.View>
            <View style={styles.channelListText}>
                <ThemedText style={[styles.channelName, isRTL && styles.textRTL]} numberOfLines={1}>
                    {item.name || `${isRTL ? 'قناة' : 'Channel'} ${index + 1}`}
                </ThemedText>
                <ThemedText style={[styles.channelFormat, isRTL && styles.textRTL]}>
                    {(item.extension || 'LIVE').toUpperCase()}
                </ThemedText>
            </View>
            {isActive && <Ionicons name="play-circle" size={23} color={Brand.primary} />}
        </TVPressable>
    );
});
ChannelListItem.displayName = 'ChannelListItem';

export default function PlayerScreen() {
    const params = useLocalSearchParams();
    const {
        streamId, extension, type, name, cover, episode,
        nextEpisodeStreamId, nextEpisodeExtension, nextEpisodeLabel, localUri,
        subtitleTracks,
    } = params;
    const { t, isRTL } = useLanguage();
    const initialStreamId = String(Array.isArray(streamId) ? streamId[0] : streamId);
    const initialName = String(Array.isArray(name) ? name[0] : name ?? '');
    const initialExtension = String(Array.isArray(extension) ? extension[0] : extension ?? 'm3u8');

    const [playerStatus, setPlayerStatus] = useState<PlayerStatus>('loading');
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const progressRef = useRef({ currentTime: 0, duration: 0 });
    const [playbackRate, setPlaybackRate] = useState(1);
    const [volume, setVolume] = useState(1);

    // ─── Scrubbing (Smart Seek) State ────────────────────────────────────────
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubTimeUI, setScrubTimeUI] = useState(0);
    const scrubTimeRef = useRef(0);
    const isScrubbingRef = useRef(false);
    const scrubTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Focus Tracker (النظام الجذري لمنع هروب التركيز) ─────────────────────
    const [activeFocus, setActiveFocus] = useState<string>('play');
    const tvSeekBarRef = useRef<any>(null);
    const [seekBarNode, setSeekBarNode] = useState<number | null>(null);

    const isLive = type === 'live';
    const [activeLiveChannel, setActiveLiveChannel] = useState({
        id: initialStreamId,
        name: initialName,
        extension: initialExtension,
    });
    const [liveChannels, setLiveChannels] = useState<LiveChannel[]>([]);
    const [fallbackUrls, setFallbackUrls] = useState<string[]>(
        isLive
            ? xtreamService.getLiveStreamFallbackUrls(
                parseInt(initialStreamId, 10),
                isWeb ? initialExtension : 'm3u8',
            )
            : []
    );
    const effectiveStreamId = isLive ? activeLiveChannel.id : initialStreamId;
    const effectiveName = isLive ? activeLiveChannel.name : initialName;
    const effectiveExtension = isLive ? activeLiveChannel.extension : initialExtension;
    const fallbackIndexRef = useRef(0);
    const currentStreamUrlRef = useRef<string>(isLive && fallbackUrls.length > 0 ? fallbackUrls[0] : '');
    const [webSourceUrl, setWebSourceUrl] = useState<string>(isLive && fallbackUrls.length > 0 ? fallbackUrls[0] : '');

    const [showControls, setShowControls] = useState(true);
    const showControlsRef = useRef(true);
    const tvEventHandlerRef = useRef<(evt: { eventType: string }) => void>(() => {});
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
    const [showAudioMenu, setShowAudioMenu] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [showChannelGuide, setShowChannelGuide] = useState(false);
    const [channelSearch, setChannelSearch] = useState('');
    const [showAllChannelsInGuide, setShowAllChannelsInGuide] = useState(false);
    const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState<MediaTrack | null>(null);
    const [selectedAudioTrack, setSelectedAudioTrack] = useState<MediaTrack | null>(null);
    const [availableSubtitleTracks, setAvailableSubtitleTracks] = useState<MediaTrack[]>([]);
    const [availableAudioTracks, setAvailableAudioTracks] = useState<MediaTrack[]>([]);
    const [audioDiagnostic, setAudioDiagnostic] = useState<AudioPlaybackDiagnostic | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [tvSeekFocused, setTvSeekFocused] = useState(false);
    const tvSeekFocusedRef = useRef(false);
    const channelListRef = useRef<FlatList<LiveChannel> | null>(null);
    const channelScrollRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const slidingRef = useRef(false);
    const resumeAppliedRef = useRef(false);
    const videoViewRef = useRef<any>(null);

    // Migrated from React Native's core Animated to reanimated, matching every
    // other animated screen in the app (dashboard/details/login/settings/tab
    // bar all use reanimated already - this was the one file still on the old
    // API).
    const controlsOpacity = useSharedValue(1);
    const livePulseAnim = useSharedValue(1);
    // nextEpSlide is pre-existing: computed and animated (see the
    // showNextEpisode effect below) but not currently consumed by any
    // rendered element - kept as-is for behavior parity, not introduced or
    // removed by this pass.
    const nextEpSlide = useSharedValue(300);
    const controlsAnimatedStyle = useAnimatedStyle(() => ({ opacity: controlsOpacity.value }));
    const liveDotAnimatedStyle = useAnimatedStyle(() => ({ opacity: livePulseAnim.value }));

    const webPlayerRef = useRef<WebVideoPlayerRef>(null);
    const webUiUpdateRef = useRef(0);

    useEffect(() => {
        return () => {
            if (scrubTimeout.current) clearTimeout(scrubTimeout.current);
            if (controlsTimer.current) clearTimeout(controlsTimer.current);
        };
    }, []);

    const configuredSubtitleTracks = useMemo<MediaTrack[]>(() => {
        const raw = Array.isArray(subtitleTracks) ? subtitleTracks[0] : subtitleTracks;
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.filter((track): track is MediaTrack => (
                !!track && typeof track === 'object' && typeof track.uri === 'string'
            ));
        } catch {
            return [];
        }
    }, [subtitleTracks]);

    const localSourceUri = Array.isArray(localUri) ? localUri[0] : localUri;

    const buildNativeSource = useCallback((url: string) => {
        const contentType = getNativeMediaContentType(url, isLive);
        const src: any = { uri: url };
        src.headers = {
            'User-Agent': isIOS
                ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
                : 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
        };
        if (contentType) src.contentType = contentType;
        return src;
    }, [isLive]);

    const videoSource = useMemo(() => {
        let url: string;
        if (localSourceUri) {
            url = localSourceUri;
        } else if (isLive && (webSourceUrl || fallbackUrls.length > 0)) {
            url = webSourceUrl || fallbackUrls[0];
        } else {
            url = xtreamService.getStreamUrl(
                parseInt(effectiveStreamId, 10),
                effectiveExtension,
                type as ('live' | 'movie' | 'series'),
            );
        }
        currentStreamUrlRef.current = url;
        return buildNativeSource(url);
    }, [buildNativeSource, effectiveExtension, effectiveStreamId, fallbackUrls, isLive, localSourceUri, type, webSourceUrl]);

    const videoUrl = typeof videoSource === 'string' ? videoSource : (videoSource?.uri ?? '');

    // `useVideoPlayer` destroys and reconstructs the ENTIRE native player
    // whenever its source argument's JSON representation changes (see
    // expo-video's useReleasingSharedObject/useVideoPlayer implementation).
    // Feeding the live `videoSource` memo in directly meant every channel
    // switch and every fallback attempt tore down and rebuilt the whole
    // decoder pipeline from scratch. Instead the player is constructed once
    // with whatever source was current on mount, and every later source
    // change is driven through `replaceAsync` in the effect below - the same
    // API this file already used successfully for retry - so `expoPlayer`'s
    // identity (and therefore the listener effects keyed on it) stays stable
    // across switches instead of re-subscribing every tap.
    const [initialVideoSource] = useState(() => videoSource);
    const expoPlayer = useVideoPlayer(isWeb ? null : initialVideoSource, (p) => {
        if (!isWeb) {
            p.loop = false;
            p.timeUpdateEventInterval = 1;
            p.audioMixingMode = 'doNotMix';
            p.play();
        }
    });

    const isInitialSourceRef = useRef(true);
    useEffect(() => {
        if (isWeb) return;
        if (isInitialSourceRef.current) {
            isInitialSourceRef.current = false;
            return;
        }
        (async () => {
            try {
                if (typeof (expoPlayer as any).replaceAsync === 'function') {
                    await (expoPlayer as any).replaceAsync(videoSource);
                } else {
                    expoPlayer.replace(videoSource);
                }
                expoPlayer.play();
            } catch {
                // Player may already be released (e.g. screen unmounted mid-switch).
            }
        })();
    }, [videoSource, expoPlayer]);

    // Keep this adapter tied to the current native VideoPlayer. A ref created
    // once here would keep a released SharedObject after source replacement.
    const player = useMemo(() => ({
        play: () => isWeb ? webPlayerRef.current?.play() : expoPlayer.play(),
        pause: () => isWeb ? webPlayerRef.current?.pause() : expoPlayer.pause(),
        seekBy: (secs: number) => isWeb ? webPlayerRef.current?.seekBy(secs) : expoPlayer.seekBy(secs),
        get duration() { return isWeb ? (webPlayerRef.current?.duration || 0) : expoPlayer.duration; },
        get currentTime() { return isWeb ? (webPlayerRef.current?.currentTime || 0) : expoPlayer.currentTime; },
        set currentTime(v) {
            if (isWeb) { if (webPlayerRef.current) webPlayerRef.current.currentTime = v; } else expoPlayer.currentTime = v;
        },
        get playing() { return isWeb ? playing : expoPlayer.playing; },
        get playbackRate() { return isWeb ? (webPlayerRef.current?.playbackRate || 1) : expoPlayer.playbackRate; },
        set playbackRate(v) {
            if (isWeb) { if (webPlayerRef.current) webPlayerRef.current.playbackRate = v; } else expoPlayer.playbackRate = v;
        },
        get volume() { return isWeb ? (webPlayerRef.current?.volume ?? 1) : (expoPlayer as any).volume ?? 1; },
        set volume(v) {
            if (isWeb) { if (webPlayerRef.current) webPlayerRef.current.volume = v; } else (expoPlayer as any).volume = v;
        },
        get subtitleTrack() { return isWeb ? webPlayerRef.current?.subtitleTrack : (expoPlayer as any).subtitleTrack; },
        set subtitleTrack(v) {
            if (isWeb) { if (webPlayerRef.current) webPlayerRef.current.subtitleTrack = v; } else (expoPlayer as any).subtitleTrack = v;
        },
        get availableSubtitleTracks() { return isWeb ? (webPlayerRef.current?.availableSubtitleTracks || []) : ((expoPlayer as any).availableSubtitleTracks || []); },
        get audioTrack() { return isWeb ? webPlayerRef.current?.audioTrack : (expoPlayer as any).audioTrack; },
        set audioTrack(v) {
            if (isWeb) { if (webPlayerRef.current) webPlayerRef.current.audioTrack = v; } else (expoPlayer as any).audioTrack = v;
        },
        get availableAudioTracks() { return isWeb ? (webPlayerRef.current?.availableAudioTracks || []) : ((expoPlayer as any).availableAudioTracks || []); },
    }), [expoPlayer, isWeb, playing]);

    const animateControls = useCallback((show: boolean) => {
        showControlsRef.current = show;
        if (!show) {
            tvSeekFocusedRef.current = false;
            setTvSeekFocused(false);
            setShowSpeedMenu(false);
            setShowSubtitleMenu(false);
            setShowAudioMenu(false);
        } else {
            // إعادة التركيز الافتراضي لزر التشغيل عند فتح الشاشة لتجنب ضياع التركيز
            setActiveFocus('play');
        }
        setShowControls(show);
        controlsOpacity.value = withTiming(show ? 1 : 0, { duration: 250 });
    }, [controlsOpacity]);

    const startControlsTimer = useCallback(() => {
        if (controlsTimer.current) clearTimeout(controlsTimer.current);
        controlsTimer.current = setTimeout(() => animateControls(false), CONTROLS_TIMEOUT);
    }, [animateControls]);

    useEffect(() => {
        if (!showChannelGuide) return;
        if (controlsTimer.current) clearTimeout(controlsTimer.current);
        animateControls(true);
    }, [animateControls, showChannelGuide]);

    useEffect(() => {
        if (!isLive) return;
        if (liveChannelsCache && Date.now() - liveChannelsCache.loadedAt < LIVE_CHANNELS_CACHE_MS) {
            setLiveChannels(liveChannelsCache.channels);
            return;
        }
        let cancelled = false;
        xtreamService.getStreams('live').then((streams) => {
            if (cancelled) return;
            const channels = streams
                .filter((channel) => channel.stream_id != null)
                .map((channel) => ({
                    id: String(channel.stream_id),
                    name: channel.name || '',
                    extension: channel.container_extension || 'm3u8',
                    icon: channel.stream_icon || undefined,
                    categoryId: channel.category_id || undefined,
                }));
            liveChannelsCache = { loadedAt: Date.now(), channels };
            setLiveChannels(channels);
        }).catch(() => undefined);
        return () => { cancelled = true; };
    }, [isLive]);

    // The actual source swap (below) is debounced so a rapid/random flip
    // burst only ever reaches the player once, for the last channel picked -
    // everything in between would just be loaded and immediately replaced
    // again. UI feedback (highlight, loading state, guide close) stays
    // immediate on every tap so flipping still feels instant.
    const pendingSourceSwapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        return () => {
            if (pendingSourceSwapRef.current) clearTimeout(pendingSourceSwapRef.current);
        };
    }, []);

    const selectLiveChannel = useCallback((nextChannel: LiveChannel) => {
        if (!isLive || nextChannel.id === activeLiveChannel.id) return;

        setActiveLiveChannel(nextChannel);
        setAudioDiagnostic(null);
        setAvailableAudioTracks([]);
        setSelectedAudioTrack(null);
        setPlayerStatus('loading');
        if (!isTV) {
            setShowChannelGuide(false);
            setActiveFocus('channelsBtn');
        }
        startControlsTimer();

        if (pendingSourceSwapRef.current) clearTimeout(pendingSourceSwapRef.current);
        pendingSourceSwapRef.current = setTimeout(() => {
            pendingSourceSwapRef.current = null;
            const urls = xtreamService.getLiveStreamFallbackUrls(
                parseInt(nextChannel.id, 10),
                isWeb ? nextChannel.extension : 'm3u8',
            );
            const nextUrl = urls[0] || xtreamService.getStreamUrl(parseInt(nextChannel.id, 10), nextChannel.extension, 'live');

            fallbackIndexRef.current = 0;
            setFallbackUrls(urls.length > 0 ? urls : [nextUrl]);
            currentStreamUrlRef.current = nextUrl;
            setWebSourceUrl(nextUrl);
        }, 180);
    }, [activeLiveChannel.id, isLive, startControlsTimer]);

    // O(1) id -> index lookup instead of scanning the (potentially thousands-long)
    // channel list on every previous/next-channel button press.
    const liveChannelIndexById = useMemo(() => {
        const map = new Map<string, number>();
        liveChannels.forEach((channel, idx) => map.set(channel.id, idx));
        return map;
    }, [liveChannels]);

    const changeLiveChannel = useCallback((direction: -1 | 1) => {
        if (!isLive || liveChannels.length < 2) return;
        const baseIndex = liveChannelIndexById.get(activeLiveChannel.id) ?? 0;
        const nextIndex = (baseIndex + direction + liveChannels.length) % liveChannels.length;
        selectLiveChannel(liveChannels[nextIndex]);
    }, [activeLiveChannel.id, isLive, liveChannels, liveChannelIndexById, selectLiveChannel]);

    const handleTvSeekFocusChange = useCallback((focused: boolean) => {
        tvSeekFocusedRef.current = focused;
        setTvSeekFocused(focused);
        if (focused) startControlsTimer();
    }, [startControlsTimer]);

    const handleTvSeekKey = useCallback((direction: 'left' | 'right') => {
        const step = direction === 'right' ? TV_SEEK_STEP : -TV_SEEK_STEP;

        if (!isScrubbingRef.current) {
            isScrubbingRef.current = true;
            setIsScrubbing(true);
            scrubTimeRef.current = progressRef.current.currentTime;
        }

        const currentDuration = progressRef.current.duration || duration;
        scrubTimeRef.current = Math.max(0, Math.min(currentDuration, scrubTimeRef.current + step));
        setScrubTimeUI(scrubTimeRef.current);

        startControlsTimer();

        if (scrubTimeout.current) clearTimeout(scrubTimeout.current);
        scrubTimeout.current = setTimeout(() => {
            isScrubbingRef.current = false;
            setIsScrubbing(false);
            player.currentTime = scrubTimeRef.current;
            setCurrentTime(scrubTimeRef.current);
            progressRef.current.currentTime = scrubTimeRef.current;
        }, 600);
    }, [duration, startControlsTimer, player]);

    // Kept as a ref-backed stable callback: react-native's useTVEventHandler
    // tears down and re-registers the native remote-control listener whenever
    // the handler's identity changes (its effect deps on the callback). This
    // component re-renders on every D-pad focus move (activeFocus state), so
    // an inline handler here was churning that native subscription on every
    // single remote press - the ref keeps the identity passed to
    // useTVEventHandler permanently stable while still running current logic.
    tvEventHandlerRef.current = (evt) => {
        if (!isTV) return;
        if (isLocked) return;
        if (showChannelGuide) return;

        if (!showControlsRef.current) {
            if (isLive && evt.eventType === 'left') {
                changeLiveChannel(-1);
                return;
            }
            if (isLive && evt.eventType === 'right') {
                changeLiveChannel(1);
                return;
            }
            if (evt.eventType === 'left' || evt.eventType === 'right') return;
            animateControls(true);
            startControlsTimer();
            return;
        }

        switch (evt.eventType) {
            case 'right':
            case 'left':
                if (isLive) {
                    changeLiveChannel(evt.eventType === 'right' ? 1 : -1);
                } else if (tvSeekFocusedRef.current && (type === 'movie' || type === 'series')) {
                    handleTvSeekKey(evt.eventType);
                } else {
                    startControlsTimer();
                }
                break;
            case 'playPause':
                handlePlayPause();
                break;
            default:
                startControlsTimer();
                break;
        }
    };

    useTVEventHandler(useCallback((evt) => tvEventHandlerRef.current(evt), []));

    useEffect(() => {
        if (!isTV || !isWeb) return;

        const onKeyDown = (evt: KeyboardEvent) => {
            if (isLocked) return;
            if (!showControlsRef.current) return;
            if (!tvSeekFocusedRef.current) return;
            if (type !== 'movie' && type !== 'series') return;

            if (evt.key === 'ArrowRight' || evt.key === 'Right') {
                evt.preventDefault();
                handleTvSeekKey('right');
            } else if (evt.key === 'ArrowLeft' || evt.key === 'Left') {
                evt.preventDefault();
                handleTvSeekKey('left');
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleTvSeekKey, isLocked, type]);

    useEffect(() => {
        if (type !== 'live') return;
        livePulseAnim.value = withRepeat(
            withSequence(
                withTiming(0.2, { duration: 900 }),
                withTiming(1, { duration: 900 }),
            ),
            -1,
        );
        return () => { cancelAnimation(livePulseAnim); };
    }, []);

    const tryNextFallback = useCallback(() => {
        if (!isLive || fallbackUrls.length === 0) return false;

        const nextIdx = fallbackIndexRef.current + 1;
        if (nextIdx >= fallbackUrls.length) return false;

        fallbackIndexRef.current = nextIdx;
        const nextUrl = fallbackUrls[nextIdx];

        currentStreamUrlRef.current = nextUrl;
        setAvailableAudioTracks([]);
        setSelectedAudioTrack(null);
        setAudioDiagnostic(null);
        setWebSourceUrl(nextUrl);
        setPlayerStatus('loading');

        return true;
    }, [isLive, fallbackUrls]);

    const tryNextAudioSource = useCallback(() => {
        if (!isLive || fallbackUrls.length < 2) return;
        if (fallbackIndexRef.current >= fallbackUrls.length - 1) {
            fallbackIndexRef.current = -1;
        }
        setAudioDiagnostic(null);
        tryNextFallback();
        startControlsTimer();
    }, [fallbackUrls.length, isLive, startControlsTimer, tryNextFallback]);

    useEffect(() => {
        if (isWeb) return;
        const sub = expoPlayer.addListener('statusChange', ({ status, error }) => {
            if (status !== 'error') {
                setPlayerStatus(status as PlayerStatus);
                return;
            }

            if (isLive && fallbackIndexRef.current < fallbackUrls.length - 1) {
                if (tryNextFallback()) return;
            }

            const audioError = diagnoseNativeAudioError(error?.message);
            if (audioError) setAudioDiagnostic(audioError);
            setPlayerStatus('error');
        });
        setPlayerStatus(expoPlayer.status as PlayerStatus);
        return () => { try { sub.remove(); } catch { /* released across a source replace */ } };
    }, [expoPlayer, fallbackUrls.length, isLive, tryNextFallback]);

    useEffect(() => {
        if (isWeb) return;
        const sub = expoPlayer.addListener('playingChange', ({ isPlaying }) => {
            setPlaying(isPlaying);
        });
        setPlaying(expoPlayer.playing);
        return () => { try { sub.remove(); } catch { /* released across a source replace */ } };
    }, [expoPlayer]);

    useEffect(() => {
        if (isWeb) return;

        const updateAudioTracks = (tracks: Array<{ id?: string; language?: string; label?: string }>) => {
            const normalizedTracks = tracks.map((track) => ({
                id: track.id || track.language || track.label || '',
                language: track.language || '',
                label: track.label || track.language || '',
            }));
            setAvailableAudioTracks(normalizedTracks);
            if (normalizedTracks.length > 0) setAudioDiagnostic(null);
        };

        const tracksSub = expoPlayer.addListener('availableAudioTracksChange', ({ availableAudioTracks: tracks }) => {
            updateAudioTracks(tracks);
        });
        const sourceSub = expoPlayer.addListener('sourceLoad', ({ availableAudioTracks: tracks }) => {
            updateAudioTracks(tracks);
        });
        updateAudioTracks(expoPlayer.availableAudioTracks);
        return () => {
            try { tracksSub.remove(); } catch { /* released across a source replace */ }
            try { sourceSub.remove(); } catch { /* released across a source replace */ }
        };
    }, [expoPlayer]);

    useEffect(() => {
        if (isWeb) return;

        let lastUIUpdate = 0;
        const TV_UI_INTERVAL = isTV ? 2000 : 200;

        const sub = expoPlayer.addListener('timeUpdate', ({ currentTime: ct }) => {
            const d = expoPlayer.duration;
            const now = Date.now();

            progressRef.current = { currentTime: ct, duration: Number.isFinite(d) ? d : 0 };

            if (!slidingRef.current && !isScrubbingRef.current) {
                if (now - lastUIUpdate >= TV_UI_INTERVAL) {
                    lastUIUpdate = now;
                    setCurrentTime(ct);
                    if (Number.isFinite(d) && d > 0) setDuration(d);
                }
            }
        });
        return () => { try { sub.remove(); } catch { /* released across a source replace */ } };
    }, [expoPlayer]);

    useEffect(() => {
        if (playerStatus === 'readyToPlay') {
            const d = player.duration;
            if (Number.isFinite(d) && d > 0) setDuration(d);
            setCurrentTime(player.currentTime);
            setAvailableSubtitleTracks(
                isWeb
                    ? (player.availableSubtitleTracks ?? configuredSubtitleTracks)
                    : (player.availableSubtitleTracks ?? []),
            );
            const audioTracks = player.availableAudioTracks ?? [];
            setAvailableAudioTracks(audioTracks);
            // Media3 sometimes plays a stream successfully (video renders, no
            // error ever fires) while silently dropping an audio track it
            // can't decode - no PlaybackException, just no sound. A hard error
            // is what the statusChange listener above catches; this is the
            // "looks fine but is silently mute" case, surfaced here as a
            // diagnostic since there's no fallback engine left to switch to.
            if (audioTracks.length === 0) {
                setAudioDiagnostic({ status: 'missing' });
            }
            const contentType = type as string;
            if ((contentType === 'movie' || contentType === 'series') && !resumeAppliedRef.current) {
                resumeAppliedRef.current = true;
                watchHistoryService.getHistory().then((list) => {
                    const item = list.find((i) => i.id === String(streamId));
                    if (item?.progress != null && item.progress > 5 && Number.isFinite(d)) {
                        const seekTo = (item.progress / 100) * d;
                        player.currentTime = seekTo;
                        setCurrentTime(seekTo);
                    }
                });
            }
        }
    }, [configuredSubtitleTracks, isWeb, playerStatus]);

    useFocusEffect(useCallback(() => {
        if (isTV) return undefined;
        void queueOrientation(ScreenOrientation.OrientationLock.LANDSCAPE);
        return () => {
            void queueOrientation(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        };
    }, []));

    const saveProgress = useCallback(() => {
        const contentType = type as string;
        if (contentType !== 'movie' && contentType !== 'series') return;
        const d = progressRef.current.duration;
        const ct = progressRef.current.currentTime;
        if (!Number.isFinite(d) || d <= 0 || !Number.isFinite(ct)) return;
        const progress = Math.min(100, (ct / d) * 100);
        const coverUrl = (Array.isArray(cover) ? cover[0] : cover) as string | undefined;
        watchHistoryService.addToHistory({
            id: String(streamId),
            type: type as 'live' | 'movie' | 'series',
            name: (Array.isArray(name) ? name[0] : name) as string,
            cover: coverUrl || '',
            progress,
            episode: (Array.isArray(episode) ? episode[0] : episode) as string | undefined,
            extension: (Array.isArray(extension) ? extension[0] : extension) as string | undefined,
            timestamp: Date.now(),
        });
    }, []);

    useEffect(() => {
        return () => { saveProgress(); };
    }, []);

    const toggleControls = useCallback(() => {
        if (isLocked) return;
        const next = !showControlsRef.current;
        animateControls(next);
        if (next) startControlsTimer();
    }, [isLocked, animateControls, startControlsTimer]);

    const handleBack = useCallback(async () => {
        player.pause();
        saveProgress();
        if (!isTV) {
            await queueOrientation(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        }
        router.back();
    }, [player, saveProgress]);

    const handleRetry = useCallback(async () => {
        if (isLive && fallbackUrls.length > 0) {
            fallbackIndexRef.current = 0;
            const firstUrl = fallbackUrls[0];
            const isSameSource = currentStreamUrlRef.current === firstUrl;
            currentStreamUrlRef.current = firstUrl;
            setPlayerStatus('loading');
            if (isWeb) {
                if (isSameSource) {
                    webPlayerRef.current?.replace(firstUrl);
                } else {
                    setWebSourceUrl(firstUrl);
                }
            } else {
                const source = buildNativeSource(firstUrl);
                if (typeof (expoPlayer as any).replaceAsync === 'function') {
                    await (expoPlayer as any).replaceAsync(source);
                } else {
                    expoPlayer.replace(source);
                }
                expoPlayer.play();
            }
        } else {
            setPlayerStatus('loading');
            if (isWeb) {
                webPlayerRef.current?.replace(videoUrl);
            } else {
                const source = buildNativeSource(videoUrl);
                if (typeof (expoPlayer as any).replaceAsync === 'function') {
                    await (expoPlayer as any).replaceAsync(source);
                } else {
                    expoPlayer.replace(source);
                }
                expoPlayer.play();
            }
        }
    }, [buildNativeSource, expoPlayer, fallbackUrls, isLive, videoUrl]);

    const handlePlayPause = useCallback(() => {
        player.playing ? player.pause() : player.play();
        startControlsTimer();
    }, [player, startControlsTimer]);

    const seekBack = useCallback(() => { player.seekBy(-SKIP_SECONDS); startControlsTimer(); }, [player, startControlsTimer]);
    const seekForward = useCallback(() => { player.seekBy(SKIP_SECONDS); startControlsTimer(); }, [player, startControlsTimer]);

    const handleSpeedSelect = useCallback((rate: number) => {
        player.playbackRate = rate;
        setPlaybackRate(rate);
        setShowSpeedMenu(false);
        setActiveFocus('speedChip'); // العودة للزر بعد الاختيار
        startControlsTimer();
    }, [player, startControlsTimer]);

    const handleVolumeChange = useCallback((v: number) => {
        const clamped = Math.max(0, Math.min(1, v));
        player.volume = clamped;
        setVolume(clamped);
        startControlsTimer();
    }, [player, startControlsTimer]);

    const toggleMute = useCallback(() => {
        handleVolumeChange(volume > 0 ? 0 : 1);
    }, [volume, handleVolumeChange]);

    const handleSubtitleSelect = useCallback((track: MediaTrack | null) => {
        (player as any).subtitleTrack = track;
        setSelectedSubtitleTrack(track);
        setShowSubtitleMenu(false);
        setActiveFocus('subtitleChip'); // العودة للزر بعد الاختيار
        startControlsTimer();
    }, [player, startControlsTimer]);

    const handleAudioSelect = useCallback((track: MediaTrack | null) => {
        (player as any).audioTrack = track;
        setSelectedAudioTrack(track);
        setShowAudioMenu(false);
        setActiveFocus('audioChip');
        startControlsTimer();
    }, [player, startControlsTimer]);

    const onSliderSlidingStart = useCallback(() => { slidingRef.current = true; }, []);
    const onSliderSlidingComplete = useCallback((value: number) => {
        player.currentTime = value;
        setCurrentTime(value);
        slidingRef.current = false;
        startControlsTimer();
    }, [player, startControlsTimer]);

    const toggleLock = useCallback(() => {
        setIsLocked((prev) => {
            if (!prev) {
                animateControls(false);
            } else {
                animateControls(true);
                startControlsTimer();
            }
            return !prev;
        });
    }, [animateControls, startControlsTimer]);

    const isVod = type === 'movie' || type === 'series';
    const showProgress = isVod && duration > 0;

    const displayTime = isScrubbing ? scrubTimeUI : currentTime;
    const tvProgressPercent = duration > 0 ? Math.min(100, (displayTime / duration) * 100) : 0;

    const nextEpisodeId = nextEpisodeStreamId != null ? String(Array.isArray(nextEpisodeStreamId) ? nextEpisodeStreamId[0] : nextEpisodeStreamId) : null;
    const nextEpisodeExt = nextEpisodeExtension != null ? (Array.isArray(nextEpisodeExtension) ? nextEpisodeExtension[0] : nextEpisodeExtension) as string : undefined;
    const nextEpisodeName = nextEpisodeLabel != null ? (Array.isArray(nextEpisodeLabel) ? nextEpisodeLabel[0] : nextEpisodeLabel) as string : undefined;
    const showNextEpisode = type === 'series' && nextEpisodeId && nextEpisodeName && showProgress && duration > 0 && (duration - currentTime) < 20;

    useEffect(() => {
        nextEpSlide.value = withSpring(showNextEpisode ? 0 : 300, { damping: 16, stiffness: 120 });
    }, [showNextEpisode]);

    const isLoading = playerStatus === 'loading';
    const isError = playerStatus === 'error';
    const debouncedChannelSearch = useDebouncedValue(channelSearch, 200);

    // Guide defaults to the currently-playing channel's category — with
    // thousands of live channels on some providers, listing everything made
    // the guide (and scrolling to the current channel within it) very slow.
    const activeChannelCategoryId = useMemo(() => {
        const idx = liveChannelIndexById.get(activeLiveChannel.id);
        return idx !== undefined ? liveChannels[idx]?.categoryId : undefined;
    }, [liveChannelIndexById, liveChannels, activeLiveChannel.id]);

    const guideBaseChannels = useMemo(() => {
        if (showAllChannelsInGuide || !activeChannelCategoryId) return liveChannels;
        return liveChannels.filter((channel) => channel.categoryId === activeChannelCategoryId);
    }, [liveChannels, showAllChannelsInGuide, activeChannelCategoryId]);

    const filteredLiveChannels = useMemo(() => {
        const query = debouncedChannelSearch.trim().toLocaleLowerCase();
        if (!query) return guideBaseChannels;
        return guideBaseChannels.filter((channel) => channel.name.toLocaleLowerCase().includes(query));
    }, [debouncedChannelSearch, guideBaseChannels]);

    const channelGetItemLayout = useCallback((_data: unknown, index: number) => ({
        length: CHANNEL_ROW_TOTAL_HEIGHT,
        offset: CHANNEL_ROW_TOTAL_HEIGHT * index,
        index,
    }), []);

    const renderChannelItem = useCallback(({ item, index }: { item: LiveChannel; index: number }) => (
        <ChannelListItem
            item={item}
            index={index}
            isActive={item.id === activeLiveChannel.id}
            isRTL={isRTL}
            onPressItem={selectLiveChannel}
            hasTVPreferredFocus={isTV && item.id === activeLiveChannel.id}
        />
    ), [activeLiveChannel.id, isRTL, selectLiveChannel]);

    const scrollToCurrentChannel = useCallback(() => {
        if (!showChannelGuide) return;
        const currentIndex = filteredLiveChannels.findIndex((channel) => channel.id === activeLiveChannel.id);
        if (currentIndex < 0) return;

        channelListRef.current?.scrollToIndex({
            index: currentIndex,
            animated: false,
            viewPosition: 0.45,
        });
    }, [activeLiveChannel.id, filteredLiveChannels, showChannelGuide]);

    useEffect(() => {
        if (!showChannelGuide) return;
        setShowAllChannelsInGuide(false);
        if (channelScrollRetryRef.current) clearTimeout(channelScrollRetryRef.current);
        channelScrollRetryRef.current = setTimeout(scrollToCurrentChannel, 0);
        return () => {
            if (channelScrollRetryRef.current) clearTimeout(channelScrollRetryRef.current);
        };
        // Intentionally re-runs only when the guide opens or the channel list itself
        // (re)loads — not on every keystroke/category-toggle, which would otherwise
        // keep yanking the user's scroll position back to the current channel.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showChannelGuide, liveChannels]);

    const speedMenuItems = useMemo(() => SPEED_OPTIONS.map((rate) => (
        <TVPressable
            key={rate}
            style={[styles.menuItem, playbackRate === rate && styles.menuItemActive]}
            onPress={() => handleSpeedSelect(rate)}
            onFocus={() => { setActiveFocus(`speedItem_${rate}`); startControlsTimer(); }}
            hasTVPreferredFocus={isTV && showSpeedMenu && (activeFocus === `speedItem_${rate}` || (activeFocus === 'speedChip' && playbackRate === rate))}
            focusVariant="control"
        >
            <ThemedText style={[styles.menuItemText, playbackRate === rate && styles.menuItemTextActive]}>
                {rate}x
            </ThemedText>
            {playbackRate === rate && (
                <Ionicons name="checkmark" size={16} color={Brand.primary} />
            )}
        </TVPressable>
    )), [playbackRate, handleSpeedSelect, showSpeedMenu, activeFocus, startControlsTimer]);

    return (
        <View style={styles.container}>
            <StatusBar hidden />

            {isWeb ? (
                <WebVideoPlayer
                    ref={webPlayerRef}
                    source={webSourceUrl || videoUrl}
                    isLive={isLive}
                    subtitleTracks={configuredSubtitleTracks}
                    style={StyleSheet.absoluteFill}
                    onStatusChange={(status) => {
                        if (status === 'error' && isLive && fallbackIndexRef.current < fallbackUrls.length - 1) {
                            const didFallback = tryNextFallback();
                            if (didFallback) return;
                        }
                        setPlayerStatus(status);
                    }}
                    onPlayingChange={(isPlaying) => setPlaying(isPlaying)}
                    onTimeUpdate={(c, d) => {
                        progressRef.current = { currentTime: c, duration: Number.isFinite(d) ? d : 0 };
                        if (!slidingRef.current && !isScrubbingRef.current) {
                            const now = Date.now();
                            const webUiInterval = isTV ? 2000 : 200;
                            if (now - webUiUpdateRef.current >= webUiInterval) {
                                webUiUpdateRef.current = now;
                                setCurrentTime(c);
                                if (Number.isFinite(d) && d > 0) setDuration(d);
                            }
                        }
                    }}
                    onTracksChange={(subtitles, audio) => {
                        setAvailableSubtitleTracks(subtitles);
                        setAvailableAudioTracks(audio);
                    }}
                    onAudioStatusChange={(status, codec) => {
                        setAudioDiagnostic(status === 'detected' ? null : { status, codec });
                        if (status === 'unsupported' && isLive) {
                            tryNextFallback();
                        }
                    }}
                />
            ) : (
                <VideoView
                    ref={videoViewRef}
                    player={expoPlayer}
                    style={StyleSheet.absoluteFill}
                    contentFit="contain"
                    nativeControls={false}
                />
            )}

            <TVPressable
                focusVariant="control"
                focusStyle={isTV ? styles.fullScreenNoFocusRing : undefined}
                style={StyleSheet.absoluteFill}
                onPress={toggleControls}
            >
                    {!isError && (
                        <Animated.View
                            style={[StyleSheet.absoluteFill, controlsAnimatedStyle]}
                            pointerEvents={showControls ? 'box-none' : 'none'}
                        >
                        <LinearGradient
                            colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.4)', 'transparent']}
                            style={styles.topGradient}
                        >
                            <View style={[styles.header, isRTL && styles.headerRTL]}>
                                <TVPressable 
                                    onPress={handleBack} 
                                    onFocus={() => { setActiveFocus('backBtn'); startControlsTimer(); }}
                                    hasTVPreferredFocus={isTV && activeFocus === 'backBtn'}
                                    style={styles.iconBtn} 
                                    focusVariant="control"
                                >
                                    <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={26} color="#fff" />
                                </TVPressable>
                                <View style={[styles.titleWrap, isRTL && styles.titleWrapRTL]}>
                                    <ThemedText style={[styles.title, isRTL && styles.textRTL]} numberOfLines={1}>
                                        {effectiveName}
                                    </ThemedText>
                                    {episode && (
                                        <ThemedText style={[styles.episodeLabel, isRTL && styles.textRTL]} numberOfLines={1}>
                                            {episode}
                                        </ThemedText>
                                    )}
                                </View>
                                <View style={[styles.headerActions, isRTL && styles.headerActionsRTL]}>
                                    {isLive && (
                                        <TVPressable
                                            onPress={() => {
                                                setShowChannelGuide((visible) => !visible);
                                                animateControls(true);
                                            }}
                                            onFocus={() => { setActiveFocus('channelsBtn'); startControlsTimer(); }}
                                            hasTVPreferredFocus={isTV && activeFocus === 'channelsBtn'}
                                            style={[styles.iconBtn, showChannelGuide && styles.iconBtnActive]}
                                            focusVariant="control"
                                        >
                                            <Ionicons name="list-outline" size={21} color="#fff" />
                                        </TVPressable>
                                    )}
                                    <TVPressable 
                                        onPress={toggleLock} 
                                        onFocus={() => { setActiveFocus('lockBtn'); startControlsTimer(); }}
                                        hasTVPreferredFocus={isTV && activeFocus === 'lockBtn'}
                                        style={styles.iconBtn} 
                                        focusVariant="control"
                                    >
                                        <Ionicons name={isLocked ? 'lock-closed' : 'lock-open-outline'} size={20} color="#fff" />
                                    </TVPressable>
                                    {!isTV && (
                                        <TVPressable onPress={() => videoViewRef.current?.enterFullscreen?.()} style={styles.iconBtn} focusVariant="control">
                                            <Ionicons name="expand-outline" size={20} color="#fff" />
                                        </TVPressable>
                                    )}
                                </View>
                            </View>
                        </LinearGradient>

                        <View style={styles.centerControls} pointerEvents="box-none">
                            {isLive && (
                                <TVPressable
                                    onPress={() => changeLiveChannel(-1)}
                                    onFocus={() => { setActiveFocus('previousChannel'); startControlsTimer(); }}
                                    hasTVPreferredFocus={isTV && activeFocus === 'previousChannel'}
                                    style={styles.channelBtn}
                                    focusVariant="control"
                                >
                                    <Ionicons name="play-skip-back" size={26} color="#fff" />
                                    <ThemedText style={styles.channelBtnLabel}>{isRTL ? 'السابقة' : 'Previous'}</ThemedText>
                                </TVPressable>
                            )}
                            {isVod && (
                                <TVPressable 
                                    onPress={seekBack} 
                                    onFocus={() => { setActiveFocus('seekBackBtn'); startControlsTimer(); }}
                                    hasTVPreferredFocus={isTV && activeFocus === 'seekBackBtn'}
                                    style={styles.seekBtn} 
                                    focusVariant="control"
                                >
                                    <Ionicons name="play-back" size={24} color="rgba(255,255,255,0.9)" />
                                    <ThemedText style={styles.seekLabel}>{SKIP_SECONDS}</ThemedText>
                                </TVPressable>
                            )}
                            <TVPressable 
                                onPress={handlePlayPause} 
                                onFocus={() => { setActiveFocus('play'); startControlsTimer(); }}
                                hasTVPreferredFocus={isTV && activeFocus === 'play'}
                                style={styles.playBtn} 
                                focusVariant="control" 
                            >
                                <Ionicons
                                    name={playing ? 'pause' : 'play'}
                                    size={38}
                                    color="#fff"
                                    style={!playing && styles.playIconOffset}
                                />
                            </TVPressable>
                            {isVod && (
                                <TVPressable 
                                    onPress={seekForward} 
                                    onFocus={() => { setActiveFocus('seekForwardBtn'); startControlsTimer(); }}
                                    hasTVPreferredFocus={isTV && activeFocus === 'seekForwardBtn'}
                                    style={styles.seekBtn} 
                                    focusVariant="control"
                                >
                                    <Ionicons name="play-forward" size={24} color="rgba(255,255,255,0.9)" />
                                    <ThemedText style={styles.seekLabel}>{SKIP_SECONDS}</ThemedText>
                                </TVPressable>
                            )}
                            {isLive && (
                                <TVPressable
                                    onPress={() => changeLiveChannel(1)}
                                    onFocus={() => { setActiveFocus('nextChannel'); startControlsTimer(); }}
                                    hasTVPreferredFocus={isTV && activeFocus === 'nextChannel'}
                                    style={styles.channelBtn}
                                    focusVariant="control"
                                >
                                    <Ionicons name="play-skip-forward" size={26} color="#fff" />
                                    <ThemedText style={styles.channelBtnLabel}>{isRTL ? 'التالية' : 'Next'}</ThemedText>
                                </TVPressable>
                            )}
                        </View>

                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.92)']}
                            style={styles.bottomGradient}
                        >
                            {type === 'live' && (
                                <View style={[styles.liveRow, isRTL && styles.rowRTL]}>
                                    <View style={styles.liveBadge}>
                                        <Animated.View style={[styles.liveDot, liveDotAnimatedStyle]} />
                                        <ThemedText style={styles.liveText}>{t.player.live}</ThemedText>
                                    </View>
                                    {audioDiagnostic && (
                                        <View style={styles.audioWarning}>
                                            <Ionicons name="volume-mute-outline" size={16} color="#FBBF24" />
                                            <ThemedText style={styles.audioWarningText}>
                                                {audioDiagnostic.status === 'unsupported'
                                                    ? `${isRTL ? 'ترميز الصوت غير مدعوم' : 'Unsupported audio codec'}${audioDiagnostic.codec ? `: ${audioDiagnostic.codec}` : ''}`
                                                    : (isRTL ? 'لم يتم اكتشاف مسار صوت' : 'No audio track detected')}
                                            </ThemedText>
                                        </View>
                                    )}
                                </View>
                            )}

                            {showProgress && (
                                <View style={styles.progressArea}>
                                    {isTV ? (
                                        /* ── شريط التقدم ── */
                                        <TVPressable
                                            ref={tvSeekBarRef}
                                            onLayout={() => {
                                                const node = findNodeHandle(tvSeekBarRef.current);
                                                if (node && node !== seekBarNode) setSeekBarNode(node);
                                            }}
                                            nextFocusLeft={seekBarNode || undefined}
                                            nextFocusRight={seekBarNode || undefined}
                                            onFocus={() => { 
                                                handleTvSeekFocusChange(true); 
                                                setActiveFocus('progressBar'); 
                                            }}
                                            onBlur={() => handleTvSeekFocusChange(false)}
                                            hasTVPreferredFocus={isScrubbing || (isTV && activeFocus === 'progressBar')}
                                            style={styles.tvSeekBar}
                                            focusVariant="control"
                                            focusStyle={styles.fullScreenNoFocusRing}
                                        >
                                            <View style={[
                                                styles.tvProgressTrack,
                                                tvSeekFocused && styles.tvProgressTrackFocused,
                                            ]}>
                                                <View style={[
                                                    styles.tvProgressFill,
                                                    { width: `${tvProgressPercent}%` },
                                                ]} />
                                                <View style={[
                                                    styles.tvProgressThumb,
                                                    { left: `${tvProgressPercent}%` },
                                                ]} />
                                            </View>
                                        </TVPressable>
                                    ) : (
                                        <View style={styles.sliderRow}>
                                            <Slider
                                                style={styles.slider}
                                                value={displayTime}
                                                minimumValue={0}
                                                maximumValue={Math.max(duration, 1)}
                                                minimumTrackTintColor={Brand.primary}
                                                maximumTrackTintColor="rgba(255,255,255,0.15)"
                                                thumbTintColor="#fff"
                                                onSlidingStart={onSliderSlidingStart}
                                                onSlidingComplete={onSliderSlidingComplete}
                                                onValueChange={(v) => setCurrentTime(v)}
                                            />
                                        </View>
                                    )}
                                    <View style={[styles.timeRow, isRTL && styles.rowRTL]}>
                                        <ThemedText style={styles.timeCurrent}>{formatTime(displayTime)}</ThemedText>
                                        <View style={styles.timeDivider} />
                                        <ThemedText style={styles.timeDuration}>{formatTime(duration)}</ThemedText>
                                        {isTV && (
                                            <ThemedText style={styles.tvSeekHint}>
                                                {'◄ ► للتقديم والرجوع'}
                                            </ThemedText>
                                        )}
                                    </View>
                                </View>
                            )}

                            <TVRow style={[styles.bottomActions, isRTL && styles.rowRTL]}>
                                <View style={[styles.chipGroup, isRTL && styles.rowRTL]}>
                                    {isVod && (
                                        <TVPressable
                                            style={[styles.actionChip, showSpeedMenu && styles.actionChipActive]}
                                            onPress={() => { setShowSpeedMenu(!showSpeedMenu); setShowSubtitleMenu(false); setShowAudioMenu(false); setShowVolumeSlider(false); }}
                                            onFocus={() => { setActiveFocus('speedChip'); startControlsTimer(); }}
                                            hasTVPreferredFocus={isTV && activeFocus === 'speedChip'}
                                            focusVariant="control"
                                        >
                                            <Ionicons name="speedometer-outline" size={15} color="#fff" />
                                            <ThemedText style={styles.chipText}>{playbackRate}x</ThemedText>
                                        </TVPressable>
                                    )}
                                    <TVPressable
                                        style={[styles.actionChip, showSubtitleMenu && styles.actionChipActive]}
                                        onPress={() => { setShowSubtitleMenu(!showSubtitleMenu); setShowSpeedMenu(false); setShowAudioMenu(false); setShowVolumeSlider(false); }}
                                        onFocus={() => { setActiveFocus('subtitleChip'); startControlsTimer(); }}
                                        hasTVPreferredFocus={isTV && activeFocus === 'subtitleChip'}
                                        focusVariant="control"
                                    >
                                        <Ionicons name="text-outline" size={15} color="#fff" />
                                        <ThemedText style={styles.chipText}>{t.player.subtitles}</ThemedText>
                                    </TVPressable>

                                    {availableAudioTracks.length > 0 && (
                                        <TVPressable
                                            style={[styles.actionChip, showAudioMenu && styles.actionChipActive]}
                                            onPress={() => { setShowAudioMenu(!showAudioMenu); setShowSpeedMenu(false); setShowSubtitleMenu(false); setShowVolumeSlider(false); }}
                                            onFocus={() => { setActiveFocus('audioChip'); startControlsTimer(); }}
                                            hasTVPreferredFocus={isTV && activeFocus === 'audioChip'}
                                            focusVariant="control"
                                        >
                                            <Ionicons name="language-outline" size={15} color="#fff" />
                                            <ThemedText style={styles.chipText}>{isRTL ? 'الصوت' : 'Audio'}</ThemedText>
                                        </TVPressable>
                                    )}

                                    {isLive && fallbackUrls.length > 1 && (
                                        <TVPressable
                                            style={styles.actionChip}
                                            onPress={tryNextAudioSource}
                                            onFocus={() => { setActiveFocus('audioSourceChip'); startControlsTimer(); }}
                                            hasTVPreferredFocus={isTV && activeFocus === 'audioSourceChip'}
                                            focusVariant="control"
                                        >
                                            <Ionicons name="swap-horizontal-outline" size={15} color="#fff" />
                                            <ThemedText style={styles.chipText}>{isRTL ? 'توافق الصوت' : 'Audio source'}</ThemedText>
                                        </TVPressable>
                                    )}

                                    {!isTV && (
                                        <TVPressable
                                            style={[styles.actionChip, showVolumeSlider && styles.actionChipActive]}
                                            onPress={() => { setShowVolumeSlider(!showVolumeSlider); setShowSpeedMenu(false); setShowSubtitleMenu(false); setShowAudioMenu(false); }}
                                            onLongPress={toggleMute}
                                            focusVariant="control"
                                        >
                                            <Ionicons name={volume === 0 ? 'volume-mute' : volume < 0.5 ? 'volume-low' : 'volume-high'} size={15} color="#fff" />
                                            <ThemedText style={styles.chipText}>{t.player.volume}</ThemedText>
                                        </TVPressable>
                                    )}
                                </View>
                                {!showProgress && (
                                    <View style={styles.qualityPill}>
                                        <ThemedText style={styles.qualityPillText}>HD</ThemedText>
                                    </View>
                                )}
                            </TVRow>
                        </LinearGradient>

                        {showSpeedMenu && (
                            <Animated.View
                                entering={FadeIn.duration(150)}
                                exiting={FadeOut.duration(120)}
                                style={[styles.menuCard, isRTL && styles.menuCardRTL]}
                            >
                                {speedMenuItems}
                            </Animated.View>
                        )}

                        {showSubtitleMenu && (
                            <Animated.View
                                entering={FadeIn.duration(150)}
                                exiting={FadeOut.duration(120)}
                                style={[styles.menuCard, isRTL && styles.menuCardRTL]}
                            >
                                <TVPressable
                                    style={[styles.menuItem, !selectedSubtitleTrack && styles.menuItemActive]}
                                    onPress={() => handleSubtitleSelect(null)}
                                    onFocus={() => { setActiveFocus('subItem_none'); startControlsTimer(); }}
                                    hasTVPreferredFocus={isTV && showSubtitleMenu && (activeFocus === 'subItem_none' || (activeFocus === 'subtitleChip' && !selectedSubtitleTrack))}
                                    focusVariant="control"
                                >
                                    <ThemedText style={[styles.menuItemText, !selectedSubtitleTrack && styles.menuItemTextActive]}>
                                        {t.player.noSubtitles}
                                    </ThemedText>
                                    {!selectedSubtitleTrack && <Ionicons name="checkmark" size={16} color={Brand.primary} />}
                                </TVPressable>
                                {availableSubtitleTracks.map(
                                    (track, idx) => {
                                        const isActive = selectedSubtitleTrack?.id
                                            ? selectedSubtitleTrack.id === track.id
                                            : selectedSubtitleTrack?.language === track.language;
                                        return (
                                            <TVPressable
                                                key={`${track.language ?? 'track'}_${idx}`}
                                                style={[styles.menuItem, isActive && styles.menuItemActive]}
                                                onPress={() => handleSubtitleSelect(track)}
                                                onFocus={() => { setActiveFocus(`subItem_${idx}`); startControlsTimer(); }}
                                                hasTVPreferredFocus={isTV && showSubtitleMenu && (activeFocus === `subItem_${idx}` || (activeFocus === 'subtitleChip' && isActive))}
                                                focusVariant="control"
                                            >
                                                <ThemedText style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                                                    {track.label ?? track.language ?? 'Track'}
                                                </ThemedText>
                                                {isActive && <Ionicons name="checkmark" size={16} color={Brand.primary} />}
                                            </TVPressable>
                                        );
                                    },
                                )}
                            </Animated.View>
                        )}

                        {showAudioMenu && (
                            <Animated.View
                                entering={FadeIn.duration(150)}
                                exiting={FadeOut.duration(120)}
                                style={[styles.menuCard, styles.audioMenuCard, isRTL && styles.menuCardRTL]}
                            >
                                {availableAudioTracks.map((track, idx) => {
                                    const isActive = selectedAudioTrack?.id
                                        ? selectedAudioTrack.id === track.id
                                        : selectedAudioTrack?.language === track.language;
                                    return (
                                        <TVPressable
                                            key={`${track.id ?? track.language ?? 'audio'}_${idx}`}
                                            style={[styles.menuItem, isActive && styles.menuItemActive]}
                                            onPress={() => handleAudioSelect(track)}
                                            onFocus={() => { setActiveFocus(`audioItem_${idx}`); startControlsTimer(); }}
                                            hasTVPreferredFocus={isTV && showAudioMenu && (activeFocus === `audioItem_${idx}` || (activeFocus === 'audioChip' && isActive))}
                                            focusVariant="control"
                                        >
                                            <ThemedText style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                                                {track.label ?? track.language ?? `${isRTL ? 'مسار' : 'Track'} ${idx + 1}`}
                                            </ThemedText>
                                            {isActive && <Ionicons name="checkmark" size={16} color={Brand.primary} />}
                                        </TVPressable>
                                    );
                                })}
                            </Animated.View>
                        )}

                        {!isTV && showVolumeSlider && (
                            <Animated.View
                                entering={FadeIn.duration(150)}
                                exiting={FadeOut.duration(120)}
                                style={[styles.volumeContainer, isRTL && styles.volumeContainerRTL]}
                            >
                                <ThemedText style={styles.volumePercent}>{Math.round(volume * 100)}%</ThemedText>
                                <Ionicons name="volume-high" size={14} color="rgba(255,255,255,0.6)" />
                                <View style={styles.volumeSliderWrap}>
                                    <Slider
                                        style={styles.volumeSlider}
                                        value={volume}
                                        minimumValue={0}
                                        maximumValue={1}
                                        step={0.05}
                                        minimumTrackTintColor={Brand.primary}
                                        maximumTrackTintColor="rgba(255,255,255,0.15)"
                                        thumbTintColor="#fff"
                                        onValueChange={handleVolumeChange}
                                    />
                                </View>
                                <Ionicons name="volume-mute" size={14} color="rgba(255,255,255,0.6)" />
                            </Animated.View>
                        )}
                        </Animated.View>
                    )}
            </TVPressable>

            {isLive && showChannelGuide && (
                <Animated.View
                    entering={(isRTL ? SlideInLeft : SlideInRight).duration(280)}
                    exiting={(isRTL ? SlideOutLeft : SlideOutRight).duration(220)}
                    style={[styles.channelGuide, isRTL ? styles.channelGuideRTL : styles.channelGuideLTR]}
                >
                    <View style={[styles.channelGuideHeader, isRTL && styles.rowRTL]}>
                        <View style={styles.channelGuideTitleWrap}>
                            <ThemedText style={[styles.channelGuideTitle, isRTL && styles.textRTL]}>
                                {isRTL ? 'القنوات المباشرة' : 'Live channels'}
                            </ThemedText>
                            <ThemedText style={[styles.channelGuideCount, isRTL && styles.textRTL]}>
                                {filteredLiveChannels.length}
                            </ThemedText>
                        </View>
                        <TVPressable
                            style={styles.channelGuideClose}
                            onPress={() => {
                                setShowChannelGuide(false);
                                setActiveFocus('channelsBtn');
                                animateControls(true);
                                startControlsTimer();
                            }}
                            focusVariant="control"
                        >
                            <Ionicons name="close" size={22} color="#fff" />
                        </TVPressable>
                    </View>
                    {!isTV && (
                        <View style={[styles.channelSearch, isRTL && styles.rowRTL]}>
                            <Ionicons name="search" size={18} color="rgba(255,255,255,0.55)" />
                            <TextInput
                                value={channelSearch}
                                onChangeText={setChannelSearch}
                                placeholder={isRTL ? 'ابحث عن قناة' : 'Search channels'}
                                placeholderTextColor="rgba(255,255,255,0.38)"
                                style={[styles.channelSearchInput, isRTL && styles.textRTL]}
                            />
                        </View>
                    )}
                    {!!activeChannelCategoryId && (
                        <TVPressable
                            style={[styles.channelGuideScopeToggle, isRTL && styles.rowRTL]}
                            onPress={() => setShowAllChannelsInGuide((v) => !v)}
                            focusVariant="control"
                        >
                            <Ionicons
                                name={showAllChannelsInGuide ? 'albums-outline' : 'list-outline'}
                                size={14}
                                color={Brand.primary}
                            />
                            <ThemedText style={styles.channelGuideScopeToggleText}>
                                {showAllChannelsInGuide
                                    ? (isRTL ? 'عرض هذا التصنيف فقط' : 'Show this category only')
                                    : (isRTL ? 'عرض كل القنوات' : 'Show all channels')}
                            </ThemedText>
                        </TVPressable>
                    )}
                    <FlatList
                        ref={channelListRef}
                        data={filteredLiveChannels}
                        keyExtractor={(item) => item.id}
                        initialNumToRender={18}
                        windowSize={7}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.channelListContent}
                        getItemLayout={channelGetItemLayout}
                        onScrollToIndexFailed={({ index }) => {
                            channelScrollRetryRef.current = setTimeout(() => {
                                channelListRef.current?.scrollToIndex({
                                    index,
                                    animated: false,
                                    viewPosition: 0.45,
                                });
                            }, 80);
                        }}
                        renderItem={renderChannelItem}
                    />
                </Animated.View>
            )}

            {isLocked && (
                <View style={[styles.lockFloating, isRTL && styles.lockFloatingRTL]}>
                    <TVPressable onPress={toggleLock} style={styles.lockFloatingBtn} focusVariant="control">
                        <Ionicons name="lock-closed" size={18} color="rgba(255,255,255,0.8)" />
                    </TVPressable>
                </View>
            )}

            {isLoading && (
                <Animated.View
                    entering={FadeIn.duration(180)}
                    exiting={FadeOut.duration(150)}
                    style={styles.loadingOverlay}
                >
                    <View style={styles.loadingCard}>
                        <View style={styles.spinnerRing}>
                            <ActivityIndicator size="large" color={Brand.primary} />
                        </View>
                        <ThemedText style={styles.loadingText}>{t.player.loading}</ThemedText>
                    </View>
                </Animated.View>
            )}

            {isError && (
                <Animated.View
                    entering={FadeIn.duration(180)}
                    exiting={FadeOut.duration(150)}
                    style={styles.errorOverlay}
                >
                    <Animated.View entering={FadeInDown.duration(250)} style={styles.errorCard}>
                        <View style={styles.errorIconWrap}>
                            <Ionicons name="alert-circle" size={44} color={Brand.primary} />
                        </View>
                        <ThemedText style={styles.errorTitle}>
                            {audioDiagnostic?.status === 'unsupported' && audioDiagnostic.codec === 'MP2'
                                ? (isRTL ? 'صوت MP2 غير مدعوم' : 'MP2 audio is unsupported')
                                : t.player.error}
                        </ThemedText>
                        <ThemedText style={styles.errorMsg}>
                            {audioDiagnostic?.status === 'unsupported'
                                ? `${isRTL ? 'تعذر على مشغل الجهاز فك ترميز الصوت' : 'The device player could not decode the audio'}${audioDiagnostic.codec ? ` (${audioDiagnostic.codec})` : ''}.`
                                : t.player.errorMessage}
                        </ThemedText>
                        <TVPressable style={styles.retryBtn} onPress={handleRetry} focusVariant="card">
                            <Ionicons name="refresh" size={20} color="#fff" />
                            <ThemedText style={styles.retryBtnText}>{t.player.retry}</ThemedText>
                        </TVPressable>
                        <TVPressable style={styles.backBtn} onPress={handleBack} focusVariant="control">
                            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={16} color="rgba(255,255,255,0.6)" />
                            <ThemedText style={styles.backBtnText}>{t.player.back}</ThemedText>
                        </TVPressable>
                    </Animated.View>
                </Animated.View>
            )}
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    fullScreenNoFocusRing: { borderWidth: 0, borderColor: 'transparent', borderRadius: 0 },
    topGradient: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: isIOS ? 12 : 10, paddingHorizontal: 16, paddingBottom: 48, zIndex: 2 },
    header: { flexDirection: 'row', alignItems: 'center' },
    headerRTL: { flexDirection: 'row-reverse' },
    iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    iconBtnActive: { backgroundColor: Brand.primary, borderColor: 'rgba(255,255,255,0.35)' },
    titleWrap: { flex: 1, marginHorizontal: 14 },
    titleWrapRTL: { alignItems: 'flex-end' },
    title: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
    textRTL: { textAlign: 'right' },
    episodeLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2, fontWeight: '500' },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerActionsRTL: { flexDirection: 'row-reverse' },
    centerControls: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 44 },
    channelBtn: {
        minWidth: isTV ? 126 : 86,
        height: isTV ? 66 : 56,
        paddingHorizontal: isTV ? 18 : 12,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.62)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    channelBtnLabel: { color: '#fff', fontSize: isTV ? 13 : 10, fontWeight: '700' },
    channelGuide: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: isTV ? '36%' : '82%',
        maxWidth: isTV ? 520 : 420,
        backgroundColor: 'rgba(8,8,14,0.97)',
        borderColor: 'rgba(255,255,255,0.1)',
        zIndex: 30,
        elevation: 30,
        paddingTop: isIOS ? 18 : 12,
    },
    channelGuideLTR: { left: 0, borderRightWidth: 1 },
    channelGuideRTL: { right: 0, borderLeftWidth: 1 },
    channelGuideHeader: { minHeight: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    channelGuideTitleWrap: { flex: 1 },
    channelGuideTitle: { color: '#fff', fontSize: isTV ? 20 : 17, fontWeight: '800' },
    channelGuideCount: { color: 'rgba(255,255,255,0.46)', fontSize: 11, marginTop: 2 },
    channelGuideClose: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    channelSearch: { marginHorizontal: 12, marginBottom: 10, height: 42, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)', flexDirection: 'row', alignItems: 'center', gap: 8 },
    channelSearchInput: { flex: 1, height: '100%', color: '#fff', fontSize: 14 },
    channelGuideScopeToggle: { marginHorizontal: 12, marginBottom: 10, alignSelf: 'flex-start', paddingHorizontal: 10, height: 30, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)', flexDirection: 'row', alignItems: 'center', gap: 6 },
    channelGuideScopeToggleText: { color: Brand.primary, fontSize: 12, fontWeight: '600' },
    channelListContent: { paddingHorizontal: 10, paddingBottom: 24 },
    channelListItem: { minHeight: isTV ? 62 : 54, borderRadius: 12, paddingHorizontal: 10, marginBottom: 5, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: 'transparent' },
    // Shape-only (no margin/padding/flex) - this backs an absolutely
    // positioned overlay that cross-fades the active-row highlight, so it
    // must not carry any layout properties that would fight `absoluteFill`.
    channelListItemHighlight: { borderRadius: 12, borderWidth: 1 },
    channelNumber: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
    channelNumberText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    channelListText: { flex: 1 },
    channelName: { color: '#fff', fontSize: isTV ? 15 : 13, fontWeight: '700' },
    channelFormat: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', marginTop: 2 },
    seekBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    seekLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '800', marginTop: -2 },
    playBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: Brand.primary, justifyContent: 'center', alignItems: 'center', shadowColor: Brand.primary, shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
    playIconOffset: { marginLeft: 4 },
    bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: isIOS ? 12 : 14, paddingHorizontal: 20, paddingTop: 56, zIndex: 2 },
    liveRow: { flexDirection: 'row', marginBottom: 14 },
    audioWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 6,
        backgroundColor: 'rgba(120,75,0,0.55)',
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.38)',
    },
    audioWarningText: { color: '#FDE68A', fontSize: isTV ? 12 : 10, fontWeight: '700' },
    rowRTL: { flexDirection: 'row-reverse' },
    liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Brand.primary, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, gap: 7, shadowColor: Brand.primary, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
    liveText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
    progressArea: { marginBottom: 10 },
    sliderRow: { height: 28, justifyContent: 'center' },
    slider: { width: '100%', height: 28 },
    tvSeekBar: { paddingVertical: 10 },
    tvProgressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'visible', position: 'relative' },
    tvProgressTrackFocused: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)' },
    tvProgressFill: { height: '100%', backgroundColor: Brand.primary, borderRadius: 2 },
    tvProgressThumb: { position: 'absolute', top: -4, width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', marginLeft: -6, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
    tvSeekHint: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '500', marginLeft: 'auto' },
    timeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, gap: 8 },
    timeCurrent: { color: '#fff', fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
    timeDivider: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.3)' },
    timeDuration: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '500', fontVariant: ['tabular-nums'] },
    bottomActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    chipGroup: { flexDirection: 'row', gap: 8 },
    actionChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 22, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    actionChipActive: { borderColor: Brand.primary, backgroundColor: 'rgba(229,9,20,0.12)' },
    chipText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    qualityPill: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    qualityPillText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
    menuCard: { position: 'absolute', bottom: isIOS ? 70 : 66, left: 20, backgroundColor: 'rgba(15,15,25,0.96)', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 4, minWidth: 130, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 16, zIndex: 10 },
    menuCardRTL: { left: undefined, right: 20 },
    audioMenuCard: { left: 170 },
    volumeContainer: { position: 'absolute', bottom: isIOS ? 70 : 66, right: 20, backgroundColor: 'rgba(15,15,25,0.96)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, flexDirection: 'column', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 16, zIndex: 10 },
    volumeContainerRTL: { right: undefined, left: 20 },
    volumePercent: { color: '#fff', fontSize: 11, fontWeight: '700' },
    volumeSliderWrap: { height: 120, width: 34, justifyContent: 'center', alignItems: 'center' },
    volumeSlider: { width: 120, height: 34, transform: [{ rotate: '-90deg' }] },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
    menuItemActive: { backgroundColor: 'rgba(229,9,20,0.15)' },
    menuItemText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
    menuItemTextActive: { color: Brand.primary, fontWeight: '700' },
    lockFloating: { position: 'absolute', bottom: 48, left: 20 },
    lockFloatingRTL: { left: undefined, right: 20 },
    lockFloatingBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    loadingCard: { alignItems: 'center', backgroundColor: 'rgba(10,10,15,0.7)', paddingHorizontal: 36, paddingVertical: 28, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    spinnerRing: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(229,9,20,0.08)', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: 'rgba(255,255,255,0.7)', marginTop: 16, fontSize: 13, fontWeight: '500', letterSpacing: 0.3 },
    errorOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    errorCard: { alignItems: 'center', backgroundColor: 'rgba(18,18,28,0.95)', borderRadius: 28, padding: 36, maxWidth: 360, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 10 }, elevation: 16 },
    errorIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(229,9,20,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    errorTitle: { color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: 0.3 },
    errorMsg: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 21 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Brand.primary, paddingVertical: 13, paddingHorizontal: 30, borderRadius: 16, marginTop: 28, gap: 8, shadowColor: Brand.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
    retryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    backBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, gap: 6 },
    backBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500' },
});