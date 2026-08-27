import React, { forwardRef, useImperativeHandle } from 'react';

export interface NativeLivePlayerRef {
    play: () => void;
    pause: () => void;
}

export const NativeLivePlayer = forwardRef<NativeLivePlayerRef>((_, ref) => {
    useImperativeHandle(ref, () => ({
        play: () => undefined,
        pause: () => undefined,
    }), []);
    return null;
});

NativeLivePlayer.displayName = 'NativeLivePlayer';