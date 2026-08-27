import { useAppTheme } from '@/contexts/theme-context';
import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const LOGO_LIGHT = require('@/assets/images/logo.png');
const LOGO_DARK = require('@/assets/images/logo-night.png');

interface BrandLogoProps {
    style?: StyleProp<ImageStyle>;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

export function BrandLogo({ style, resizeMode = 'contain' }: BrandLogoProps) {
    const { isDark } = useAppTheme();

    return <Image source={isDark ? LOGO_DARK : LOGO_LIGHT} style={style} resizeMode={resizeMode} />;
}

