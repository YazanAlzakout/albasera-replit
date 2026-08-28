import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';

import { StyleSheet, View } from 'react-native';
import {
    VLCPlayer,
    type VideoInfo,
} from 'react-native-vlc-media-player';

export type NativeLiveTrack = {
    id: string;
    language: string;
    label: string;
};

export interface NativeLivePlayerRef {
    play: () => void;
    pause: () => void;
    seekBy: (seconds: number) => void;
    seekTo: (seconds: number) => void;
}

interface NativeLivePlayerProps {
    source: string;
    volume: number;
    playbackRate?: number;
    selectedAudioTrackId?: string;
    selectedSubtitleTrackId?: string;
    reloadKey: number;
    onLoading: () => void;
    onPlaying: () => void;
    onPaused: () => void;
    onError: () => void;
    onProgress?: (currentTime: number, duration: number) => void;
    onAudioTracks: (tracks: NativeLiveTrack[]) => void;
    onSubtitleTracks?: (tracks: NativeLiveTrack[]) => void;
}

function vlcMsToSeconds(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0;
    return value / 1000;
}

function mapVlcTracks(tracks: VideoInfo['audioTracks'] | undefined): NativeLiveTrack[] {
    return (tracks ?? [])
        .filter((track) => track.id >= 0)
        .map((track) => ({
            id: String(track.id),
            language: '',
            label: track.name || `Track ${track.id}`,
        }));
}

export const NativeLivePlayer = forwardRef<
    NativeLivePlayerRef,
    NativeLivePlayerProps
>(({
    source,
    volume,
    playbackRate = 1,
    selectedAudioTrackId,
    selectedSubtitleTrackId,
    reloadKey,
    onLoading,
    onPlaying,
    onPaused,
    onError,
    onProgress,
    onAudioTracks,
    onSubtitleTracks,
}, ref) => {
    const vlcRef = useRef<VLCPlayer>(null);
    const durationMsRef = useRef(0);
    const currentTimeMsRef = useRef(0);
    const onLoadingRef = useRef(onLoading);
    const onPlayingRef = useRef(onPlaying);
    const onPausedRef = useRef(onPaused);
    const onErrorRef = useRef(onError);
    const onProgressRef = useRef(onProgress);
    const onAudioTracksRef = useRef(onAudioTracks);
    const onSubtitleTracksRef = useRef(onSubtitleTracks);

    const [paused, setPaused] = useState(false);

    onLoadingRef.current = onLoading;
    onPlayingRef.current = onPlaying;
    onPausedRef.current = onPaused;
    onErrorRef.current = onError;
    onProgressRef.current = onProgress;
    onAudioTracksRef.current = onAudioTracks;
    onSubtitleTracksRef.current = onSubtitleTracks;

    const audioTrack = useMemo(() => {
        if (!selectedAudioTrackId) return undefined;
        const id = Number(selectedAudioTrackId);
        return Number.isFinite(id) ? id : undefined;
    }, [selectedAudioTrackId]);

    const textTrack = useMemo(() => {
        if (!selectedSubtitleTrackId) return undefined;
        const id = Number(selectedSubtitleTrackId);
        return Number.isFinite(id) ? id : undefined;
    }, [selectedSubtitleTrackId]);

    const emitProgress = useCallback((currentTimeMs: number, durationMs: number) => {
        currentTimeMsRef.current = Number.isFinite(currentTimeMs) ? Math.max(0, currentTimeMs) : 0;
        if (Number.isFinite(durationMs) && durationMs > 0) {
            durationMsRef.current = durationMs;
        }
        onProgressRef.current?.(
            vlcMsToSeconds(currentTimeMsRef.current),
            vlcMsToSeconds(durationMsRef.current),
        );
    }, []);

    const seekTo = useCallback((seconds: number) => {
        const durationMs = durationMsRef.current;
        if (!Number.isFinite(durationMs) || durationMs <= 0) return;
        const nextMs = Math.max(0, Math.min(durationMs, seconds * 1000));
        vlcRef.current?.seek(nextMs / durationMs);
        emitProgress(nextMs, durationMs);
    }, [emitProgress]);

    const seekBy = useCallback((seconds: number) => {
        seekTo(vlcMsToSeconds(currentTimeMsRef.current) + seconds);
    }, [seekTo]);

    useImperativeHandle(ref, () => ({
        play: () => setPaused(false),
        pause: () => setPaused(true),
        seekBy,
        seekTo,
    }), [seekBy, seekTo]);

    useEffect(() => {
        durationMsRef.current = 0;
        currentTimeMsRef.current = 0;
        setPaused(false);
        onLoadingRef.current();
    }, [source, reloadKey]);

    const handleLoad = useCallback((info: VideoInfo) => {
        if (Number.isFinite(info.duration) && info.duration > 0) {
            emitProgress(0, info.duration);
        }
        onAudioTracksRef.current(mapVlcTracks(info.audioTracks));
        onSubtitleTracksRef.current?.(mapVlcTracks(info.textTracks));
    }, [emitProgress]);

    const handleProgress = useCallback((event: { currentTime?: number; duration?: number }) => {
        emitProgress(event.currentTime ?? 0, event.duration ?? durationMsRef.current);
    }, [emitProgress]);

    return (
        <View style={styles.wrapper}>
            <VLCPlayer
                ref={vlcRef}
                key={`${source}-${reloadKey}`}
                style={styles.player}
                source={{
                    uri: source,
                    initType: 2,
                    initOptions: [
                        '--network-caching=1500',
                        '--live-caching=1500',
                    ],
                }}
                autoplay
                paused={paused}
                repeat={false}
                rate={playbackRate}
                autoAspectRatio
                resizeMode="contain"
                playInBackground={false}
                volume={Math.round(Math.max(0, Math.min(1, volume)) * 100)}
                audioTrack={audioTrack}
                textTrack={textTrack}
                onLoad={handleLoad}
                onProgress={handleProgress}
                onBuffering={() => onLoadingRef.current()}
                onPlaying={() => onPlayingRef.current()}
                onPaused={() => onPausedRef.current()}
                onError={() => onErrorRef.current()}
            />
        </View>
    );
});

NativeLivePlayer.displayName = 'NativeLivePlayer';

const styles = StyleSheet.create({
    // Background color lives here, not on VLCPlayer: RN's BackgroundStyleApplicator calls
    // setBackgroundDrawable on the styled native view, which VLCPlayer's underlying
    // TextureView does not support (throws UnsupportedOperationException).
    wrapper: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    player: {
        ...StyleSheet.absoluteFillObject,
    },
});
