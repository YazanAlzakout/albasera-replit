import Hls from 'hls.js';
import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';

/* eslint-disable no-console */
const devLog = (...args: unknown[]) => { if (__DEV__) console.log(...args); };
const devWarn = (...args: unknown[]) => { if (__DEV__) console.warn(...args); };
const devError = (...args: unknown[]) => { if (__DEV__) console.error(...args); };
/* eslint-enable no-console */

function isAudioCodecSupported(codec?: string): boolean | null {
    const normalized = codec?.trim().toLowerCase();
    if (!normalized) return null;

    let mimeType: string | null = null;
    if (/^(?:ac-?3|ac3)$/.test(normalized)) mimeType = 'audio/mp4; codecs="ac-3"';
    else if (/^(?:e-?ac-?3|ec-?3|eac3)$/.test(normalized)) mimeType = 'audio/mp4; codecs="ec-3"';
    else if (/^(?:mp2|mpga|mpeg(?:-| )?audio|mpeg1layer2)$/.test(normalized)) mimeType = 'audio/mpeg; codecs="mp2"';
    else if (/^(?:mp3|mpeg1layer3)$/.test(normalized)) mimeType = 'audio/mpeg';
    else if (/^(?:aac|mp4a)(?:[.\w-]+)?$/.test(normalized)) mimeType = 'audio/mp4; codecs="mp4a.40.2"';
    else if (/^opus/.test(normalized)) mimeType = 'audio/webm; codecs="opus"';
    if (!mimeType) return null;

    return document.createElement('audio').canPlayType(mimeType) !== '';
}

export interface MediaTrack {
    id?: string;
    language?: string;
    label?: string;
    uri?: string;
    mimeType?: string;
}

export interface WebVideoPlayerRef {
    play: () => void;
    pause: () => void;
    seekBy: (secs: number) => void;
    replace: (url: string) => void;
    currentTime: number;
    duration: number;
    playbackRate: number;
    volume: number;
    subtitleTrack: MediaTrack | null;
    availableSubtitleTracks: MediaTrack[];
    audioTrack: MediaTrack | null;
    availableAudioTracks: MediaTrack[];
}

interface WebVideoPlayerProps {
    source: string;
    isLive?: boolean;
    subtitleTracks?: MediaTrack[];
    style?: any;
    onStatusChange?: (status: 'idle' | 'loading' | 'readyToPlay' | 'error') => void;
    onPlayingChange?: (isPlaying: boolean) => void;
    onTimeUpdate?: (currentTime: number, duration: number) => void;
    onError?: () => void;
    onTracksChange?: (subtitleTracks: MediaTrack[], audioTracks: MediaTrack[]) => void;
    onAudioStatusChange?: (status: 'detected' | 'missing' | 'unsupported', codec?: string) => void;
}

export const WebVideoPlayer = React.forwardRef<WebVideoPlayerRef, WebVideoPlayerProps>((props, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    // Use `any` to avoid importing mpegts types at module level (causes SSR "window is not defined")
    const mpegtsPlayerRef = useRef<any>(null);
    const subtitleTracksRef = useRef<MediaTrack[]>(props.subtitleTracks ?? []);
    const selectedSubtitleRef = useRef<MediaTrack | null>(null);
    const audioTracksRef = useRef<MediaTrack[]>([]);
    const selectedAudioRef = useRef<MediaTrack | null>(null);
    const trackElementsRef = useRef<HTMLTrackElement[]>([]);
    const subtitleBlobUrlsRef = useRef<string[]>([]);
    const hlsRecoveryAttemptsRef = useRef(0);
    const sourceGenerationRef = useRef(0);
    const mediaListenerCleanupRef = useRef<(() => void) | null>(null);
    const [resolvedSubtitleTracks, setResolvedSubtitleTracks] = useState<MediaTrack[]>(props.subtitleTracks ?? []);

    /** Destroy any active demuxer instance (hls.js or mpegts.js) */
    const destroyDemuxers = () => {
        mediaListenerCleanupRef.current?.();
        mediaListenerCleanupRef.current = null;
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        if (mpegtsPlayerRef.current) {
            try {
                mpegtsPlayerRef.current.pause();
                mpegtsPlayerRef.current.unload();
                mpegtsPlayerRef.current.detachMediaElement();
                mpegtsPlayerRef.current.destroy();
            } catch (_) { /* ignore */ }
            mpegtsPlayerRef.current = null;
        }
        const video = videoRef.current;
        if (video) {
            video.removeAttribute('src');
            video.load();
        }
    };

    useImperativeHandle(ref, () => ({
        play: () => {
            videoRef.current?.play().catch(e => devLog('Autoplay blocked:', e));
        },
        pause: () => {
            videoRef.current?.pause();
        },
        seekBy: (secs: number) => {
            if (videoRef.current) {
                videoRef.current.currentTime += secs;
            }
        },
        replace: (url: string) => {
            loadSource(url);
        },
        get currentTime() {
            return videoRef.current?.currentTime || 0;
        },
        set currentTime(val: number) {
            if (videoRef.current) {
                videoRef.current.currentTime = val;
            }
        },
        get duration() {
            return videoRef.current?.duration || 0;
        },
        get playbackRate() {
            return videoRef.current?.playbackRate || 1;
        },
        set playbackRate(val: number) {
            if (videoRef.current) {
                videoRef.current.playbackRate = val;
            }
        },
        get volume() {
            return videoRef.current?.volume ?? 1;
        },
        set volume(val: number) {
            if (videoRef.current) {
                videoRef.current.volume = Math.max(0, Math.min(1, val));
            }
        },
        get subtitleTrack() {
            return selectedSubtitleRef.current;
        },
        set subtitleTrack(value: MediaTrack | null) {
            selectedSubtitleRef.current = value;
            trackElementsRef.current.forEach((element, index) => {
                const track = subtitleTracksRef.current[index];
                const isSelected = !!value && track?.id === value.id;
                element.track.mode = isSelected ? 'showing' : 'disabled';
            });
        },
        get availableSubtitleTracks() {
            return subtitleTracksRef.current;
        },
        get audioTrack() {
            return selectedAudioRef.current;
        },
        set audioTrack(value: MediaTrack | null) {
            selectedAudioRef.current = value;
            const index = value ? audioTracksRef.current.findIndex((track) => track.id === value.id) : -1;
            if (hlsRef.current && index >= 0) hlsRef.current.audioTrack = index;
            const nativeTracks = (videoRef.current as any)?.audioTracks;
            if (nativeTracks && index >= 0) {
                for (let i = 0; i < nativeTracks.length; i += 1) nativeTracks[i].enabled = i === index;
            }
        },
        get availableAudioTracks() {
            return audioTracksRef.current;
        },
    }));

    const loadSource = (url: string) => {
        const video = videoRef.current;
        if (!video) return;
        const generation = ++sourceGenerationRef.current;
        const isCurrentSource = () => (
            sourceGenerationRef.current === generation && videoRef.current === video
        );

        destroyDemuxers();
        hlsRecoveryAttemptsRef.current = 0;
        props.onStatusChange?.('loading');

        const isM3u8 = /\.m3u8(?:$|[?#])/i.test(url);
        const isTs = /\.ts(?:$|[?#])/i.test(url);

        // ─── HLS via hls.js ──────────────────────────────────────
        if (isM3u8 && Hls.isSupported()) {
            const hls = new Hls({
                maxBufferLength: props.isLive ? 10 : 30,
                backBufferLength: props.isLive ? 10 : 30,
                liveSyncDurationCount: props.isLive ? 3 : undefined,
                liveMaxLatencyDurationCount: props.isLive ? 6 : undefined,
            });
            hlsRef.current = hls;
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (!isCurrentSource()) return;
                const tracks = (hls.audioTracks ?? []).map((track: any, index: number) => ({
                    id: String(index),
                    language: track.lang,
                    label: track.name || track.lang || `Audio ${index + 1}`,
                }));
                audioTracksRef.current = tracks;
                const codec = hls.levels.find((level) => !!level.audioCodec)?.audioCodec;
                const codecSupported = isAudioCodecSupported(codec);
                props.onAudioStatusChange?.(
                    codecSupported === false ? 'unsupported' : tracks.length > 0 || !!codec ? 'detected' : 'missing',
                    codec,
                );
                props.onTracksChange?.(subtitleTracksRef.current, tracks);
                props.onStatusChange?.('readyToPlay');
                video.play().catch(e => devLog('HLS Autoplay prevented:', e));
            });
            hls.on(Hls.Events.ERROR, (_event, data) => {
                if (!isCurrentSource()) return;
                if (data.fatal) {
                    if (hlsRecoveryAttemptsRef.current < 1 && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        hlsRecoveryAttemptsRef.current += 1;
                        hls.startLoad();
                        return;
                    }
                    if (hlsRecoveryAttemptsRef.current < 1 && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        hlsRecoveryAttemptsRef.current += 1;
                        hls.recoverMediaError();
                        return;
                    }
                    devError('HLS fatal playback error:', data.type, data.details);
                    props.onStatusChange?.('error');
                    props.onError?.();
                }
            });
            return;
        }

        // ─── Native HLS (Safari) ─────────────────────────────────
        if (isM3u8 && video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            let errorReported = false;
            const onLoaded = () => {
                if (!isCurrentSource()) return;
                props.onStatusChange?.('readyToPlay');
                video.play().catch(e => devLog('Native HLS Autoplay prevented:', e));
                video.removeEventListener('loadedmetadata', onLoaded);
            };
            const onError = () => {
                if (!isCurrentSource() || errorReported) return;
                errorReported = true;
                cleanup();
                props.onStatusChange?.('error');
                props.onError?.();
            };
            const cleanup = () => {
                video.removeEventListener('loadedmetadata', onLoaded);
                video.removeEventListener('error', onError);
                if (mediaListenerCleanupRef.current === cleanup) mediaListenerCleanupRef.current = null;
            };
            mediaListenerCleanupRef.current = cleanup;
            video.addEventListener('loadedmetadata', onLoaded);
            video.addEventListener('error', onError);
            return;
        }

        // ─── MPEG-TS via mpegts.js (dynamic import to avoid SSR error) ──
        if (isTs) {
            // Dynamic import so mpegts.js is never evaluated at module-load time
            import('mpegts.js').then((mpegts) => {
                if (!isCurrentSource()) return;
                if (!mpegts.default.isSupported()) {
                    devWarn('mpegts.js not supported, falling back to direct src');
                    loadDirectSrc(url, isCurrentSource);
                    return;
                }
                const player = mpegts.default.createPlayer(
                    { type: 'mpegts', isLive: props.isLive ?? true, url },
                    {
                        enableWorker: true,
                        liveBufferLatencyChasing: true,
                        liveBufferLatencyMaxLatency: 3,
                        liveBufferLatencyMinRemain: 0.5,
                    }
                );
                if (!isCurrentSource()) {
                    player.destroy();
                    return;
                }
                mpegtsPlayerRef.current = player;
                player.attachMediaElement(video);
                player.load();
                player.on(mpegts.default.Events.MEDIA_INFO, (mediaInfo: any) => {
                    if (!isCurrentSource()) return;
                    const codec = String(mediaInfo?.audioCodec ?? '');
                    const codecSupported = isAudioCodecSupported(codec);
                    props.onAudioStatusChange?.(
                        mediaInfo?.hasAudio === false ? 'missing' : codecSupported === false ? 'unsupported' : 'detected',
                        codec || undefined,
                    );
                });
                player.on(mpegts.default.Events.ERROR, (errorType: string, errorDetail: string) => {
                    if (!isCurrentSource()) return;
                    devError('mpegts.js Error:', errorType, errorDetail);
                    props.onStatusChange?.('error');
                    props.onError?.();
                });
                const onCanPlay = () => {
                    if (!isCurrentSource()) return;
                    props.onStatusChange?.('readyToPlay');
                    video.play().catch(e => devLog('mpegts Autoplay prevented:', e));
                    video.removeEventListener('canplay', onCanPlay);
                };
                video.addEventListener('canplay', onCanPlay);
            }).catch((e) => {
                if (!isCurrentSource()) return;
                devError('mpegts.js import failed:', e);
                loadDirectSrc(url, isCurrentSource);
            });
            return;
        }

        // ─── Fallback: direct <video> src ────────────────────────
        loadDirectSrc(url, isCurrentSource);
    };

    /** Last-resort: set video.src directly and hope the browser can play it */
    const loadDirectSrc = (url: string, isCurrentSource: () => boolean = () => true) => {
        const video = videoRef.current;
        if (!video || !isCurrentSource()) return;
        video.src = url;
        let errorReported = false;
        const onLoaded = () => {
            if (!isCurrentSource()) return;
            props.onStatusChange?.('readyToPlay');
            video.play().catch(e => devLog('Direct Autoplay prevented:', e));
            video.removeEventListener('loadedmetadata', onLoaded);
        };
        const onErr = () => {
            if (!isCurrentSource() || errorReported) return;
            errorReported = true;
            devError('Direct video source failed to load.');
            cleanup();
            props.onStatusChange?.('error');
            props.onError?.();
        };
        const cleanup = () => {
            video.removeEventListener('loadedmetadata', onLoaded);
            video.removeEventListener('error', onErr);
            if (mediaListenerCleanupRef.current === cleanup) mediaListenerCleanupRef.current = null;
        };
        mediaListenerCleanupRef.current = cleanup;
        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('error', onErr);
    };

    useEffect(() => {
        let cancelled = false;
        subtitleBlobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        subtitleBlobUrlsRef.current = [];

        const resolveTracks = async () => {
            const tracks = await Promise.all((props.subtitleTracks ?? []).map(async (track) => {
                if (!track.uri || !/\.srt(?:$|[?#])/i.test(track.uri)) return track;
                try {
                    const response = await fetch(track.uri);
                    if (!response.ok) return track;
                    const srt = await response.text();
                    const vtt = `WEBVTT\n\n${srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')}`;
                    const blobUrl = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
                    subtitleBlobUrlsRef.current.push(blobUrl);
                    return { ...track, uri: blobUrl, mimeType: 'text/vtt' };
                } catch {
                    return track;
                }
            }));
            if (cancelled) return;
            trackElementsRef.current = [];
            subtitleTracksRef.current = tracks;
            setResolvedSubtitleTracks(tracks);
            props.onTracksChange?.(tracks, audioTracksRef.current);
        };

        void resolveTracks();
        return () => {
            cancelled = true;
            subtitleBlobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
            subtitleBlobUrlsRef.current = [];
        };
    }, [props.subtitleTracks]);

    useEffect(() => {
        loadSource(props.source);
        return () => {
            sourceGenerationRef.current += 1;
            destroyDemuxers();
        };
    }, [props.source]);

    const onPlayingChangeRef = useRef(props.onPlayingChange);
    const onTimeUpdateRef = useRef(props.onTimeUpdate);
    onPlayingChangeRef.current = props.onPlayingChange;
    onTimeUpdateRef.current = props.onTimeUpdate;

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const handlePlay = () => onPlayingChangeRef.current?.(true);
        const handlePause = () => onPlayingChangeRef.current?.(false);
        const handleTimeUpdate = () => onTimeUpdateRef.current?.(video.currentTime, video.duration);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, []);

    return (
        <View style={props.style}>
            <video
                ref={videoRef as any}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                playsInline
                autoPlay
            >
                {resolvedSubtitleTracks.map((track, index) => (
                    <track
                        key={track.id ?? `${track.language ?? 'subtitle'}_${index}`}
                        ref={(element) => {
                            if (element) trackElementsRef.current[index] = element;
                        }}
                        kind="subtitles"
                        src={track.uri}
                        srcLang={track.language}
                        label={track.label ?? track.language ?? `Subtitle ${index + 1}`}
                    />
                ))}
            </video>
        </View>
    );
});

WebVideoPlayer.displayName = 'WebVideoPlayer';
