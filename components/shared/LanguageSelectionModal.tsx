import { TVPressable } from '@/components/shared/TVPressable';
import { Brand, Colors, FontFamily } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useAppTheme } from '@/contexts/theme-context';
import { LOCALE_ORDER, type Locale } from '@/lang';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    BackHandler,
    Dimensions,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const isTV = Platform.isTV;
const { width: W, height: H } = Dimensions.get('window');

const DIALOG_W = isTV ? Math.min(560, W * 0.55) : Math.min(400, W * 0.9);

interface LanguageSelectionModalProps {
    visible: boolean;
    onClose: () => void;
}

const NATIVE_NAMES: Record<Locale, string> = {
    ar: 'العربية',
    en: 'English',
    fr: 'Français',
    tr: 'Türkçe',
    ku: 'Kurdî (Kurmancî)',
    ckb: 'کوردی (سورانی)',
};

const LOCALE_FLAGS: Record<Locale, string> = {
    ar: '🇸🇦',
    en: '🇬🇧',
    fr: '🇫🇷',
    tr: '🇹🇷',
    ku: '🏳',
    ckb: '🏳',
};

export function LanguageSelectionModal({ visible, onClose }: LanguageSelectionModalProps) {
    const { locale: currentLocale, setLocale, isRTL } = useLanguage();
    const { isDark } = useAppTheme();
    const insets = useSafeAreaInsets();

    const bg = isDark ? '#111118' : '#F5F5F8';
    const textColor = isDark ? Colors.dark.text : Colors.light.text;
    const sepColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    // BackHandler only on mobile — TV uses Modal's onRequestClose
    React.useEffect(() => {
        if (!visible || isTV) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            onClose();
            return true;
        });
        return () => sub.remove();
    }, [visible, onClose]);

    const handleSelect = async (newLocale: Locale) => {
        await setLocale(newLocale);
        onClose();
    };

    if (!visible) return null;

    const title = currentLocale === 'ar' ? 'اختيار اللغة'
        : currentLocale === 'ckb' ? 'زمانی هەڵبژێرە'
            : currentLocale === 'ku' ? 'Zimana hilbijêre'
                : currentLocale === 'tr' ? 'Dil Seçin'
                    : currentLocale === 'fr' ? 'Choisir la langue'
                        : 'Select Language';

    // ─── TV: centered dialog ──────────────────────────────────────────────────
    if (isTV) {
        return (
            <Modal
                transparent
                visible={visible}
                onRequestClose={onClose}
                animationType="fade"
            >
                <View style={styles.tvOverlay}>
                    <View style={[styles.tvDialog, { backgroundColor: bg, width: DIALOG_W }]}>
                        {/* Header */}
                        <View style={[styles.sheetHeader, isRTL && styles.rowReverse]}>
                            <View style={styles.sheetIconWrap}>
                                <Ionicons name="globe-outline" size={22} color={Brand.primary} />
                            </View>
                            <Text style={[styles.sheetTitle, { color: textColor, fontFamily: FontFamily.bold }]}>
                                {title}
                            </Text>
                        </View>

                        {/* Language list */}
                        <ScrollView
                            style={styles.list}
                            showsVerticalScrollIndicator={false}
                        >
                            {LOCALE_ORDER.map((loc, i) => {
                                const isSelected = loc === currentLocale;
                                return (
                                    <TVPressable
                                        key={loc}
                                        hasTVPreferredFocus={isSelected ? true : i === 0 && currentLocale === undefined}
                                        style={[
                                            styles.row,
                                            isRTL && styles.rowReverse,
                                            isSelected && [styles.rowSelected, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }],
                                            i > 0 && { borderTopColor: sepColor, borderTopWidth: 1 },
                                        ]}
                                        onPress={() => handleSelect(loc)}
                                        focusVariant="control"
                                    >
                                        <Text style={styles.flag}>{LOCALE_FLAGS[loc]}</Text>
                                        <Text
                                            style={[
                                                styles.langName,
                                                {
                                                    color: isSelected ? Brand.primary : textColor,
                                                    fontFamily: isSelected ? FontFamily.bold : FontFamily.medium,
                                                    textAlign: isRTL ? 'right' : 'left',
                                                },
                                            ]}
                                        >
                                            {NATIVE_NAMES[loc]}
                                        </Text>
                                        {isSelected && (
                                            <View style={[styles.checkWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                                <Ionicons name="checkmark-circle-outline" size={20} color={Brand.primary} />
                                            </View>
                                        )}
                                    </TVPressable>
                                );
                            })}
                        </ScrollView>

                        {/* Close button */}
                        <TVPressable
                            style={[styles.tvCloseBtn, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]}
                            onPress={onClose}
                            focusVariant="control"
                        >
                            <Text style={[styles.tvCloseBtnText, { color: textColor, fontFamily: FontFamily.medium }]}>
                                {currentLocale === 'ar' || currentLocale === 'ckb' || currentLocale === 'ku' ? 'إغلاق' : 'Close'}
                            </Text>
                        </TVPressable>
                    </View>
                </View>
            </Modal>
        );
    }

    // ─── Mobile: bottom sheet ─────────────────────────────────────────────────
    return (
        <Modal
            transparent
            visible={visible}
            onRequestClose={onClose}
            animationType="fade"
        >
            <View style={[StyleSheet.absoluteFill, styles.modalOverlay]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

                <View style={[styles.modalSheet, { backgroundColor: bg, paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
                    <View style={styles.sheetHandle} />

                    <View style={[styles.sheetHeader, isRTL && styles.rowReverse]}>
                        <View style={styles.sheetIconWrap}>
                            <Ionicons name="globe-outline" size={22} color={Brand.primary} />
                        </View>
                        <Text style={[styles.sheetTitle, { color: textColor, fontFamily: FontFamily.bold }]}>
                            {title}
                        </Text>
                    </View>

                    <ScrollView
                        style={styles.list}
                        showsVerticalScrollIndicator={false}
                    >
                        {LOCALE_ORDER.map((loc, i) => {
                            const isSelected = loc === currentLocale;
                            return (
                                <TVPressable
                                    key={loc}
                                    style={[
                                        styles.row,
                                        isRTL && styles.rowReverse,
                                        isSelected && [styles.rowSelected, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }],
                                        i > 0 && { borderTopColor: sepColor, borderTopWidth: 1 },
                                    ]}
                                    onPress={() => handleSelect(loc)}
                                    focusVariant="control"
                                >
                                    <Text style={styles.flag}>{LOCALE_FLAGS[loc]}</Text>
                                    <Text
                                        style={[
                                            styles.langName,
                                            {
                                                color: isSelected ? Brand.primary : textColor,
                                                fontFamily: isSelected ? FontFamily.bold : FontFamily.medium,
                                                textAlign: isRTL ? 'right' : 'left',
                                            },
                                        ]}
                                    >
                                        {NATIVE_NAMES[loc]}
                                    </Text>
                                    {isSelected && (
                                        <View style={[styles.checkWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                            <Ionicons name="checkmark-circle-outline" size={20} color={Brand.primary} />
                                        </View>
                                    )}
                                </TVPressable>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    // ── TV ───────────────────────────────────────────────────────────────────
    tvOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tvDialog: {
        borderRadius: 20,
        padding: 28,
        maxHeight: H * 0.85,
    },
    tvCloseBtn: {
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
    },
    tvCloseBtnText: {
        fontSize: 15,
    },
    // ── Mobile ───────────────────────────────────────────────────────────────
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
        zIndex: 1000,
        elevation: 1000,
    },
    modalSheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        maxHeight: H * 0.85,
    },
    sheetHandle: {
        width: 44,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(150,150,150,0.35)',
        alignSelf: 'center',
        marginBottom: 20,
    },
    // ── Shared ───────────────────────────────────────────────────────────────
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    sheetIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: `${Brand.primary}20`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetTitle: {
        fontSize: 18,
    },
    rowReverse: { flexDirection: 'row-reverse' },
    list: {
        maxHeight: H * 0.55,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 4,
    },
    rowSelected: {
        borderRadius: 12,
    },
    flag: {
        fontSize: 20,
    },
    langName: {
        flex: 1,
        fontSize: 16,
    },
    checkWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
