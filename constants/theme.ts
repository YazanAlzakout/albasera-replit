/**
 * IPTV Player - Theme Configuration
 * Primary color: Red (#E50914) — Dark/Light mode adaptive backgrounds
 */

import { Platform } from 'react-native';

// ─── Primary Brand Colors ───────────────────────────────────────────────────
export const Brand = {
  primary: '#E50914',
  primaryDark: '#B20710',
  primaryLight: '#FF2D3A',
  primaryGlow: 'rgba(229, 9, 20, 0.35)',
  primaryMuted: 'rgba(229, 9, 20, 0.15)',
  accent: '#FF6B6B',
  gold: '#F5A623',
  focus: '#00F2FF', // Electric Cyan for high visibility/contrast
};

// ─── App Colors ──────────────────────────────────────────────────────────────
export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#6B7280',
    background: '#FFFFFF',
    surface: '#F3F4F6',
    surfaceElevated: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    tint: Brand.primary,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: Brand.primary,
    overlay: 'rgba(0,0,0,0.4)',
  },
  dark: {
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    background: '#0A0A0F',
    surface: '#12121A',
    surfaceElevated: '#1C1C28',
    border: 'rgba(255,255,255,0.08)',
    tint: Brand.primary,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: Brand.primary,
    overlay: 'rgba(0,0,0,0.6)',
  },
};

// ─── Onboarding Slides Config ────────────────────────────────────────────────
export const OnboardingColors = {
  dark: {
    bg: '#0A0A0F',
    card: '#12121A',
    particle: Brand.primaryGlow,
  },
  light: {
    bg: '#FFFFFF',
    card: '#F3F4F6',
    particle: Brand.primaryMuted,
  },
};

// ─── Tajawal Font Family ─────────────────────────────────────────────────────
export const FontFamily = {
  regular: 'Tajawal-Regular',
  medium: 'Tajawal-Medium',
  bold: 'Tajawal-Bold',
  extraBold: 'Tajawal-ExtraBold',
  black: 'Tajawal-Black',
  light: 'Tajawal-Light',
  extraLight: 'Tajawal-ExtraLight',
} as const;

// ─── Fonts (Platform legacy) ─────────────────────────────────────────────────
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// ─── TV Safe Area (overscan protection) ──────────────────────────────────────
const isTV = Platform.isTV;

export const TVSafe = {
  paddingHorizontal: 96,
  paddingVertical: 48,
} as const;

export const tv = (mobile: number, tvValue: number) => (isTV ? tvValue : mobile);

// ─── TV Remote Focus Styles ──────────────────────────────────────────────────
// Applied via Pressable's `focused` state. No scale — just a clean border outline
// so the element shape/layout is preserved and only the border changes.
export const TVFocus = {
  /** Standard focus for cards, buttons, list items */
  card: {
    borderWidth: 3,
    borderColor: Brand.focus,
  },
  /** Subtle focus for small controls (icons, pills) */
  control: {
    borderWidth: 2.5,
    borderColor: Brand.focus,
  },
  /** Focus for text inputs */
  input: {
    borderWidth: 3,
    borderColor: Brand.focus,
  },
} as const;
