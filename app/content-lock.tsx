import { TVPressable } from '@/components/shared/TVPressable';
import { Brand, Colors, FontFamily, TVSafe } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useSettings } from '@/contexts/settings-context';
import { useAppTheme } from '@/contexts/theme-context';
import { xtreamService } from '@/services/xtream-service';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type LockType = 'live' | 'movie' | 'series';
type CategoryEntry = { id: string; name: string };

const { width: W } = Dimensions.get('window');
const isTV = Platform.isTV;
const tv = (m: number, t: number) => (isTV ? t : m);

const CategoryRow = React.memo(({
    entry, index, isHidden, isRTL, cardBg, border, textC, onPressItem,
}: {
    entry: CategoryEntry;
    index: number;
    isHidden: boolean;
    isRTL: boolean;
    cardBg: string;
    border: string;
    textC: string;
    onPressItem: (id: string) => void;
}) => {
    const handlePress = useCallback(() => onPressItem(entry.id), [onPressItem, entry.id]);

    return (
        <Animated.View entering={FadeInDown.delay(Math.min(index, 15) * 30).duration(350).springify()}>
            <TVPressable
                onPress={handlePress}
                style={[styles.row, { backgroundColor: cardBg, borderColor: border }]}
                focusVariant="card"
            >
                <View style={styles.rowInfo}>
                    <Text style={[styles.rowTitle, { color: textC, fontFamily: FontFamily.medium }]} numberOfLines={1}>
                        {entry.name}
                    </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: isHidden ? '#ef444420' : '#22c55e20' }]}>
                    <Text style={[styles.badgeText, { color: isHidden ? '#ef4444' : '#22c55e', fontFamily: FontFamily.bold }]}>
                        {isHidden ? (isRTL ? 'مخفي' : 'Hidden') : (isRTL ? 'ظاهر' : 'Visible')}
                    </Text>
                </View>
            </TVPressable>
        </Animated.View>
    );
});
CategoryRow.displayName = 'CategoryRow';

export default function ContentLockScreen() {
    const { type } = useLocalSearchParams<{ type?: string }>();
    const lockType: LockType = type === 'live' || type === 'movie' || type === 'series' ? type : 'live';
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

    const { isDark } = useAppTheme();
    const { isRTL } = useLanguage();
    const { hiddenCategories, toggleHiddenCategory } = useSettings();

    const textC = isDark ? Colors.dark.text : Colors.light.text;
    const subC = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
    const bg = isDark ? '#09090F' : '#F0F0F8';
    const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.88)';
    const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    const title = lockType === 'live'
        ? (isRTL ? 'حماية البث المباشر' : 'Live TV Protection')
        : lockType === 'movie'
            ? (isRTL ? 'حماية الأفلام' : 'Movies Protection')
            : (isRTL ? 'حماية المسلسلات' : 'Series Protection');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const cats = await xtreamService.getCategories(lockType);
                setCategories(cats.map((c) => ({ id: String(c.category_id), name: c.category_name })));
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [lockType]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = categories;
        if (!q) return list;
        return list.filter((entry) => entry.name.toLowerCase().includes(q));
    }, [query, categories]);

    const hiddenCount = hiddenCategories[lockType].length;
    const hiddenSet = hiddenCategories[lockType];

    const handleTogglePress = useCallback((id: string) => {
        void toggleHiddenCategory(lockType, id);
    }, [lockType, toggleHiddenCategory]);

    const keyExtractor = useCallback((entry: CategoryEntry) => entry.id, []);

    const renderItem = useCallback(({ item, index }: { item: CategoryEntry; index: number }) => (
        <CategoryRow
            entry={item}
            index={index}
            isHidden={hiddenSet.includes(item.id)}
            isRTL={isRTL}
            cardBg={cardBg}
            border={border}
            textC={textC}
            onPressItem={handleTogglePress}
        />
    ), [hiddenSet, isRTL, cardBg, border, textC, handleTogglePress]);

    return (
        <View style={[styles.root, { backgroundColor: bg }]}>
            <SafeAreaView style={styles.safe}>
                <Animated.View entering={FadeIn.duration(500)} style={[styles.header, isRTL && styles.rowReverse]}>
                    <TVPressable onPress={() => router.back()} style={styles.backBtn} focusVariant="control">
                        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={textC} />
                    </TVPressable>
                    <View style={styles.headerTextWrap}>
                        <Text style={[styles.title, { color: textC, fontFamily: FontFamily.bold }]} numberOfLines={1}>{title}</Text>
                        <Text style={[styles.subtitle, { color: subC, fontFamily: FontFamily.regular }]} numberOfLines={1}>
                            {isRTL ? `المخفي: ${hiddenCount}` : `Hidden: ${hiddenCount}`}
                        </Text>
                    </View>
                    <View style={{ width: 36 }} />
                </Animated.View>

                <Animated.View
                    entering={FadeInDown.delay(60).duration(400)}
                    style={[styles.searchWrap, { backgroundColor: cardBg, borderColor: border }]}
                >
                    <Ionicons name="search-outline" size={18} color={subC} />
                    <TextInput
                        style={[styles.searchInput, { color: textC, fontFamily: FontFamily.regular, textAlign: isRTL ? 'right' : 'left' }]}
                        value={query}
                        onChangeText={setQuery}
                        placeholder={isRTL ? 'بحث...' : 'Search...'}
                        placeholderTextColor={subC}
                    />
                </Animated.View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={Brand.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        removeClippedSubviews={!isTV}
                        ListEmptyComponent={
                            <View style={styles.center}>
                                <Text style={[styles.empty, { color: subC, fontFamily: FontFamily.medium }]}>
                                    {isRTL ? 'لا توجد نتائج' : 'No results'}
                                </Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    rowReverse: { flexDirection: 'row-reverse' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: tv(16, TVSafe.paddingHorizontal),
        paddingTop: tv(8, 18),
        paddingBottom: 10,
    },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTextWrap: { flex: 1, paddingHorizontal: 8 },
    title: { fontSize: tv(18, 26) },
    subtitle: { fontSize: tv(12, 16), marginTop: 2 },
    searchWrap: {
        marginTop: 10,
        marginHorizontal: tv(16, TVSafe.paddingHorizontal),
        borderWidth: 1,
        borderRadius: 12,
        height: tv(42, 54),
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchInput: { flex: 1, fontSize: tv(13, 17), paddingVertical: 0 },
    list: { padding: tv(16, TVSafe.paddingHorizontal), gap: 10, paddingBottom: 28 },
    row: {
        borderRadius: 12,
        borderWidth: 1,
        minHeight: tv(56, 76),
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    rowInfo: { flex: 1 },
    rowTitle: { fontSize: tv(13, 19) },
    rowSub: { fontSize: tv(10, 14), marginTop: 3 },
    badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    badgeText: { fontSize: tv(10, 14) },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
    empty: { fontSize: tv(13, 17) },
});

