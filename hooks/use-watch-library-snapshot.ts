import { WatchedItem, watchHistoryService } from '@/services/watch-history-service';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export function useWatchLibrarySnapshot() {
    const [history, setHistory] = useState<WatchedItem[]>([]);
    const [favCount, setFavCount] = useState(0);
    const [watchLaterCount, setWatchLaterCount] = useState(0);

    const refresh = useCallback(async () => {
        const [h, f, wl] = await Promise.all([
            watchHistoryService.getHistory(),
            watchHistoryService.getFavorites(),
            watchHistoryService.getWatchLater(),
        ]);
        setHistory(h);
        setFavCount(f.length);
        setWatchLaterCount(wl.length);
    }, []);

    useFocusEffect(
        useCallback(() => {
            void refresh();
        }, [refresh])
    );

    return { history, favCount, watchLaterCount, refresh };
}
