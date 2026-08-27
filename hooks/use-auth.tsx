import * as SecureStore from '@/utils/secure-store';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { XtreamAuthResponse, xtreamService } from '../services/xtream-service';
import { useProviders } from './use-providers';

interface AuthState {
    isLoading: boolean;
    isLoggingIn: boolean;
    isAuthenticated: boolean;
    user: XtreamAuthResponse | null;
    serverUrl: string | null;
}

interface AuthContextType extends AuthState {
    login: (url: string, user: string, pass: string, type?: 'xtream' | 'm3u' | 'local') => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { activeProvider, isLoading: providersLoading } = useProviders();
    const restoredProviderId = useRef<string | null>(null);
    const [state, setState] = useState<AuthState>({
        isLoading: true,
        isLoggingIn: false,
        isAuthenticated: false,
        user: null,
        serverUrl: null,
    });

    const connectProvider = useCallback(async (
        url: string,
        username: string,
        password: string,
        type: 'xtream' | 'm3u' | 'local',
    ) => {
        if (type !== 'xtream') {
            throw new Error(
                type === 'm3u'
                    ? 'M3U playlist playback is not available yet.'
                    : 'Local playlist playback is not available yet.',
            );
        }

        xtreamService.initialize(url, username, password);
        return xtreamService.authenticate();
    }, []);

    useEffect(() => {
        if (providersLoading) return;

        let cancelled = false;
        const loadActiveProvider = async () => {
            if (!activeProvider) {
                restoredProviderId.current = null;
                if (!cancelled) {
                    setState(current => ({ ...current, isLoading: false, isAuthenticated: false, user: null, serverUrl: null }));
                }
                return;
            }

            if (restoredProviderId.current === activeProvider.id) {
                if (!cancelled) setState(current => ({ ...current, isLoading: false }));
                return;
            }

            if (!cancelled) setState(current => ({ ...current, isLoading: true }));
            try {
                const user = await connectProvider(
                    activeProvider.url,
                    activeProvider.username,
                    activeProvider.password,
                    activeProvider.type ?? 'xtream',
                );
                if (cancelled) return;
                restoredProviderId.current = activeProvider.id;
                setState({
                    isLoading: false,
                    isLoggingIn: false,
                    isAuthenticated: true,
                    user,
                    serverUrl: activeProvider.url,
                });
            } catch (error) {
                console.warn('Failed to restore active provider session:', error);
                if (!cancelled) {
                    restoredProviderId.current = null;
                    setState({
                        isLoading: false,
                        isLoggingIn: false,
                        isAuthenticated: false,
                        user: null,
                        serverUrl: null,
                    });
                }
            }
        };

        void loadActiveProvider();
        return () => {
            cancelled = true;
        };
    }, [activeProvider, connectProvider, providersLoading]);

    const login = async (url: string, username: string, password: string, type: 'xtream' | 'm3u' | 'local' = 'xtream') => {
        setState(current => ({ ...current, isLoggingIn: true }));
        try {
            const user = await connectProvider(url, username, password, type);
            restoredProviderId.current = activeProvider?.id ?? null;
            await SecureStore.deleteItemAsync('xtream_credentials');
            setState({
                isLoading: false,
                isLoggingIn: false,
                isAuthenticated: true,
                user,
                serverUrl: url,
            });
        } catch (error) {
            setState(current => ({ ...current, isLoading: false, isLoggingIn: false }));
            throw error;
        }
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('xtream_credentials');
        restoredProviderId.current = null;
        setState({
            isLoading: false,
            isLoggingIn: false,
            isAuthenticated: false,
            user: null,
            serverUrl: null,
        });
        router.replace('/login');
    };

    return (
        <AuthContext.Provider value={{ ...state, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
