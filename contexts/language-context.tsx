import translations, {
    type AppTranslations,
    type Locale,
    isRTLLocale,
    LOCALE_ORDER,
} from '@/lang';
import * as SecureStore from '@/utils/secure-store';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// ─── Context Types ────────────────────────────────────────────────────────────
interface LanguageContextType {
    locale: Locale;
    t: AppTranslations;
    isRTL: boolean;
    setLocale: (locale: Locale) => Promise<void>;
    cycleLocale: () => void;
}

// ─── Context (never exposed without Provider) ─────────────────────────────────
const LanguageContext = createContext<LanguageContextType | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LANG_STORAGE_KEY = 'albasira_language';
const VALID_LOCALES = new Set<string>(LOCALE_ORDER);

function detectSystemLocale(): Locale {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getLocales } = require('expo-localization');
        const lang: string = getLocales()?.[0]?.languageCode ?? 'en';
        return VALID_LOCALES.has(lang) ? (lang as Locale) : 'en';
    } catch {
        return 'en';
    }
}

async function loadPersistedLocale(): Promise<Locale> {
    try {
        const saved = await SecureStore.getItemAsync(LANG_STORAGE_KEY);
        if (saved && VALID_LOCALES.has(saved)) return saved as Locale;
    } catch {
        // Fallback silently
    }
    return detectSystemLocale();
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locale, setLocaleState] = useState<Locale>('en');

    useEffect(() => {
        loadPersistedLocale().then(setLocaleState);
    }, []);

    const setLocale = useCallback(async (next: Locale) => {
        setLocaleState(next);
        try {
            await SecureStore.setItemAsync(LANG_STORAGE_KEY, next);
        } catch {
            // Ignore storage errors safely
        }
    }, []);

    const cycleLocale = useCallback(() => {
        const nextIndex = (LOCALE_ORDER.indexOf(locale) + 1) % LOCALE_ORDER.length;
        setLocale(LOCALE_ORDER[nextIndex]);
    }, [locale, setLocale]);

    const value: LanguageContextType = {
        locale,
        t: translations[locale],
        isRTL: isRTLLocale(locale),
        setLocale,
        cycleLocale,
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useLanguage = (): LanguageContextType => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within <LanguageProvider>');
    return ctx;
};
