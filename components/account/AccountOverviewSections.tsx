import { Brand, Colors, FontFamily } from '@/constants/theme';
import type { AppTranslations, Locale } from '@/lang';
import { XtreamAuthResponse } from '@/services/xtream-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
const isTV = Platform.isTV;
const tv = (m: number, t: number) => (isTV ? t : m);

function AccountSectionHeader({ title, isDark, isRTL }: { title: string; isDark: boolean; isRTL: boolean }) {
    const textColor = isDark ? Colors.dark.text : Colors.light.text;
    return (
        <View style={[styles.sectionHeader, isRTL && styles.rowReverse]}>
            <View style={[styles.accentBar, !isRTL && { marginRight: 8 }, isRTL && { marginLeft: 8 }]} />
            <Text
                style={[
                    styles.sectionTitle,
                    { color: textColor, fontFamily: FontFamily.bold, flex: 1, textAlign: isRTL ? 'right' : 'left' },
                ]}
            >
                {title}
            </Text>
        </View>
    );
}

function InfoChip({
    label,
    value,
    iconName,
    isDark,
    accentColor,
}: {
    label: string;
    value: string;
    iconName: keyof typeof Ionicons.glyphMap;
    isDark: boolean;
    accentColor?: string;
}) {
    const bg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
    const textColor = isDark ? Colors.dark.text : Colors.light.text;
    const subColor = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;

    return (
        <View style={[styles.infoChip, { backgroundColor: bg, borderColor: border }]}>
            <Ionicons name={iconName} size={14} color={accentColor ?? Brand.primary} style={{ marginBottom: 4 }} />
            <Text style={[styles.chipLabel, { color: subColor, fontFamily: FontFamily.regular }]}>{label}</Text>
            <Text style={[styles.chipValue, { color: textColor, fontFamily: FontFamily.bold }]} numberOfLines={1}>
                {value}
            </Text>
        </View>
    );
}

export function StorageStats({
    historyCount,
    favCount,
    wlCount,
    isDark,
    isRTL,
    t,
}: {
    historyCount: number;
    favCount: number;
    wlCount: number;
    isDark: boolean;
    isRTL: boolean;
    t: AppTranslations;
}) {
    const bg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
    const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    const textC = isDark ? Colors.dark.text : Colors.light.text;
    const subC = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;

    const items = [
        { icon: 'eye-outline' as const, color: '#06b6d4', count: historyCount, label: t.dashboard.activityWatched },
        { icon: 'heart' as const, color: '#ec4899', count: favCount, label: t.dashboard.favorites },
        { icon: 'bookmark' as const, color: '#f59e0b', count: wlCount, label: t.dashboard.activityLater },
    ];

    return (
        <View style={[styles.storageRow, isRTL && styles.rowReverse]}>
            {items.map((it, i) => (
                <View key={i} style={[styles.storageStat, { backgroundColor: bg, borderColor: border }]}>
                    <View style={[styles.storageIconWrap, { backgroundColor: `${it.color}18` }]}>
                        <Ionicons name={it.icon} size={tv(16, 22)} color={it.color} />
                    </View>
                    <Text style={[styles.storageCount, { color: textC, fontFamily: FontFamily.black }]}>{it.count}</Text>
                    <Text style={[styles.storageLabel, { color: subC, fontFamily: FontFamily.regular }]}>{it.label}</Text>
                </View>
            ))}
        </View>
    );
}

export function ServerInfoCard({
    user,
    isDark,
    isRTL,
    t,
}: {
    user: XtreamAuthResponse;
    isDark: boolean;
    isRTL: boolean;
    t: AppTranslations;
}) {
    if (!user?.server_info) return null;
    const si = user.server_info;
    const bg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
    const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    const textC = isDark ? Colors.dark.text : Colors.light.text;
    const subC = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;

    const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
        { icon: 'globe-outline', label: t.dashboard.serverTimezone, value: si.timezone || '—' },
        { icon: 'lock-closed-outline', label: t.dashboard.serverProtocol, value: (si.server_protocol || 'http').toUpperCase() },
        { icon: 'time-outline', label: t.dashboard.serverTime, value: si.time_now || '—' },
    ];

    return (
        <View style={[styles.serverCard, { backgroundColor: bg, borderColor: border }]}>
            {rows.map((r, i) => (
                <View
                    key={i}
                    style={[
                        styles.serverRow,
                        isRTL && styles.rowReverse,
                        i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: border },
                    ]}
                >
                    <Ionicons
                        name={r.icon}
                        size={tv(14, 20)}
                        color={Brand.primary}
                        style={{ marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }}
                    />
                    <Text
                        style={[
                            styles.serverLabel,
                            { color: subC, fontFamily: FontFamily.regular, textAlign: isRTL ? 'right' : 'left' },
                        ]}
                    >
                        {r.label}
                    </Text>
                    <Text
                        style={[
                            styles.serverValue,
                            { color: textC, fontFamily: FontFamily.bold, textAlign: isRTL ? 'left' : 'right' },
                        ]}
                    >
                        {r.value}
                    </Text>
                </View>
            ))}
        </View>
    );
}

const LOCALE_DATE_TAG: Record<Locale, string> = {
    ar: 'ar-EG',
    en: 'en-US',
    fr: 'fr-FR',
    tr: 'tr-TR',
    ku: 'ku-IQ',
    ckb: 'ar-IQ',
};

function formatExpDate(ts: string, unlimited: string, locale: Locale): string {
    if (!ts || ts === '0') return unlimited;
    return new Date(parseInt(ts, 10) * 1000).toLocaleDateString(LOCALE_DATE_TAG[locale] ?? 'en-US');
}

export function AccountSubscriptionCard({
    user,
    isDark,
    isRTL,
    t,
    locale,
    cardBg,
    cardBorder,
}: {
    user: XtreamAuthResponse;
    isDark: boolean;
    isRTL: boolean;
    t: AppTranslations;
    locale: Locale;
    cardBg: string;
    cardBorder: string;
}) {
    const isActive = user?.user_info?.status === 'Active';

    return (
        <View style={[styles.accountCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <LinearGradient
                colors={
                    isActive ? [`${Brand.primary}22`, `${Brand.primary}08`] : ['rgba(100,100,100,0.15)', 'transparent']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.accountBanner}
            >
                <View style={styles.accountBannerLeft}>
                    <View style={[styles.statusDot, { backgroundColor: isActive ? '#22c55e' : '#ef4444' }]} />
                    <Text
                        style={[
                            styles.statusText,
                            { color: isActive ? '#22c55e' : '#ef4444', fontFamily: FontFamily.bold },
                        ]}
                    >
                        {isActive ? t.dashboard.activeStatus : t.dashboard.expiredStatus}
                    </Text>
                </View>
                <Ionicons name="shield-checkmark-outline" size={18} color={isActive ? Brand.primary : '#888'} />
            </LinearGradient>
            <View style={styles.chipsRow}>
                <InfoChip
                    label={t.dashboard.expires}
                    value={formatExpDate(user?.user_info?.exp_date ?? '0', t.dashboard.unlimited, locale)}
                    iconName="calendar-outline"
                    isDark={isDark}
                />
                <InfoChip
                    label={t.dashboard.connections}
                    value={String(user?.user_info?.max_connections ?? 1)}
                    iconName="wifi-outline"
                    isDark={isDark}
                    accentColor="#8b5cf6"
                />
                <InfoChip
                    label={t.dashboard.format}
                    value={user?.user_info?.allowed_output_formats?.[0]?.toUpperCase() ?? 'HLS'}
                    iconName="videocam-outline"
                    isDark={isDark}
                    accentColor="#06b6d4"
                />
            </View>
        </View>
    );
}

export function AccountOverviewSections({
    user,
    isDark,
    isRTL,
    locale,
    t,
    historyCount,
    favCount,
    wlCount,
    cardBg,
    cardBorder,
}: {
    user: XtreamAuthResponse | null;
    isDark: boolean;
    isRTL: boolean;
    locale: Locale;
    t: AppTranslations;
    historyCount: number;
    favCount: number;
    wlCount: number;
    cardBg: string;
    cardBorder: string;
}) {
    const hasXtreamUser = !!user?.user_info;

    return (
        <View style={styles.wrapper}>
            {hasXtreamUser && user && (
                <Animated.View entering={FadeInDown.delay(0 * 80).duration(400).springify()}>
                    <AccountSectionHeader title={t.dashboard.subscriptionAndConnection} isDark={isDark} isRTL={isRTL} />
                    <AccountSubscriptionCard
                        user={user}
                        isDark={isDark}
                        isRTL={isRTL}
                        t={t}
                        locale={locale}
                        cardBg={cardBg}
                        cardBorder={cardBorder}
                    />
                </Animated.View>
            )}

            <Animated.View entering={FadeInDown.delay(1 * 80).duration(400).springify()}>
                <AccountSectionHeader title={t.dashboard.yourActivity} isDark={isDark} isRTL={isRTL} />
                <StorageStats
                    historyCount={historyCount}
                    favCount={favCount}
                    wlCount={wlCount}
                    isDark={isDark}
                    isRTL={isRTL}
                    t={t}
                />
            </Animated.View>

            {user?.server_info ? (
                <Animated.View entering={FadeInDown.delay(2 * 80).duration(400).springify()}>
                    <AccountSectionHeader title={t.dashboard.serverInfoTitle} isDark={isDark} isRTL={isRTL} />
                    <ServerInfoCard user={user} isDark={isDark} isRTL={isRTL} t={t} />
                </Animated.View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { marginBottom: 8 },
    rowReverse: { flexDirection: 'row-reverse' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: 6 },
    accentBar: { width: 4, height: 18, borderRadius: 2, backgroundColor: Brand.primary },
    sectionTitle: { fontSize: tv(16, 20) },
    accountCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
    accountBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
    accountBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusDot: { width: 9, height: 9, borderRadius: 5 },
    statusText: { fontSize: 14 },
    chipsRow: { flexDirection: 'row', gap: 10, padding: 14 },
    infoChip: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'center' },
    chipLabel: { fontSize: 10, marginBottom: 3, textAlign: 'center' },
    chipValue: { fontSize: tv(13, 16), textAlign: 'center' },
    storageRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    storageStat: { flex: 1, borderRadius: 16, borderWidth: 1, alignItems: 'center', paddingVertical: tv(14, 20), gap: 6 },
    storageIconWrap: { width: tv(36, 48), height: tv(36, 48), borderRadius: tv(12, 16), alignItems: 'center', justifyContent: 'center' },
    storageCount: { fontSize: tv(20, 28) },
    storageLabel: { fontSize: tv(10, 14) },
    serverCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
    serverRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: tv(12, 16) },
    serverLabel: { flex: 1, fontSize: tv(12, 16) },
    serverValue: { fontSize: tv(12, 16) },
});
