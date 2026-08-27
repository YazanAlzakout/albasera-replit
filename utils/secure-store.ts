import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const ASYNC_PREFIX = '__ss_fallback__';

export async function getItemAsync(key: string): Promise<string | null> {
    try {
        if (Platform.OS === 'web') {
            return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
        }
        const value = await SecureStore.getItemAsync(key);
        if (value !== null) return value;

        // Recover values written during a temporary keychain failure.
        const fallbackKey = ASYNC_PREFIX + key;
        const fallbackValue = await AsyncStorage.getItem(fallbackKey);
        if (fallbackValue !== null) {
            try {
                await SecureStore.setItemAsync(key, fallbackValue);
                await AsyncStorage.removeItem(fallbackKey);
            } catch {
                // Keep the fallback value available for the next read.
            }
        }
        return fallbackValue;
    } catch {
        try {
            return await AsyncStorage.getItem(ASYNC_PREFIX + key);
        } catch (e) {
            console.warn(`[SecureStore - get] fallback failed for key ${key}:`, e);
            return null;
        }
    }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
    try {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, value);
            }
            return;
        }
        await SecureStore.setItemAsync(key, value);
        await AsyncStorage.removeItem(ASYNC_PREFIX + key);
    } catch {
        try {
            await AsyncStorage.setItem(ASYNC_PREFIX + key, value);
        } catch (error) {
            console.warn(`[SecureStore - set] failed for key ${key}:`, error);
            throw error;
        }
    }
}

export async function deleteItemAsync(key: string): Promise<void> {
    let primaryError: unknown = null;
    try {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
            }
            return;
        }
        await SecureStore.deleteItemAsync(key);
    } catch (error) {
        primaryError = error;
    }

    try {
        await AsyncStorage.removeItem(ASYNC_PREFIX + key);
    } catch (fallbackError) {
        console.warn(`[SecureStore - delete] failed for key ${key}:`, fallbackError);
        if (primaryError) throw primaryError;
        throw fallbackError;
    }
}
