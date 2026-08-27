import React, { forwardRef, useImperativeHandle } from 'react';

export type NativeLiveTrack = {
    id: string;
    language: string;
    label: string;
};

export interface NativeLivePlayerRef {
    play: () => void;
    pause: () => void;
}

interface NativeLivePlayerProps {
    source: string;
    volume: number;
    selectedAudioTrackId?: string;
    reloadKey: number;
    onLoading: () => void;
    onPlaying: () => void;
    onPaused: () => void;
    onError: () => void;
    onAudioTracks: (tracks: NativeLiveTrack[]) => void;
}

export const NativeLivePlayer = forwardRef<NativeLivePlayerRef, NativeLivePlayerProps>(({
    source,
    volume,
    selectedAudioTrackId,
    reloadKey,
    onLoading,
    onPlaying,
    onPaused,
    onError,
    onAudioTracks,
}, ref) => {
    useImperativeHandle(ref, () => ({
        play: () => undefined,
        pause: () => undefined,
    }), []);

    return null;
});

NativeLivePlayer.displayName = 'NativeLivePlayer';