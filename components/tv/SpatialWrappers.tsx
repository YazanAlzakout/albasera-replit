import React from 'react';
import { Platform, ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import {
    SpatialNavigationScrollView,
    SpatialNavigationView,
    SpatialNavigationNode,
} from 'react-tv-space-navigation';

const isTV = Platform.isTV;
const isWebTV = isTV && Platform.OS === 'web';

// ─── TVScrollView ────────────────────────────────────────────────────────────
// On web TV: SpatialNavigationScrollView (auto-scrolls to focused element)
// On native TV / phone: standard ScrollView

interface TVScrollViewProps extends Omit<ScrollViewProps, 'style' | 'contentContainerStyle'> {
    style?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
    children: React.ReactNode;
    offsetFromStart?: number;
}

export function TVScrollView({
    horizontal,
    style,
    contentContainerStyle,
    children,
    offsetFromStart = 0,
    ...rest
}: TVScrollViewProps) {
    if (isWebTV) {
        return (
            <SpatialNavigationScrollView
                horizontal={horizontal ?? undefined}
                style={StyleSheet.flatten(style) as ViewStyle}
                contentContainerStyle={StyleSheet.flatten(contentContainerStyle) as ViewStyle}
                offsetFromStart={offsetFromStart}
            >
                {children}
            </SpatialNavigationScrollView>
        );
    }

    // Native TV or mobile: plain ScrollView
    return (
        <ScrollView
            horizontal={horizontal}
            style={style}
            contentContainerStyle={contentContainerStyle}
            {...rest}
        >
            {children}
        </ScrollView>
    );
}

// ─── TVRow (horizontal layout) ───────────────────────────────────────────────
// On web TV: SpatialNavigationView direction="horizontal"
// On native TV / phone: plain View with flexDirection row

interface TVRowProps {
    style?: StyleProp<ViewStyle>;
    children: React.ReactNode;
}

export function TVRow({ style, children }: TVRowProps) {
    if (isWebTV) {
        return (
            <SpatialNavigationView direction="horizontal" style={StyleSheet.flatten(style) as ViewStyle}>
                {children}
            </SpatialNavigationView>
        );
    }

    return <View style={[{ flexDirection: 'row' }, style]}>{children}</View>;
}

// ─── TVColumn (vertical layout) ──────────────────────────────────────────────
// On web TV: SpatialNavigationView direction="vertical"
// On native TV / phone: plain View

interface TVColumnProps {
    style?: StyleProp<ViewStyle>;
    children: React.ReactNode;
}

export function TVColumn({ style, children }: TVColumnProps) {
    if (isWebTV) {
        return (
            <SpatialNavigationView direction="vertical" style={StyleSheet.flatten(style) as ViewStyle}>
                {children}
            </SpatialNavigationView>
        );
    }

    return <View style={style}>{children}</View>;
}

// ─── TVNodeGuard ─────────────────────────────────────────────────────────────
// Wraps conditionally rendered elements to preserve LRUD registration order.
// On native TV / phone: renders children directly.

interface TVNodeGuardProps {
    children: React.ReactNode;
}

export function TVNodeGuard({ children }: TVNodeGuardProps) {
    if (isWebTV) {
        return <SpatialNavigationNode>{children as React.ReactElement}</SpatialNavigationNode>;
    }

    return <>{children}</>;
}
