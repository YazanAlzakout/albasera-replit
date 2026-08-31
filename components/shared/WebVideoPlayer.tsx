import React from 'react';
import { View } from 'react-native';

export interface WebVideoPlayerRef {
    play: () => void;
    pause: () => void;
    seekBy: (secs: number) => void;
    replace: (url: string) => void;
    enterFullscreen: () => void;
    currentTime: number;
    duration: number;
    playbackRate: number;
    volume: number;
    subtitleTrack: MediaTrack | null;
    availableSubtitleTracks: MediaTrack[];
    audioTrack: MediaTrack | null;
    availableAudioTracks: MediaTrack[];
}

export interface MediaTrack {
    id?: string;
    language?: string;
    label?: string;
    uri?: string;
    mimeType?: string;
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

// Stub for Native platforms - they use expo-video natively
export const WebVideoPlayer = React.forwardRef<WebVideoPlayerRef, WebVideoPlayerProps>((props, ref) => {
    return <View style={props.style} />;
});

WebVideoPlayer.displayName = 'WebVideoPlayer';
