import React, { forwardRef, useImperativeHandle } from 'react';

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

export const NativeLivePlayer = forwardRef<NativeLivePlayerRef>((_, ref) => {
    useImperativeHandle(ref, () => ({
        play: () => undefined,
        pause: () => undefined,
        seekBy: () => undefined,
        seekTo: () => undefined,
    }), []);
    return null;
});

NativeLivePlayer.displayName = 'NativeLivePlayer';
