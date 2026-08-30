/**
 * components/shared/ContentScreen.tsx  ── "Streaming OS" Redesign
 *
 * FIXES:
 *  1. TV Search: استخدام Modal overlay بدلاً من TextInput مباشر على TV
 *  2. TextInput.focus() يعمل الآن بشكل موثوق على TV عبر useEffect
 *  3. showSoftInputOnFocus مضافة لضمان ظهور الكيبورد
 *  4. TV search modal يستخدم KeyboardAvoidingView
 *  5. مربع البحث لا يتعارض مع spacer الـ TV
 */

import { FontFamily, TVSafe } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useSettings } from '@/contexts/settings-context';
import { useAppTheme } from '@/contexts/theme-context';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { LOCALE_ORDER } from '@/lang';
import { XtreamStream, xtreamService } from '@/services/xtream-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Image } from 'expo-image';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from './Skeleton';
import { TVPressable } from './TVPressable';

const isTV = Platform.isTV;
const tv = (mobile: number, tvVal: number) => (isTV ? tvVal : mobile);

const LIVE_ROW_H = tv(76, 88);
const LIVE_SEP_H = tv(8, 6);

export type ContentType = 'live' | 'movie' | 'series';

interface Category {
    category_id: string;
    category_name: string;
}

interface ContentScreenProps {
    type: ContentType;
    accentColor: string;
    gradientColors: [string, string, string];
    icon: keyof typeof Ionicons.glyphMap;
    onPressItem: (stream: XtreamStream) => void;
}

// ── Pulse Dot ──────────────────────────────────────────────────────────
const PulseDot = React.memo(({ color }: { color: string }) => {
    const op = useSharedValue(1);
    useEffect(() => {
        op.value = withRepeat(
            withSequence(withTiming(0.2, { duration: 550 }), withTiming(1, { duration: 550 })),
            -1, true
        );
    }, []);
    const s = useAnimatedStyle(() => ({ opacity: op.value }));
    return (
        <Animated.View style={[
            { width: tv(6, 8), height: tv(6, 8), borderRadius: tv(3, 4), backgroundColor: color },
            s,
        ]} />
    );
});

// ── Star Rating ────────────────────────────────────────────────────────
const StarRating = React.memo(({ rating }: { rating: number | string }) => {
    const num = parseFloat(String(rating)) / 2;
    return (
        <View style={{ flexDirection: 'row', gap: 1.5 }}>
            {Array.from({ length: 5 }).map((_, i) => {
                const filled = i < Math.floor(num);
                const half = !filled && i < Math.ceil(num);
                return (
                    <Ionicons
                        key={i}
                        name={filled ? 'star' : half ? 'star-half' : 'star-outline'}
                        size={tv(8, 11)}
                        color="#F59E0B"
                    />
                );
            })}
        </View>
    );
});

// ── Poster Card ────────────────────────────────────────────────────────
const PosterCard = React.memo(({
    item, onPressItem, accentColor, isDark, type, cardW, cardH, preferredFocus, index,
}: {
    item: XtreamStream;
    onPressItem: (item: XtreamStream) => void;
    accentColor: string;
    isDark: boolean;
    type: ContentType;
    cardW: number;
    cardH: number;
    preferredFocus?: boolean;
    index: number;
}) => {
    const scale = useSharedValue(1);
    const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const [imgErr, setImgErr] = useState(false);
    const thumbUri = item.stream_icon || (item as any).cover || '';
    const hasThumb = !!thumbUri && !imgErr;
    const rating = (item as any).rating ?? (item as any).rate;

    const handlePress = useCallback(() => {
        scale.value = withSpring(0.93, { damping: 18 }, () => { scale.value = withSpring(1); });
        onPressItem(item);
    }, [onPressItem, item]);

    return (
        <View style={{ width: cardW }}>
            <Animated.View style={aStyle}>
                <TVPressable onPress={handlePress} hasTVPreferredFocus={preferredFocus} style={styles.posterShell}>
                    <View style={[styles.posterImg, { width: cardW, height: cardH, backgroundColor: isDark ? '#0A0A14' : '#DDDDF0' }]}>
                        {hasThumb
                            ? <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" transition={200} onError={() => setImgErr(true)} />
                            : (
                                <View style={styles.posterFallback}>
                                    <Ionicons
                                        name={type === 'series' ? 'play-circle-outline' : 'film-outline'}
                                        size={tv(28, 40)}
                                        color={accentColor + '44'}
                                    />
                                </View>
                            )
                        }
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.95)']}
                            locations={[0.4, 0.7, 1]}
                            style={styles.posterScrim}
                        />
                        <View style={[styles.typeTag, { backgroundColor: accentColor }]}>
                            <Text style={[styles.typeTagTxt, { fontFamily: FontFamily.black }]}>
                                {type === 'series' ? 'S' : 'M'}
                            </Text>
                        </View>
                        {!!rating && (
                            <View style={styles.ratingPill}>
                                <Text style={[styles.ratingPillTxt, { fontFamily: FontFamily.bold }]}>
                                    ★ {parseFloat(String(rating)).toFixed(1)}
                                </Text>
                            </View>
                        )}
                        <View style={styles.posterOverlayInfo}>
                            <Text
                                style={[styles.posterOverlayTitle, { fontFamily: FontFamily.bold }]}
                                numberOfLines={2}
                            >
                                {item.name}
                            </Text>
                            {!!rating && <StarRating rating={rating} />}
                        </View>
                    </View>
                    <View style={[styles.posterAccentBar, { backgroundColor: accentColor + '22' }]}>
                        <View style={[styles.posterAccentDot, { backgroundColor: accentColor }]} />
                    </View>
                </TVPressable>
            </Animated.View>
        </View>
    );
});

// ── Live Item ──────────────────────────────────────────────────────────
const LiveItem = React.memo(({
    item, onPressItem, accentColor, isDark, preferredFocus, index,
}: {
    item: XtreamStream;
    onPressItem: (item: XtreamStream) => void;
    accentColor: string;
    isDark: boolean;
    preferredFocus?: boolean;
    index: number;
}) => {
    const scale = useSharedValue(1);
    const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const [imgErr, setImgErr] = useState(false);
    const { t } = useLanguage();
    const hasThumb = !!item.stream_icon && !imgErr;

    const handlePress = useCallback(() => {
        scale.value = withSpring(0.97, { damping: 18 }, () => { scale.value = withSpring(1); });
        onPressItem(item);
    }, [onPressItem, item]);

    const rowBg = isDark
        ? index % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.055)'
        : index % 2 === 0 ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.85)';
    const rowBorder = isDark ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.055)';
    const nameCol = isDark ? '#F2F2FC' : '#0A0A18';
    const catCol = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)';

    return (
        <View>
            <Animated.View style={aStyle}>
                <TVPressable
                    onPress={handlePress}
                    hasTVPreferredFocus={preferredFocus}
                    style={[styles.liveRow, { backgroundColor: rowBg, borderColor: rowBorder, minHeight: LIVE_ROW_H }]}
                >
                    <View style={[styles.liveAccentLine, { backgroundColor: accentColor }]} />
                    <View style={[styles.liveThumb, { backgroundColor: isDark ? '#0D0D1C' : '#EAEAF8' }]}>
                        {hasThumb
                            ? <Image source={{ uri: item.stream_icon }} style={styles.liveThumbImg} contentFit="contain" cachePolicy="disk" transition={200} onError={() => setImgErr(true)} />
                            : <Ionicons name="tv-outline" size={tv(20, 26)} color={accentColor + '70'} />
                        }
                    </View>
                    <View style={styles.liveInfo}>
                        <Text style={[styles.liveName, { color: nameCol, fontFamily: FontFamily.bold }]} numberOfLines={1}>
                            {item.name}
                        </Text>
                        {!!(item as any).category_name && (
                            <Text style={[styles.liveCat, { color: catCol, fontFamily: FontFamily.regular }]} numberOfLines={1}>
                                {(item as any).category_name}
                            </Text>
                        )}
                    </View>
                    <View style={[styles.liveBadge, { backgroundColor: accentColor + '18', borderColor: accentColor + '40' }]}>
                        <PulseDot color={accentColor} />
                        <Text style={[styles.liveBadgeTxt, { color: accentColor, fontFamily: FontFamily.black }]}>
                            {t.content.live}
                        </Text>
                    </View>
                </TVPressable>
            </Animated.View>
        </View>
    );
});

// ── Live Icon Card ─────────────────────────────────────────────────────
const LiveIconCard = React.memo(({
    item, onPressItem, accentColor, isDark, preferredFocus, index, cardW, cardH,
}: {
    item: XtreamStream;
    onPressItem: (item: XtreamStream) => void;
    accentColor: string;
    isDark: boolean;
    preferredFocus?: boolean;
    index: number;
    cardW: number;
    cardH: number;
}) => {
    const scale = useSharedValue(1);
    const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const [imgErr, setImgErr] = useState(false);
    const { t } = useLanguage();
    const hasThumb = !!item.stream_icon && !imgErr;
    const nameCol = isDark ? '#F7F7FF' : '#0A0A18';
    const mutedCol = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.42)';

    const handlePress = useCallback(() => {
        scale.value = withSpring(0.95, { damping: 18 }, () => { scale.value = withSpring(1); });
        onPressItem(item);
    }, [onPressItem, item]);

    return (
        <View style={{ width: cardW }}>
            <Animated.View style={aStyle}>
                <TVPressable
                    onPress={handlePress}
                    hasTVPreferredFocus={preferredFocus}
                    style={[
                        styles.liveIconCard,
                        {
                            height: cardH,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.045)' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.075)' : 'rgba(15,15,35,0.08)',
                        },
                    ]}
                >
                    <View style={[
                        styles.liveIconFrame,
                        {
                            height: cardW * 0.78,
                            backgroundColor: isDark ? '#0E0E1A' : '#F0F0FA',
                            borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,15,35,0.06)',
                        },
                    ]}>
                        {hasThumb ? (
                            <Image
                                source={{ uri: item.stream_icon }}
                                style={styles.liveIconImg}
                                contentFit="contain"
                                cachePolicy="disk"
                                transition={200}
                                onError={() => setImgErr(true)}
                            />
                        ) : (
                            <View style={styles.liveIconFallback}>
                                <Ionicons name="tv-outline" size={tv(30, 42)} color={accentColor + '88'} />
                            </View>
                        )}
                        <View style={[styles.liveIconBadge, { backgroundColor: accentColor + 'E8' }]}>
                            <PulseDot color="#fff" />
                            <Text style={[styles.liveIconBadgeTxt, { fontFamily: FontFamily.black }]}>
                                {t.content.live}
                            </Text>
                        </View>
                    </View>
                    <Text style={[styles.liveIconName, { color: nameCol, fontFamily: FontFamily.bold }]} numberOfLines={2}>
                        {item.name}
                    </Text>
                    {!!(item as any).category_name && (
                        <Text style={[styles.liveIconCategory, { color: mutedCol, fontFamily: FontFamily.regular }]} numberOfLines={1}>
                            {(item as any).category_name}
                        </Text>
                    )}
                </TVPressable>
            </Animated.View>
        </View>
    );
});

// ── Category Pill ──────────────────────────────────────────────────────
const CategoryPill = React.memo(({ label, active, onPress, accentColor, isDark }: {
    label: string; active: boolean; onPress: () => void; accentColor: string; isDark: boolean;
}) => {
    const scale = useSharedValue(1);
    const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    const handlePress = useCallback(() => {
        scale.value = withSpring(0.85, { damping: 16 }, () => { scale.value = withSpring(1); });
        onPress();
    }, [onPress]);

    return (
        <Animated.View style={[aStyle, active && {
            shadowColor: accentColor, shadowOpacity: 0.55,
            shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 8,
        }]}>
            <TVPressable
                onPress={handlePress}
                style={[
                    styles.pill,
                    active
                        ? { backgroundColor: accentColor, borderColor: accentColor }
                        : { backgroundColor: 'transparent', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' },
                ]}
                focusVariant="control"
            >
                {active && <View style={[styles.pillDot, { backgroundColor: '#fff' }]} />}
                <Text style={[
                    styles.pillTxt,
                    {
                        color: active ? '#fff' : isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.38)',
                        fontFamily: active ? FontFamily.bold : FontFamily.medium,
                    },
                ]} numberOfLines={1}>
                    {label}
                </Text>
            </TVPressable>
        </Animated.View>
    );
});

// ── Skeletons ──────────────────────────────────────────────────────────
const GridSkeleton = React.memo(({ numCols, cardW, cardH }: { numCols: number; cardW: number; cardH: number }) => (
    <View style={styles.gridContainer}>
        {Array.from({ length: numCols * 3 }).map((_, i) => (
            <View key={i} style={{ width: cardW, gap: 5 }}>
                <Skeleton width={cardW} height={cardH} borderRadius={10} />
                <Skeleton width="72%" height={tv(11, 16)} borderRadius={4} />
            </View>
        ))}
    </View>
));

const ListSkeleton = React.memo(({ isDark }: { isDark: boolean }) => {
    const bg = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.03)';
    const br = isDark ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.055)';
    return (
        <View style={styles.listContent}>
            {Array.from({ length: isTV ? 12 : 9 }).map((_, i) => (
                <View key={i} style={[styles.liveRow, { backgroundColor: bg, borderColor: br, minHeight: LIVE_ROW_H, marginBottom: LIVE_SEP_H }]}>
                    <View style={[styles.liveAccentLine, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
                    <Skeleton width={tv(60, 80)} height={tv(42, 56)} borderRadius={8} />
                    <View style={styles.liveInfo}>
                        <Skeleton width="58%" height={tv(12, 16)} borderRadius={4} style={{ marginBottom: 6 }} />
                        <Skeleton width="35%" height={tv(9, 12)} borderRadius={4} />
                    </View>
                </View>
            ))}
        </View>
    );
});

// ══════════════════════════════════════════════════════════════════════
//  TV SEARCH MODAL — مكوّن منفصل للبحث على شاشات التلفاز
//  يستخدم Modal كامل الشاشة لضمان ظهور الكيبورد بشكل صحيح
// ══════════════════════════════════════════════════════════════════════
const TVSearchModal = React.memo(({
    visible,
    onClose,
    onSearch,
    accentColor,
    isDark,
    placeholder,
}: {
    visible: boolean;
    onClose: () => void;
    onSearch: (q: string) => void;
    accentColor: string;
    isDark: boolean;
    placeholder: string;
}) => {
    const inputRef = useRef<TextInput>(null);
    const [localQuery, setLocalQuery] = useState('');

    // فتح الكيبورد فور ظهور المودال
    useEffect(() => {
        if (visible) {
            // InteractionManager يضمن أن المودال اتعرض خلاص قبل الـ focus
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setLocalQuery('');
            onSearch('');
        }
    }, [visible]);

    const handleChange = useCallback((text: string) => {
        setLocalQuery(text);
        onSearch(text);
    }, [onSearch]);

    const handleClear = useCallback(() => {
        setLocalQuery('');
        onSearch('');
        inputRef.current?.focus();
    }, [onSearch]);

    if (!isTV) return null; // هذا المكوّن لـ TV فقط

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            onShow={() => inputRef.current?.focus()}
            supportedOrientations={['landscape', 'portrait']}
        >
            <KeyboardAvoidingView style={styles.tvModalOverlay} behavior="padding">
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={[
                    styles.tvModalBox,
                    {
                        backgroundColor: isDark ? 'rgba(10,10,30,0.97)' : 'rgba(240,240,255,0.97)',
                        borderColor: accentColor + '55',
                    }
                ]}>
                    <View style={[styles.tvSearchInner, { borderColor: accentColor + '88', borderWidth: 2, borderRadius: 16 }]}>
                        <Ionicons name="search-outline" size={28} color={accentColor} />
                        <TextInput
                            ref={inputRef}
                            style={[
                                styles.tvSearchInput,
                                {
                                    color: isDark ? '#fff' : '#000',
                                    fontFamily: FontFamily.regular,
                                }
                            ]}
                            value={localQuery}
                            onChangeText={handleChange}
                            placeholder={placeholder}
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                            autoCapitalize="none"
                            returnKeyType="search"
                            onSubmitEditing={onClose}
                            // هذه الثلاثة ضروريين لفتح الكيبورد فوراً على Android TV
                            showSoftInputOnFocus
                            autoFocus
                            blurOnSubmit={false}
                        />
                        {localQuery.length > 0 && (
                            <Pressable onPress={handleClear} hitSlop={16}>
                                <Ionicons name="close-circle" size={24} color={accentColor + '99'} />
                            </Pressable>
                        )}
                    </View>
                    <Pressable
                        onPress={onClose}
                        style={[styles.tvModalClose, { backgroundColor: accentColor + '22', borderColor: accentColor + '55' }]}
                    >
                        <Text style={[styles.tvModalCloseTxt, { color: accentColor, fontFamily: FontFamily.bold }]}>
                            ✓ تأكيد
                        </Text>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
});

// ══════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export function ContentScreen({ type, accentColor, gradientColors, icon, onPressItem }: ContentScreenProps) {
    const { isDark, toggleTheme } = useAppTheme();
    const { isRTL, t, locale, setLocale } = useLanguage();
    const { hiddenCategories, hiddenStreams } = useSettings();
    const insets = useSafeAreaInsets();

    const [streams, setStreams] = useState<XtreamStream[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCat, setActiveCat] = useState<string>('all');
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchFocused, setSearchFocused] = useState(false);
    const [searchVisible, setSearchVisible] = useState(false);

    // FIX: ref للـ TextInput على mobile فقط
    const mobileInputRef = useRef<TextInput>(null);

    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;

    const isGrid = type !== 'live';
    const isLiveGrid = type === 'live';
    const cardGap = isLargeScreen ? 12 : tv(9, 12);
    const sidebarW = isLargeScreen ? tv(0, 200) : 0;
    const horizPad = isLargeScreen ? tv(28, 48) : tv(12, 32);
    const availW = width - sidebarW - horizPad;
    const numCols = isLargeScreen
        ? Math.max(3, Math.floor(availW / 150))
        : tv(2, 3);
    const cardW = (availW - cardGap * (numCols - 1)) / numCols;
    const cardH = cardW * 1.45;
    const liveNumCols = isLargeScreen ? Math.max(4, Math.floor(availW / 132)) : tv(2, 3);
    const liveCardW = (availW - cardGap * (liveNumCols - 1)) / liveNumCols;
    const liveCardH = liveCardW * 1.18;

    const rootBg = isDark ? '#060610' : '#F4F4FC';
    const subCol = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
    const SEARCH_H = isTV ? 50 : 42;

    // FIX: toggleSearch منفصل لـ TV و mobile
    const toggleSearch = useCallback(() => {
        if (isTV) {
            // TV: فتح المودال مباشرة
            setSearchVisible(prev => !prev);
        } else {
            // Mobile: السلوك الأصلي مع focus
            setSearchVisible(prev => {
                const next = !prev;
                if (next) {
                    setTimeout(() => mobileInputRef.current?.focus(), 80);
                } else {
                    setQuery('');
                }
                return next;
            });
        }
    }, []);

    // FIX: callback لـ TV modal
    const handleTVSearch = useCallback((q: string) => {
        setQuery(q);
    }, []);

    const handleTVClose = useCallback(() => {
        setSearchVisible(false);
    }, []);

    // ── Data ──────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [cats, strs] = await Promise.all([
                xtreamService.getCategories(type),
                xtreamService.getStreams(type),
            ]);
            setCategories(cats as unknown as Category[]);
            setStreams(strs);
        } catch (e) {
            console.warn('ContentScreen load error', e);
        } finally {
            setLoading(false);
        }
    }, [type]);

    useEffect(() => { loadData(); }, [loadData]);

    const visibleCategories = useMemo(() => {
        const hiddenSet = new Set(hiddenCategories[type].map(String));
        return categories.filter(cat => !hiddenSet.has(String(cat.category_id)));
    }, [categories, hiddenCategories, type]);

    useEffect(() => {
        if (activeCat === 'all') return;
        const exists = visibleCategories.some(cat => String(cat.category_id) === activeCat);
        if (!exists) setActiveCat('all');
    }, [activeCat, visibleCategories]);

    const debouncedQuery = useDebouncedValue(query, 200);

    const filtered = useMemo(() => {
        let list = streams.filter((s) => {
            const catId = String(s.category_id ?? '');
            const streamId = String(s.stream_id ?? s.series_id ?? '');
            return !hiddenCategories[type].includes(catId) && !hiddenStreams[type].includes(streamId);
        });
        if (activeCat !== 'all') list = list.filter(s => String(s.category_id) === activeCat);
        if (debouncedQuery.trim()) {
            const q = debouncedQuery.trim().toLowerCase();
            list = list.filter(s => s.name?.toLowerCase().includes(q));
        }
        return list;
    }, [streams, activeCat, debouncedQuery, hiddenCategories, hiddenStreams, type]);

    const toggleLanguage = useCallback(() => {
        const i = LOCALE_ORDER.indexOf(locale);
        setLocale(LOCALE_ORDER[(i + 1) % LOCALE_ORDER.length]);
    }, [locale, setLocale]);

    const typeLabel = useMemo(
        () => ({ live: t.content.liveTV, movie: t.content.movies, series: t.content.series }[type]),
        [type, t]
    );

    // ── Renderers ─────────────────────────────────────────────────────
    const renderPoster = useCallback(({ item, index }: { item: XtreamStream; index: number }) => (
        <PosterCard
            item={item}
            index={index}
            onPressItem={onPressItem}
            accentColor={accentColor}
            isDark={isDark}
            type={type}
            cardW={cardW}
            cardH={cardH}
            preferredFocus={isTV && index === 0}
        />
    ), [accentColor, isDark, type, onPressItem, cardW, cardH]);

    const renderLive = useCallback(({ item, index }: { item: XtreamStream; index: number }) => (
        <LiveItem
            item={item}
            index={index}
            onPressItem={onPressItem}
            accentColor={accentColor}
            isDark={isDark}
            preferredFocus={isTV && index === 0}
        />
    ), [accentColor, isDark, onPressItem]);

    const renderLiveGrid = useCallback(({ item, index }: { item: XtreamStream; index: number }) => (
        <LiveIconCard
            item={item}
            index={index}
            onPressItem={onPressItem}
            accentColor={accentColor}
            isDark={isDark}
            preferredFocus={isTV && index === 0}
            cardW={liveCardW}
            cardH={liveCardH}
        />
    ), [accentColor, isDark, liveCardH, liveCardW, onPressItem]);

    const liveGetItemLayout = useCallback((_: any, index: number) => ({
        length: LIVE_ROW_H + LIVE_SEP_H,
        offset: (LIVE_ROW_H + LIVE_SEP_H) * index,
        index,
    }), []);

    const keyGrid = useCallback((item: XtreamStream) =>
        String(item.stream_id ?? item.series_id ?? item.name), []);
    const keyLive = useCallback((item: XtreamStream) =>
        String(item.stream_id ?? item.name), []);

    return (
        <View style={[styles.root, { backgroundColor: rootBg }]}>

            {/* ══════════ TV SEARCH MODAL ══════════ */}
            {isTV && (
                <TVSearchModal
                    visible={searchVisible}
                    onClose={handleTVClose}
                    onSearch={handleTVSearch}
                    accentColor={accentColor}
                    isDark={isDark}
                    placeholder={t.content.searchPlaceholder}
                />
            )}

            {/* ══════════ HEADER ══════════ */}
            <Animated.View entering={FadeIn.duration(200)}>
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1.2, y: 1 }}
                    style={[styles.header, {
                        paddingTop: insets.top + tv(10, 6),
                        paddingBottom: tv(10, 8),
                        gap: tv(8, 10),
                    }]}
                >
                    {/* ── Single-bar row ── */}
                    <View style={[styles.headerRow, isRTL && styles.rtl]}>

                        {/* Left cluster */}
                        <View style={[styles.headerLeft, isRTL && styles.rtl]}>
                            <TVPressable
                                onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
                                style={styles.hBtn}
                                focusVariant="control"
                            >
                                <Ionicons
                                    name={isRTL ? 'chevron-forward' : 'chevron-back'}
                                    size={tv(16, 20)}
                                    color="rgba(255,255,255,0.9)"
                                />
                            </TVPressable>
                            <View style={styles.hDivider} />
                            <View style={[styles.hTitleGroup, isRTL && styles.rtl]}>
                                <View style={[styles.hIconWrap, { borderColor: 'rgba(255,255,255,0.22)' }]}>
                                    <Ionicons name={icon} size={tv(13, 16)} color="#fff" />
                                </View>
                                <View>
                                    <Text style={[styles.hTitle, { fontFamily: FontFamily.black }]}>{typeLabel}</Text>
                                    {!isTV && (
                                        <Text style={[styles.hCount, { fontFamily: FontFamily.regular }]}>
                                            {loading ? '—' : `${filtered.length} ${t.content.items}`}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* Right cluster */}
                        <View style={[styles.headerRight, isRTL && styles.rtl]}>
                            {isTV && !loading && (
                                <View style={styles.tvCountBadge}>
                                    <Text style={[styles.tvCountTxt, { fontFamily: FontFamily.bold }]}>
                                        {filtered.length}
                                    </Text>
                                </View>
                            )}

                            {/* FIX: أيقونة البحث — تعرض حالة البحث النشطة حتى على TV */}
                            <TVPressable
                                onPress={toggleSearch}
                                style={[
                                    styles.hBtn,
                                    (searchVisible || (query.length > 0 && isTV)) && {
                                        backgroundColor: accentColor + '33',
                                        borderWidth: 1,
                                        borderColor: accentColor + '88',
                                    },
                                ]}
                                focusVariant="control"
                            >
                                <Ionicons
                                    name={searchVisible && !isTV ? 'close-outline' : 'search-outline'}
                                    size={tv(15, 20)}
                                    color={(searchVisible || query.length > 0) ? accentColor : 'rgba(255,255,255,0.85)'}
                                />
                            </TVPressable>

                            {/* FIX: مؤشر نصي للبحث على TV يظهر بجانب الأيقونة */}
                            {isTV && query.length > 0 && (
                                <Pressable
                                    onPress={() => { setQuery(''); }}
                                    style={[styles.tvActiveSearch, { backgroundColor: accentColor + '22', borderColor: accentColor + '55' }]}
                                >
                                    <Text style={[styles.tvActiveSearchTxt, { color: accentColor, fontFamily: FontFamily.bold }]} numberOfLines={1}>
                                        "{query}"  ✕
                                    </Text>
                                </Pressable>
                            )}

                            <TVPressable onPress={toggleLanguage} style={styles.hBtn} focusVariant="control">
                                <Text style={[styles.hLang, { fontFamily: FontFamily.bold }]}>{locale.toUpperCase()}</Text>
                            </TVPressable>
                            <TVPressable onPress={toggleTheme} style={styles.hBtn} focusVariant="control">
                                <Ionicons
                                    name={isDark ? 'sunny-outline' : 'moon-outline'}
                                    size={tv(14, 18)}
                                    color="rgba(255,255,255,0.85)"
                                />
                            </TVPressable>
                            <TVPressable onPress={loadData} style={styles.hBtn} focusVariant="control">
                                <Ionicons name="refresh-outline" size={tv(14, 18)} color="rgba(255,255,255,0.65)" />
                            </TVPressable>
                        </View>
                    </View>

                    {/* ── Search bar — Mobile ONLY ── */}
                    {/* FIX: هذا المربع الآن لـ mobile فقط، TV يستخدم TVSearchModal */}
                    {!isTV && searchVisible && (
                        <View style={[
                            styles.searchBar,
                            isRTL && styles.rtl,
                            {
                                backgroundColor: 'rgba(0,0,0,0.28)',
                                borderColor: searchFocused
                                    ? 'rgba(255,255,255,0.6)'
                                    : 'rgba(255,255,255,0.1)',
                                height: SEARCH_H,
                            },
                        ]}>
                            <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.5)" />
                            <TextInput
                                ref={mobileInputRef}
                                style={[styles.searchInput, {
                                    fontFamily: FontFamily.regular,
                                    textAlign: isRTL ? 'right' : 'left',
                                    fontSize: 16,
                                }]}
                                placeholder={t.content.searchPlaceholder}
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={query}
                                onChangeText={setQuery}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                                autoCapitalize="none"
                                returnKeyType="search"
                                showSoftInputOnFocus
                            />
                            {query.length > 0 && (
                                <Pressable onPress={() => setQuery('')} hitSlop={10}>
                                    <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.45)" />
                                </Pressable>
                            )}
                        </View>
                    )}
                </LinearGradient>
            </Animated.View>

            {/* Spacer for Top Tabs on TV */}
            {isTV && <View style={{ height: 80 }} />}

            {/* ══════════ BODY ══════════ */}
            <View style={[styles.body, isLargeScreen && { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>

                {/* ── Categories sidebar / pills ── */}
                {visibleCategories.length > 0 && (
                    <Animated.View
                        entering={FadeInDown.duration(300).delay(60)}
                        style={isLargeScreen ? [styles.sidebar, {
                            width: sidebarW,
                            borderRightWidth: isRTL ? 0 : 1,
                            borderLeftWidth: isRTL ? 1 : 0,
                            borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)',
                        }] : undefined}
                    >
                        <ScrollView
                            horizontal={!isLargeScreen}
                            showsHorizontalScrollIndicator={false}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={[
                                isLargeScreen ? styles.sidebarInner : styles.pillsRow,
                                !isLargeScreen && isRTL && { flexDirection: 'row-reverse' },
                            ]}
                            style={[
                                !isLargeScreen && styles.pillsBar,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.018)' },
                            ]}
                        >
                            <CategoryPill
                                label={t.content.allCategories}
                                active={activeCat === 'all'}
                                onPress={() => setActiveCat('all')}
                                accentColor={accentColor}
                                isDark={isDark}
                            />
                            {visibleCategories.map(cat => (
                                <CategoryPill
                                    key={cat.category_id}
                                    label={cat.category_name}
                                    active={activeCat === cat.category_id}
                                    onPress={() => setActiveCat(cat.category_id)}
                                    accentColor={accentColor}
                                    isDark={isDark}
                                />
                            ))}
                        </ScrollView>
                    </Animated.View>
                )}

                {/* ── Content area ── */}
                <View style={styles.content}>
                    {loading ? (
                        isGrid || isLiveGrid
                            ? <View style={styles.center}><ActivityIndicator size="large" color={accentColor} /></View>
                            : <ScrollView showsVerticalScrollIndicator={false}><ListSkeleton isDark={isDark} /></ScrollView>
                    ) : filtered.length === 0 ? (
                        <View style={styles.center}>
                            <Ionicons
                                name="film-outline"
                                size={tv(44, 64)}
                                color={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}
                            />
                            <Text style={[styles.emptyTxt, { color: subCol, fontFamily: FontFamily.medium }]}>
                                {t.content.noResults}
                            </Text>
                        </View>
                    ) : isLiveGrid ? (
                        <FlatList
                            data={filtered}
                            key={`live-grid-${liveNumCols}`}
                            keyExtractor={keyLive}
                            renderItem={renderLiveGrid}
                            numColumns={liveNumCols}
                            columnWrapperStyle={[styles.liveGridRow, isRTL && styles.rtl]}
                            contentContainerStyle={[styles.liveGridContainer, { gap: cardGap, paddingBottom: insets.bottom + tv(80, 32) }]}
                            showsVerticalScrollIndicator={false}
                            initialNumToRender={liveNumCols * 3}
                            maxToRenderPerBatch={liveNumCols * 3}
                            windowSize={5}
                            removeClippedSubviews={!isTV}
                        />
                    ) : isGrid ? (
                        <FlatList
                            data={filtered}
                            key={`grid-${numCols}`}
                            keyExtractor={keyGrid}
                            renderItem={renderPoster}
                            numColumns={numCols}
                            columnWrapperStyle={[styles.gridRow, { gap: cardGap }, isRTL && { flexDirection: 'row-reverse' }]}
                            contentContainerStyle={[styles.gridContainer, { gap: cardGap, paddingBottom: insets.bottom + tv(80, 32) }]}
                            showsVerticalScrollIndicator={false}
                            initialNumToRender={numCols * 3}
                            maxToRenderPerBatch={numCols * 3}
                            windowSize={5}
                            removeClippedSubviews={!isTV}
                        />
                    ) : (
                        <FlatList
                            data={filtered}
                            keyExtractor={keyLive}
                            renderItem={renderLive}
                            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + tv(80, 32) }]}
                            showsVerticalScrollIndicator={false}
                            ItemSeparatorComponent={() => <View style={{ height: LIVE_SEP_H }} />}
                            getItemLayout={liveGetItemLayout}
                            initialNumToRender={isTV ? 14 : 12}
                            maxToRenderPerBatch={isTV ? 14 : 12}
                            windowSize={5}
                            removeClippedSubviews={!isTV}
                        />
                    )}
                </View>
            </View>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
    root: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    rtl: { flexDirection: 'row-reverse' },
    emptyTxt: { fontSize: tv(12, 17), textAlign: 'center', marginTop: 8 },

    header: {
        paddingHorizontal: tv(12, TVSafe.paddingHorizontal),
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: tv(38, 40),
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tv(6, 10),
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tv(4, 8),
    },
    hBtn: {
        height: tv(28, 34),
        minWidth: tv(28, 34),
        paddingHorizontal: tv(6, 8),
        borderRadius: tv(14, 17),
        backgroundColor: 'rgba(0,0,0,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hDivider: {
        width: 1,
        height: tv(16, 20),
        backgroundColor: 'rgba(255,255,255,0.18)',
        marginHorizontal: tv(2, 4),
    },
    hTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tv(6, 8),
    },
    hIconWrap: {
        width: tv(26, 30),
        height: tv(26, 30),
        borderRadius: tv(13, 15),
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hTitle: {
        color: '#fff',
        fontSize: tv(14, 17),
        letterSpacing: -0.4,
    },
    hCount: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: tv(9, 12),
        marginTop: 1,
    },
    hLang: {
        color: '#fff',
        fontSize: tv(8, 11),
        letterSpacing: 0.8,
    },
    tvCountBadge: {
        height: 24,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tvCountTxt: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },

    // ── TV Active Search indicator ──
    tvActiveSearch: {
        height: 28,
        maxWidth: 180,
        paddingHorizontal: 10,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tvActiveSearchTxt: {
        fontSize: 11,
        letterSpacing: 0.3,
    },

    // ── TV Search Modal ──
    tvModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tvModalBox: {
        width: '60%',
        maxWidth: 700,
        borderRadius: 24,
        padding: 32,
        borderWidth: 1.5,
        gap: 20,
        alignItems: 'stretch',
    },
    tvSearchInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        gap: 14,
    },
    tvSearchInput: {
        flex: 1,
        fontSize: 22,
        paddingVertical: 0,
    },
    tvModalClose: {
        alignSelf: 'center',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 30,
        borderWidth: 1,
    },
    tvModalCloseTxt: {
        fontSize: 16,
        letterSpacing: 0.5,
    },

    // ── Mobile Search bar ──
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: tv(9, 14),
        paddingHorizontal: tv(10, 16),
        borderWidth: 1.5,
        gap: tv(6, 9),
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        paddingVertical: 0,
    },
    body: { flex: 1 },
    sidebar: { overflow: 'hidden' },
    sidebarInner: {
        paddingHorizontal: 10,
        paddingVertical: 14,
        gap: tv(7, 10),
    },
    pillsBar: { maxHeight: tv(44, 58) },
    pillsRow: {
        flexDirection: 'row',
        paddingHorizontal: tv(12, TVSafe.paddingHorizontal),
        paddingVertical: tv(7, 10),
        gap: tv(6, 9),
    },
    content: { flex: 1 },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tv(11, 16),
        paddingVertical: tv(5, 8),
        borderRadius: 30,
        borderWidth: 1,
        gap: 5,
    },
    pillDot: {
        width: tv(4, 5),
        height: tv(4, 5),
        borderRadius: tv(2, 2.5),
    },
    pillTxt: { fontSize: tv(10, 13) },
    gridContainer: {
        paddingHorizontal: tv(12, 36),
        paddingTop: tv(8, 14),
    },
    gridRow: {},
    liveGridContainer: {
        paddingHorizontal: tv(12, TVSafe.paddingHorizontal),
        paddingTop: tv(7, 12),
    },
    liveGridRow: {
        justifyContent: 'space-between',
    },
    liveIconCard: {
        borderRadius: tv(13, 16),
        borderWidth: 1,
        padding: tv(6, 9),
        alignItems: 'center',
        overflow: 'hidden',
    },
    liveIconFrame: {
        width: '100%',
        borderRadius: tv(9, 12),
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    liveIconImg: {
        width: '82%',
        height: '82%',
    },
    liveIconFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    liveIconBadge: {
        position: 'absolute',
        top: tv(6, 9),
        right: tv(6, 9),
        flexDirection: 'row',
        alignItems: 'center',
        gap: tv(3, 4),
        paddingHorizontal: tv(6, 8),
        paddingVertical: tv(3, 4),
        borderRadius: tv(7, 9),
    },
    liveIconBadgeTxt: {
        color: '#fff',
        fontSize: tv(7, 9),
        letterSpacing: 0.45,
    },
    liveIconName: {
        width: '100%',
        textAlign: 'center',
        fontSize: tv(10, 13),
        lineHeight: tv(13, 17),
        marginTop: tv(7, 9),
    },
    liveIconCategory: {
        width: '100%',
        textAlign: 'center',
        fontSize: tv(8, 10),
        marginTop: 3,
    },
    posterShell: {
        borderRadius: tv(10, 12),
        overflow: 'hidden',
    },
    posterImg: {
        borderRadius: tv(10, 12),
        overflow: 'hidden',
    },
    posterFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    posterScrim: {
        ...StyleSheet.absoluteFillObject,
    },
    typeTag: {
        position: 'absolute',
        top: tv(6, 8),
        left: tv(6, 8),
        width: tv(16, 20),
        height: tv(16, 20),
        borderRadius: tv(4, 5),
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeTagTxt: {
        color: '#fff',
        fontSize: tv(7, 9),
    },
    ratingPill: {
        position: 'absolute',
        top: tv(6, 8),
        right: tv(6, 8),
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: tv(5, 7),
        paddingVertical: tv(2, 3),
        borderRadius: tv(5, 7),
    },
    ratingPillTxt: {
        color: '#F59E0B',
        fontSize: tv(7, 10),
    },
    posterOverlayInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: tv(7, 10),
        gap: tv(3, 4),
    },
    posterOverlayTitle: {
        color: '#fff',
        fontSize: tv(10, 14),
        lineHeight: tv(13, 18),
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    posterAccentBar: {
        height: tv(3, 4),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tv(8, 10),
    },
    posterAccentDot: {
        width: tv(14, 18),
        height: tv(2, 3),
        borderRadius: 2,
    },
    listContent: {
        paddingHorizontal: tv(12, TVSafe.paddingHorizontal),
        paddingTop: tv(7, 12),
    },
    liveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: tv(12, 14),
        borderWidth: 1,
        paddingVertical: tv(8, 10),
        paddingHorizontal: tv(0, 0),
        overflow: 'hidden',
    },
    liveAccentLine: {
        width: tv(3, 4),
        alignSelf: 'stretch',
        marginRight: tv(10, 14),
        borderRadius: 2,
        marginVertical: tv(8, 10),
    },
    liveThumb: {
        width: tv(60, 80),
        height: tv(42, 56),
        borderRadius: tv(8, 10),
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    liveThumbImg: { width: '100%', height: '100%' },
    liveInfo: { flex: 1, paddingRight: tv(8, 12) },
    liveName: { fontSize: tv(12, 16), marginBottom: 2 },
    liveCat: { fontSize: tv(9, 12) },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tv(3, 5),
        paddingHorizontal: tv(8, 12),
        paddingVertical: tv(3, 6),
        borderRadius: tv(8, 10),
        borderWidth: 1,
        marginRight: tv(10, 14),
    },
    liveBadgeTxt: { fontSize: tv(8, 11), letterSpacing: 0.7 },
});