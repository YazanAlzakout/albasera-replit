/**
 * @file hooks/use-providers.tsx
 * Manages multiple IPTV providers (add / edit / delete / switch active).
 * Data is persisted in SecureStore as a JSON array.
 */

import * as SecureStore from '@/utils/secure-store';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Provider {
    id: string;           // uuid-like: timestamp + random
    type?: 'xtream' | 'm3u' | 'local';
    name: string;         // friendly label e.g. "Provider 1"
    url: string;          // server URL
    username: string;
    password: string;
    addedAt: number;      // Date.now()
}

interface ProvidersContextType {
    isLoading: boolean;
    providers: Provider[];
    activeId: string | null;
    activeProvider: Provider | null;
    addProvider: (data: Omit<Provider, 'id' | 'addedAt'>) => Promise<Provider>;
    updateProvider: (id: string, data: Partial<Omit<Provider, 'id' | 'addedAt'>>) => Promise<void>;
    removeProvider: (id: string) => Promise<void>;
    setActiveId: (id: string) => Promise<void>;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────
const PROVIDERS_KEY = 'albasira_providers';
const ACTIVE_KEY = 'albasira_active_provider';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function loadProviders(): Promise<Provider[]> {
    try {
        const raw = await SecureStore.getItemAsync(PROVIDERS_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item): item is Provider => {
            if (!item || typeof item !== 'object') return false;
            const provider = item as Partial<Provider>;
            return typeof provider.id === 'string'
                && typeof provider.name === 'string'
                && typeof provider.url === 'string'
                && typeof provider.username === 'string'
                && typeof provider.password === 'string'
                && typeof provider.addedAt === 'number'
                && (!provider.type || ['xtream', 'm3u', 'local'].includes(provider.type));
        });
    } catch {
        return [];
    }
}

async function saveProviders(list: Provider[]): Promise<void> {
    await SecureStore.setItemAsync(PROVIDERS_KEY, JSON.stringify(list));
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ProvidersContext = createContext<ProvidersContextType | null>(null);

export const ProvidersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [activeId, setActiveIdState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const providersRef = useRef<Provider[]>([]);
    const activeIdRef = useRef<string | null>(null);
    const writeQueue = useRef(Promise.resolve());

    useEffect(() => {
        (async () => {
            const list = await loadProviders();
            const saved = await SecureStore.getItemAsync(ACTIVE_KEY);
            providersRef.current = list;
            setProviders(list);
            // Restore active — fallback to first if saved id is gone
            if (saved && list.find(p => p.id === saved)) {
                activeIdRef.current = saved;
                setActiveIdState(saved);
            } else if (list.length > 0) {
                activeIdRef.current = list[0].id;
                setActiveIdState(list[0].id);
            }
            setIsLoading(false);
        })();
    }, []);

    const persist = useCallback((next: Provider[]) => {
        writeQueue.current = writeQueue.current.then(() => saveProviders(next));
        return writeQueue.current;
    }, []);

    const addProvider = useCallback(
        async (data: Omit<Provider, 'id' | 'addedAt'>): Promise<Provider> => {
            const next: Provider = { ...data, id: generateId(), addedAt: Date.now() };
            const updated = [...providersRef.current, next];
            providersRef.current = updated;
            setProviders(updated);
            await persist(updated);
            // Auto-activate first provider
            if (updated.length === 1) {
                activeIdRef.current = next.id;
                setActiveIdState(next.id);
                await SecureStore.setItemAsync(ACTIVE_KEY, next.id);
            }
            return next;
        },
        [persist],
    );

    const updateProvider = useCallback(
        async (id: string, data: Partial<Omit<Provider, 'id' | 'addedAt'>>) => {
            const updated = providersRef.current.map(p => (p.id === id ? { ...p, ...data } : p));
            providersRef.current = updated;
            setProviders(updated);
            await persist(updated);
        },
        [persist],
    );

    const removeProvider = useCallback(
        async (id: string) => {
            const updated = providersRef.current.filter(p => p.id !== id);
            providersRef.current = updated;
            setProviders(updated);
            await persist(updated);
            // If removed active, switch to first remaining
            if (activeIdRef.current === id) {
                const nextId = updated[0]?.id ?? null;
                activeIdRef.current = nextId;
                setActiveIdState(nextId);
                if (nextId) await SecureStore.setItemAsync(ACTIVE_KEY, nextId);
                else await SecureStore.deleteItemAsync(ACTIVE_KEY);
            }
        },
        [persist],
    );

    const setActiveId = useCallback(
        async (id: string) => {
            if (!providersRef.current.some(provider => provider.id === id)) return;
            activeIdRef.current = id;
            setActiveIdState(id);
            await SecureStore.setItemAsync(ACTIVE_KEY, id);
        },
        [],
    );

    const activeProvider = providers.find(p => p.id === activeId) ?? null;

    const value = useMemo(
        () => ({ isLoading, providers, activeId, activeProvider, addProvider, updateProvider, removeProvider, setActiveId }),
        [isLoading, providers, activeId, activeProvider, addProvider, updateProvider, removeProvider, setActiveId],
    );

    return (
        <ProvidersContext.Provider value={value}>
            {children}
        </ProvidersContext.Provider>
    );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useProviders = (): ProvidersContextType => {
    const ctx = useContext(ProvidersContext);
    if (!ctx) throw new Error('useProviders must be used within <ProvidersProvider>');
    return ctx;
};
