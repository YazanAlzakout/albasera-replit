import * as SecureStore from '@/utils/secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

interface SettingsState {
    hideLive: boolean;
    hideMovies: boolean;
    hideSeries: boolean;
    hiddenCategories: {
        live: string[];
        movie: string[];
        series: string[];
    };
    hiddenStreams: {
        live: string[];
        movie: string[];
        series: string[];
    };
}

interface SettingsContextType extends SettingsState {
    toggleHideLive: () => Promise<void>;
    toggleHideMovies: () => Promise<void>;
    toggleHideSeries: () => Promise<void>;
    isCategoryHidden: (type: 'live' | 'movie' | 'series', categoryId: string) => boolean;
    isStreamHidden: (type: 'live' | 'movie' | 'series', streamId: string) => boolean;
    toggleHiddenCategory: (type: 'live' | 'movie' | 'series', categoryId: string) => Promise<void>;
    toggleHiddenStream: (type: 'live' | 'movie' | 'series', streamId: string) => Promise<void>;
}

const SETTINGS_KEY = 'albasira_user_settings';
const DEFAULT_SETTINGS: SettingsState = {
    hideLive: false,
    hideMovies: false,
    hideSeries: false,
    hiddenCategories: { live: [], movie: [], series: [] },
    hiddenStreams: { live: [], movie: [], series: [] },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<SettingsState>(DEFAULT_SETTINGS);
    const stateRef = useRef(state);
    const writeQueue = useRef(Promise.resolve());

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const raw = await SecureStore.getItemAsync(SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                const next: SettingsState = {
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    hiddenCategories: { ...DEFAULT_SETTINGS.hiddenCategories, ...(parsed.hiddenCategories ?? {}) },
                    hiddenStreams: { ...DEFAULT_SETTINGS.hiddenStreams, ...(parsed.hiddenStreams ?? {}) },
                };
                stateRef.current = next;
                setState(next);
            }
        } catch (error) {
            console.error('Failed to load settings', error);
        }
    };

    const updateSettings = useCallback((updater: (current: SettingsState) => SettingsState) => {
        const next = updater(stateRef.current);
        stateRef.current = next;
        setState(next);
        writeQueue.current = writeQueue.current.then(() =>
            SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(next))
        );
        return writeQueue.current;
    }, []);

    const toggleHideLive = useCallback(
        () => updateSettings(current => ({ ...current, hideLive: !current.hideLive })),
        [updateSettings],
    );

    const toggleHideMovies = useCallback(
        () => updateSettings(current => ({ ...current, hideMovies: !current.hideMovies })),
        [updateSettings],
    );

    const toggleHideSeries = useCallback(
        () => updateSettings(current => ({ ...current, hideSeries: !current.hideSeries })),
        [updateSettings],
    );

    const isCategoryHidden = useCallback((type: 'live' | 'movie' | 'series', categoryId: string) => {
        return state.hiddenCategories[type].includes(String(categoryId));
    }, [state.hiddenCategories]);

    const isStreamHidden = useCallback((type: 'live' | 'movie' | 'series', streamId: string) => {
        return state.hiddenStreams[type].includes(String(streamId));
    }, [state.hiddenStreams]);

    const toggleHiddenCategory = useCallback((type: 'live' | 'movie' | 'series', categoryId: string) => {
        const id = String(categoryId);
        return updateSettings(current => {
            const list = current.hiddenCategories[type];
            const nextList = list.includes(id) ? list.filter(item => item !== id) : [...list, id];
            return {
                ...current,
                hiddenCategories: { ...current.hiddenCategories, [type]: nextList },
            };
        });
    }, [updateSettings]);

    const toggleHiddenStream = useCallback((type: 'live' | 'movie' | 'series', streamId: string) => {
        const id = String(streamId);
        return updateSettings(current => {
            const list = current.hiddenStreams[type];
            const nextList = list.includes(id) ? list.filter(item => item !== id) : [...list, id];
            return {
                ...current,
                hiddenStreams: { ...current.hiddenStreams, [type]: nextList },
            };
        });
    }, [updateSettings]);

    const value = useMemo<SettingsContextType>(() => ({
        ...state,
        toggleHideLive,
        toggleHideMovies,
        toggleHideSeries,
        isCategoryHidden,
        isStreamHidden,
        toggleHiddenCategory,
        toggleHiddenStream,
    }), [
        state,
        toggleHideLive,
        toggleHideMovies,
        toggleHideSeries,
        isCategoryHidden,
        isStreamHidden,
        toggleHiddenCategory,
        toggleHiddenStream,
    ]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
