import * as SecureStore from '@/utils/secure-store';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemeMode = 'system' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

interface ThemeContextType {
    mode: ThemeMode;
    resolved: ResolvedTheme;
    isDark: boolean;
    toggleTheme: () => void;
    setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'system',
    resolved: 'dark',
    isDark: true,
    toggleTheme: () => { },
    setMode: () => { },
});

const THEME_KEY = 'albasira_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useSystemColorScheme() ?? 'dark';
    const [mode, setModeState] = useState<ThemeMode>('system');

    useEffect(() => {
        (async () => {
            const saved = await SecureStore.getItemAsync(THEME_KEY);
            if (saved && ['system', 'dark', 'light'].includes(saved)) {
                setModeState(saved as ThemeMode);
            }
        })();
    }, []);

    const setMode = useCallback(async (m: ThemeMode) => {
        setModeState(m);
        await SecureStore.setItemAsync(THEME_KEY, m);
    }, []);

    const toggleTheme = useCallback(() => {
        const resolved = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
        setMode(resolved === 'dark' ? 'light' : 'dark');
    }, [mode, systemScheme, setMode]);

    const resolved: ResolvedTheme = mode === 'system'
        ? (systemScheme === 'dark' ? 'dark' : 'light')
        : mode;

    return (
        <ThemeContext.Provider
            value={{
                mode,
                resolved,
                isDark: resolved === 'dark',
                toggleTheme,
                setMode,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useAppTheme = () => useContext(ThemeContext);
