import { getLocales } from 'expo-localization';
import { useMemo } from 'react';

type Locale = 'ar' | 'en' | 'fr';

const translations: Record<Locale, { getStarted: string; skip: string; next: string }> = {
    ar: { getStarted: 'ابدأ الآن', skip: 'تخطى', next: 'التالي' },
    en: { getStarted: 'Get Started', skip: 'Skip', next: 'Next' },
    fr: { getStarted: 'Commencer', skip: 'Passer', next: 'Suivant' },
};

function detectLocale(): Locale {
    try {
        const locales = getLocales();
        const lang = locales[0]?.languageCode ?? 'en';
        if (lang === 'ar') return 'ar';
        if (lang === 'fr') return 'fr';
        return 'en';
    } catch {
        return 'en';
    }
}

export function useI18n() {
    const locale = useMemo(() => detectLocale(), []);
    const t = translations[locale];
    const isRTL = locale === 'ar';
    return { t, locale, isRTL };
}
