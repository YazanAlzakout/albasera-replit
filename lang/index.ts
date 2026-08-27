/**
 * @file lang/index.ts
 * Main aggregator for all locale bundles.
 * To add a new language:
 *   1. Create a folder: lang/<code>/ with common.ts and onboarding.ts
 *   2. Add a barrel index.ts in that folder
 *   3. Import and register it here
 */

import ar from './ar';
import ckb from './ckb';
import en from './en';
import fr from './fr';
import ku from './ku';
import tr from './tr';
import type { AppTranslations, Locale } from './types';

export type { CommonTranslations, OnboardingSlide, OnboardingTranslations } from './types';
export type { AppTranslations, Locale };

export const LOCALE_ORDER: Locale[] = ['ar', 'en', 'fr', 'tr', 'ku', 'ckb'];

export const RTL_LOCALES: Set<Locale> = new Set(['ar', 'ckb']);

export const translations: Record<Locale, AppTranslations> = { ar, en, fr, tr, ku, ckb };

export const isRTLLocale = (locale: Locale): boolean => RTL_LOCALES.has(locale);

export default translations;
