/**
 * services/watch-history-service.ts — Persistent Watch History, Favorites & Watch Later
 * Uses SecureStore to persist data across sessions.
 */

import * as SecureStore from '@/utils/secure-store';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface WatchedItem {
    id: string;
    type: 'live' | 'movie' | 'series';
    name: string;
    cover: string;
    progress?: number;       // 0-100
    episode?: string;        // "S2 E5"
    timestamp: number;
    extension?: string;
    localUri?: string;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const HISTORY_KEY = 'albasira_watch_history';
const FAVORITES_KEY = 'albasira_favorites';
const WATCH_LATER_KEY = 'albasira_watch_later';
const MAX_HISTORY = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function loadList(key: string): Promise<WatchedItem[]> {
    try {
        const raw = await SecureStore.getItemAsync(key);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

async function saveList(key: string, list: WatchedItem[]) {
    await SecureStore.setItemAsync(key, JSON.stringify(list));
}

// ─── Watch History ────────────────────────────────────────────────────────────
async function getHistory(): Promise<WatchedItem[]> {
    return loadList(HISTORY_KEY);
}

async function addToHistory(item: WatchedItem): Promise<void> {
    const list = await loadList(HISTORY_KEY);
    // Remove existing entry for same ID (so it moves to top)
    const filtered = list.filter(i => i.id !== item.id);
    // Prepend and cap at MAX
    const updated = [{ ...item, timestamp: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
    await saveList(HISTORY_KEY, updated);
}

async function removeFromHistory(id: string): Promise<void> {
    const list = await loadList(HISTORY_KEY);
    await saveList(HISTORY_KEY, list.filter(i => i.id !== id));
}

async function clearHistory(): Promise<void> {
    await SecureStore.deleteItemAsync(HISTORY_KEY);
}

// ─── Favorites ────────────────────────────────────────────────────────────────
async function getFavorites(): Promise<WatchedItem[]> {
    return loadList(FAVORITES_KEY);
}

async function isFavorite(id: string): Promise<boolean> {
    const list = await loadList(FAVORITES_KEY);
    return list.some(i => i.id === id);
}

async function toggleFavorite(item: WatchedItem): Promise<boolean> {
    const list = await loadList(FAVORITES_KEY);
    const exists = list.some(i => i.id === item.id);
    if (exists) {
        await saveList(FAVORITES_KEY, list.filter(i => i.id !== item.id));
        return false; // removed
    }
    await saveList(FAVORITES_KEY, [{ ...item, timestamp: Date.now() }, ...list]);
    return true; // added
}

async function clearFavorites(): Promise<void> {
    await SecureStore.deleteItemAsync(FAVORITES_KEY);
}

// ─── Watch Later ──────────────────────────────────────────────────────────────
async function getWatchLater(): Promise<WatchedItem[]> {
    return loadList(WATCH_LATER_KEY);
}

async function isInWatchLater(id: string): Promise<boolean> {
    const list = await loadList(WATCH_LATER_KEY);
    return list.some(i => i.id === id);
}

async function toggleWatchLater(item: WatchedItem): Promise<boolean> {
    const list = await loadList(WATCH_LATER_KEY);
    const exists = list.some(i => i.id === item.id);
    if (exists) {
        await saveList(WATCH_LATER_KEY, list.filter(i => i.id !== item.id));
        return false;
    }
    await saveList(WATCH_LATER_KEY, [{ ...item, timestamp: Date.now() }, ...list]);
    return true;
}

async function clearWatchLater(): Promise<void> {
    await SecureStore.deleteItemAsync(WATCH_LATER_KEY);
}

// ─── Export ───────────────────────────────────────────────────────────────────
export const watchHistoryService = {
    // History
    getHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
    // Favorites
    getFavorites,
    isFavorite,
    toggleFavorite,
    clearFavorites,
    // Watch Later
    getWatchLater,
    isInWatchLater,
    toggleWatchLater,
    clearWatchLater,
};
