import { TVPressable } from '@/components/shared/TVPressable';
import { TVColumn, TVRow } from '@/components/tv/SpatialWrappers';
import { Brand, Colors, FontFamily, tv, TVSafe } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useAppTheme } from '@/contexts/theme-context';
import { useLegalAcceptance } from '@/hooks/use-legal-acceptance';
import { useProviders } from '@/hooks/use-providers';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    findNodeHandle,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    UIManager,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const isTV = Platform.isTV;

// ─── كمية الـ padding الإضافية في نهاية الـ ScrollView
// على TV نضيف مساحة كبيرة تضمن إن آخر field يطلع فوق الكيبورد
// على أي منصة كانت (Android TV, Fire TV, Apple TV, Tizen, webOS)
const TV_BOTTOM_PADDING = 420;
const MOBILE_BOTTOM_PADDING = 24;

// ─── Compact Field ────────────────────────────────────────────────────────────
const Field = React.forwardRef<TextInput, {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    placeholder: string;
    secure?: boolean;
    keyboardType?: 'default' | 'url' | 'email-address';
    labelColor: string;
    cardBg: string;
    borderColor: string;
    subColor: string;
    inputColor: string;
    textAlign: 'left' | 'right';
    isDark: boolean;
    showPass: boolean;
    setShowPass: (val: boolean | ((prev: boolean) => boolean)) => void;
    onSubmitEditing?: () => void;
    returnKeyType?: 'next' | 'done' | 'go' | 'search' | 'send';
    onFocusScroll?: () => void;
}>(({
    icon, label, value, onChangeText, placeholder, secure,
    keyboardType, labelColor, cardBg, borderColor, subColor,
    inputColor, textAlign, isDark, showPass, setShowPass,
    onSubmitEditing, returnKeyType = 'next', onFocusScroll,
}, ref) => {
    const [focused, setFocused] = useState(false);
    const internalRef = useRef<TextInput>(null);
    const resolvedRef = (ref && 'current' in ref) ? ref as React.RefObject<TextInput> : internalRef;

    return (
        <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: labelColor, textAlign, fontFamily: FontFamily.medium }]}>
                {label}
            </Text>
            <Pressable
                onPress={() => resolvedRef.current?.focus()}
                focusable={isTV}
                style={({ focused: tvFocused }: { focused: boolean }) => [
                    styles.fieldRow,
                    {
                        backgroundColor: cardBg,
                        borderColor: (focused || tvFocused) ? Brand.primary : borderColor,
                        borderWidth: (focused || tvFocused) ? 1.5 : 1,
                    },
                ]}
            >
                <Ionicons
                    name={icon}
                    size={tv(16, 20)}
                    color={focused ? Brand.primary : subColor}
                    style={styles.fieldIcon}
                />
                <TextInput
                    ref={ref || internalRef}
                    style={[styles.fieldText, { color: inputColor, fontFamily: FontFamily.regular }]}
                    placeholder={placeholder}
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)'}
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={secure && !showPass}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    keyboardType={keyboardType ?? 'default'}
                    returnKeyType={returnKeyType}
                    onSubmitEditing={onSubmitEditing}
                    blurOnSubmit={returnKeyType === 'done'}
                    showSoftInputOnFocus
                    onFocus={() => {
                        setFocused(true);
                        onFocusScroll?.();
                    }}
                    onBlur={() => setFocused(false)}
                />
                {secure && (
                    <TVPressable onPress={() => setShowPass(v => !v)} hitSlop={8} focusVariant="control">
                        <Ionicons
                            name={showPass ? 'eye-off-outline' : 'eye-outline'}
                            size={tv(16, 20)}
                            color={subColor}
                        />
                    </TVPressable>
                )}
            </Pressable>
        </View>
    );
});
Field.displayName = 'Field';

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AddProviderScreen() {
    const { edit } = useLocalSearchParams<{ edit?: string }>();
    const { providers, addProvider, updateProvider } = useProviders();
    const { isDark } = useAppTheme();
    const { isRTL, t } = useLanguage();
    const { isAccepted, isLoading: legalLoading, accept } = useLegalAcceptance();

    // ── Refs ──────────────────────────────────────────────────────────────────
    const scrollRef   = useRef<ScrollView>(null);
    const nameRef     = useRef<TextInput>(null);
    const urlRef      = useRef<TextInput>(null);
    const usernameRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);

    const editProvider = edit ? providers.find(p => p.id === edit) ?? null : null;
    const isEditMode   = !!editProvider;

    const [type,     setType]     = useState<'xtream' | 'm3u' | 'local'>(editProvider?.type ?? 'xtream');
    const [name,     setName]     = useState(editProvider?.name     ?? '');
    const [url,      setUrl]      = useState(editProvider?.url      ?? '');
    const [username, setUsername] = useState(editProvider?.username ?? '');
    const [password, setPassword] = useState(editProvider?.password ?? '');
    const [showPass, setShowPass] = useState(false);

    useEffect(() => {
        if (editProvider) {
            setType(editProvider.type ?? 'xtream');
            setName(editProvider.name);
            setUrl(editProvider.url);
            setUsername(editProvider.username);
            setPassword(editProvider.password);
        }
    }, [editProvider]);

    useEffect(() => {
        if (legalLoading) return;
        if (!isAccepted && providers.length > 0) accept();
    }, [accept, isAccepted, legalLoading, providers.length]);

    // ── TV Scroll helper ──────────────────────────────────────────────────────
    /*
     * على TV الكيبورد overlay بيطلع من أسفل الشاشة ويغطي جزء منها.
     * مفيش API موحد يقول لنا ارتفاعه عبر كل المنصات:
     *   Android TV / Google TV  ≈ 300px
     *   Amazon Fire TV          ≈ 280px
     *   Apple TV (tvOS)         ≈ 350px
     *   Samsung Tizen           ≈ 260px
     *   LG webOS                ≈ 270px
     *
     * الحل: measureLayout يحسب Y للـ field ثم scrollTo بـ offset كافي.
     * للـ password (آخر field) نستخدم scrollToEnd مباشرة — أبسط وأضمن.
     */
    const EXTRA_OFFSET = isTV ? 280 : 80;

    const scrollToRef = (fieldRef: React.RefObject<TextInput | null>) => {
        if (!scrollRef.current) return;
        // findNodeHandle is native-only. On web, scrolling to the end keeps
        // the focused field visible without throwing an unhandled runtime error.
        if (Platform.OS === 'web') {
            scrollRef.current.scrollToEnd({ animated: true });
            return;
        }
        const fieldNode  = findNodeHandle(fieldRef.current);
        const scrollNode = findNodeHandle(scrollRef.current);
        if (!fieldNode || !scrollNode) return;

        UIManager.measureLayout(
            fieldNode,
            scrollNode,
            () => scrollRef.current?.scrollToEnd({ animated: true }), // fallback
            (_x, y) => {
                scrollRef.current?.scrollTo({
                    y: Math.max(0, y - EXTRA_OFFSET),
                    animated: true,
                });
            },
        );
    };

    // ── Theme tokens ──────────────────────────────────────────────────────────
    const bg          = isDark ? '#09090F' : '#F0F0F8';
    const cardBg      = isDark ? 'rgba(255,255,255,0.07)' : '#fff';
    const borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
    const textColor   = isDark ? Colors.dark.text : Colors.light.text;
    const subColor    = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
    const inputColor  = isDark ? '#fff' : '#111';
    const textAlign   = (isRTL ? 'right' : 'left') as 'right' | 'left';

    const fieldProps = {
        labelColor: textColor, cardBg, borderColor, subColor,
        inputColor, textAlign, isDark, showPass, setShowPass,
    };

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (legalLoading) return;
        if (!isAccepted) return;
        if (!name.trim()) { Alert.alert(t.common.error, t.login.fillAllFields); return; }
        if (type === 'xtream' && (!url.trim() || !username.trim() || !password.trim())) {
            Alert.alert(t.common.error, t.login.fillAllFields); return;
        }
        if ((type === 'm3u' || type === 'local') && !url.trim()) {
            Alert.alert(t.common.error, t.login.fillAllFields); return;
        }
        const data = {
            type,
            name:     name.trim(),
            url:      url.trim(),
            username: username.trim(),
            password: password.trim(),
        };
        try {
            if (isEditMode && editProvider) {
                await updateProvider(editProvider.id, data);
            } else {
                await addProvider(data);
            }
            router.back();
        } catch {
            Alert.alert(t.login.saveFailed, t.login.saveFailedMsg);
        }
    };

    const pickLocalFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['audio/x-mpegurl', 'application/vnd.apple.mpegurl', '*/*'],
                copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets?.length > 0) {
                setUrl(result.assets[0].uri);
                if (!name) setName(result.assets[0].name.replace(/\.[^/.]+$/, ''));
            }
        } catch (err) { console.error('File pick error:', err); }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <View style={[styles.root, { backgroundColor: bg }]}>
            <LinearGradient
                colors={isDark ? ['#1a0005', '#09090F', '#09090F'] : ['#fff0f0', '#F0F0F8', '#F0F0F8']}
                style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={styles.safe}>
                <TVColumn style={styles.column}>

                    {/* ── Header ───────────────────────────────────────────── */}
                    <View style={[
                        styles.header,
                        { paddingHorizontal: tv(16, TVSafe.paddingHorizontal) },
                        isRTL && styles.rowReverse,
                    ]}>
                        <TVPressable
                            onPress={() => router.back()}
                            style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                            focusVariant="control"
                            hasTVPreferredFocus={isTV}
                        >
                            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={tv(20, 26)} color={textColor} />
                        </TVPressable>

                        <View style={styles.headerCenter}>
                            <View style={[styles.iconBtn, { backgroundColor: `${Brand.primary}20` }]}>
                                <Ionicons
                                    name={isEditMode ? 'pencil-outline' : 'add-circle-outline'}
                                    size={tv(20, 26)}
                                    color={Brand.primary}
                                />
                            </View>
                            <Text style={[styles.headerTitle, { color: textColor, fontFamily: FontFamily.bold }]}>
                                {isEditMode
                                    ? (isRTL ? 'تعديل المزود' : 'Edit Provider')
                                    : t.login.addProviderTitle}
                            </Text>
                        </View>

                        {/* Spacer mirrors back button width */}
                        <View style={styles.iconBtn} />
                    </View>

                    {/* ── Body ─────────────────────────────────────────────────
                        - KeyboardAvoidingView معطل على TV (enabled={!isTV})
                          لأنه لا يعمل مع overlay keyboard على أي منصة TV.
                        - على TV: ScrollView + scrollToRef + TV_BOTTOM_PADDING
                          هو الحل الموثوق على جميع المنصات.
                        - TV_BOTTOM_PADDING (420) يضمن إن password (آخر field)
                          يقدر يتحرك لفوق الكيبورد حتى لو ارتفاعه 350px.
                    ──────────────────────────────────────────────────────────── */}
                    <KeyboardAvoidingView
                        style={styles.kavWrapper}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        enabled={!isTV}
                    >
                        <ScrollView
                            ref={scrollRef}
                            style={styles.scroll}
                            contentContainerStyle={[
                                styles.body,
                                { paddingHorizontal: tv(16, TVSafe.paddingHorizontal) },
                                { paddingBottom: isTV ? TV_BOTTOM_PADDING : MOBILE_BOTTOM_PADDING },
                            ]}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            scrollEnabled
                        >
                            {/* ── Card ──────────────────────────────────────── */}
                            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>

                                {/* Type Tabs */}
                                <TVRow style={[styles.tabs, isRTL && styles.rowReverse]}>
                                    {(['xtream', 'm3u', 'local'] as const).map(opt => (
                                        <TVPressable
                                            key={opt}
                                            style={[
                                                styles.tab,
                                                { borderColor, backgroundColor: type === opt ? Brand.primary : 'transparent' },
                                                type === opt && { borderWidth: 0 },
                                            ]}
                                            focusVariant="control"
                                            onPress={() => setType(opt)}
                                        >
                                            <Text style={[
                                                styles.tabText,
                                                { color: type === opt ? '#fff' : subColor, fontFamily: FontFamily.medium },
                                            ]}>
                                                {opt === 'xtream' ? 'Xtream' : opt === 'm3u' ? 'M3U Link' : 'Local File'}
                                            </Text>
                                        </TVPressable>
                                    ))}
                                </TVRow>

                                {/* Fields */}
                                <View style={styles.fields}>

                                    <Field
                                        ref={nameRef}
                                        {...fieldProps}
                                        icon="bookmark-outline"
                                        label={t.login.nameLabel}
                                        value={name}
                                        onChangeText={setName}
                                        placeholder={t.login.namePlaceholder}
                                        onSubmitEditing={() => urlRef.current?.focus()}
                                        onFocusScroll={() => scrollToRef(nameRef)}
                                    />

                                    {type === 'xtream' && (<>
                                        <Field
                                            ref={urlRef}
                                            {...fieldProps}
                                            icon="globe-outline"
                                            label={t.login.urlLabel}
                                            value={url}
                                            onChangeText={setUrl}
                                            placeholder={t.login.urlPlaceholder}
                                            keyboardType="url"
                                            onSubmitEditing={() => usernameRef.current?.focus()}
                                            onFocusScroll={() => scrollToRef(urlRef)}
                                        />
                                        <Field
                                            ref={usernameRef}
                                            {...fieldProps}
                                            icon="person-outline"
                                            label={t.login.usernameLabel}
                                            value={username}
                                            onChangeText={setUsername}
                                            placeholder={t.login.usernamePlaceholder}
                                            onSubmitEditing={() => passwordRef.current?.focus()}
                                            onFocusScroll={() => scrollToRef(usernameRef)}
                                        />
                                        {/*
                                            password هو آخر field —
                                            scrollToEnd أبسط وأضمن من measureLayout
                                            لأن TV_BOTTOM_PADDING يضمن وجود مساحة كافية
                                        */}
                                        <Field
                                            ref={passwordRef}
                                            {...fieldProps}
                                            icon="lock-closed-outline"
                                            label={t.login.passwordLabel}
                                            value={password}
                                            onChangeText={setPassword}
                                            placeholder={t.login.passwordPlaceholder}
                                            secure
                                            returnKeyType="done"
                                            onSubmitEditing={handleSave}
                                            onFocusScroll={() => scrollRef.current?.scrollToEnd({ animated: true })}
                                        />
                                    </>)}

                                    {type === 'm3u' && (
                                        // m3u URL هو آخر field أيضاً — نفس المعاملة
                                        <Field
                                            ref={urlRef}
                                            {...fieldProps}
                                            icon="link-outline"
                                            label="M3U URL"
                                            value={url}
                                            onChangeText={setUrl}
                                            placeholder="http://example.com/playlist.m3u"
                                            keyboardType="url"
                                            returnKeyType="done"
                                            onSubmitEditing={handleSave}
                                            onFocusScroll={() => scrollRef.current?.scrollToEnd({ animated: true })}
                                        />
                                    )}

                                    {type === 'local' && (
                                        <View style={styles.fieldWrap}>
                                            <Text style={[styles.fieldLabel, { color: textColor, textAlign, fontFamily: FontFamily.medium }]}>
                                                File
                                            </Text>
                                            <TVPressable
                                                style={[styles.filePicker, { backgroundColor: cardBg, borderColor }]}
                                                onPress={pickLocalFile}
                                            >
                                                <Ionicons name="folder-open-outline" size={tv(16, 20)} color={Brand.primary} />
                                                <Text
                                                    style={[styles.filePickerText, { color: inputColor, fontFamily: FontFamily.regular }]}
                                                    numberOfLines={1}
                                                >
                                                    {url ? url.split('/').pop() : 'Select M3U File...'}
                                                </Text>
                                            </TVPressable>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* ── Legal notice ──────────────────────────────── */}
                            {!legalLoading && (
                                <View style={[styles.legalNotice, {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                    borderColor,
                                }]}>
                                    <TVPressable
                                        onPress={async () => { if (!isAccepted) await accept(); }}
                                        focusVariant="control"
                                        hasTVPreferredFocus={isTV && !isAccepted}
                                        style={[styles.legalCheckPressable, isAccepted && { opacity: 0.9 }]}
                                    >
                                        <Ionicons
                                            name={isAccepted ? 'checkbox-outline' : 'square-outline'}
                                            size={tv(18, 22)}
                                            color={isAccepted ? Brand.primary : subColor}
                                        />
                                    </TVPressable>

                                    <Text style={[styles.legalNoticeText, { color: subColor, fontFamily: FontFamily.regular, textAlign }]}>
                                        {isRTL
                                            ? 'لا يمكن حفظ المزود إلا بعد قراءة والموافقة على الشروط (EULA/ToS/DMCA).'
                                            : 'You cannot save a provider until you read and agree to the terms (EULA/ToS/DMCA).'}
                                    </Text>

                                    <TVPressable
                                        onPress={() => router.push('/legal')}
                                        focusVariant="control"
                                        style={styles.legalBtn}
                                    >
                                        <Text style={[styles.legalBtnText, { color: Brand.primary, fontFamily: FontFamily.bold }]}>
                                            {isRTL ? 'عرض' : 'View'}
                                        </Text>
                                    </TVPressable>
                                </View>
                            )}

                            {/* ── Save Button ───────────────────────────────── */}
                            <TVPressable
                                style={[styles.saveBtn, (!isAccepted || legalLoading) && { opacity: 0.7 }]}
                                onPress={handleSave}
                            >
                                <LinearGradient
                                    colors={[Brand.primary, Brand.primaryDark]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <Ionicons
                                    name={isEditMode ? 'save-outline' : 'checkmark-circle-outline'}
                                    size={tv(18, 22)}
                                    color="#fff"
                                    style={{ marginRight: 8 }}
                                />
                                <Text style={[styles.saveBtnText, { fontFamily: FontFamily.extraBold }]}>
                                    {isEditMode ? (isRTL ? 'حفظ التغييرات' : 'Save Changes') : t.login.saveProvider}
                                </Text>
                            </TVPressable>

                        </ScrollView>
                    </KeyboardAvoidingView>

                </TVColumn>
            </SafeAreaView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ICON_BTN = tv(36, 46);

const styles = StyleSheet.create({
    root:       { flex: 1 },
    safe:       { flex: 1 },
    column:     { flex: 1 },
    rowReverse: { flexDirection: 'row-reverse' },
    kavWrapper: { flex: 1 },
    scroll:     { flex: 1 },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: tv(8, 16),
        paddingBottom: tv(8, 12),
        gap: 10,
    },
    iconBtn: {
        width: ICON_BTN,
        height: ICON_BTN,
        borderRadius: tv(10, 14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    headerTitle: { fontSize: tv(17, 24) },

    // ── Body (contentContainerStyle) ──────────────────────────────────────────
    // paddingBottom بيتحدد ديناميكياً في الـ JSX أعلاه حسب isTV
    body: {
        maxWidth: isTV ? 700 : undefined,
        alignSelf: isTV ? 'center' : undefined,
        width:     isTV ? '100%' : undefined,
    },

    // ── Card ──────────────────────────────────────────────────────────────────
    card: {
        borderRadius: tv(16, 22),
        borderWidth: 1,
        padding: tv(12, 20),
        marginBottom: tv(10, 14),
    },

    // ── Tabs ──────────────────────────────────────────────────────────────────
    tabs: { gap: 8, marginBottom: tv(10, 14) },
    tab: {
        flex: 1,
        paddingVertical: tv(8, 12),
        alignItems: 'center',
        borderRadius: tv(8, 12),
        borderWidth: 1,
    },
    tabText: { fontSize: tv(12, 16) },

    // ── Fields ────────────────────────────────────────────────────────────────
    fields:     { gap: tv(8, 12) },
    fieldWrap:  {},
    fieldLabel: { fontSize: tv(11, 15), marginBottom: tv(4, 6) },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: tv(10, 14),
        paddingHorizontal: tv(12, 16),
        height: tv(44, 56),
    },
    fieldIcon: { marginRight: 8 },
    fieldText: { flex: 1, fontSize: tv(13, 17) },

    // ── File picker ────────────────────────────────────────────────────────────
    filePicker: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tv(12, 16),
        height: tv(44, 56),
        borderRadius: tv(10, 14),
        borderWidth: 1,
        gap: 8,
    },
    filePickerText: { flex: 1, fontSize: tv(12, 16) },

    // ── Save button ───────────────────────────────────────────────────────────
    saveBtn: {
        flexDirection: 'row',
        height: tv(46, 58),
        borderRadius: tv(12, 16),
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: Brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    saveBtnText: { color: '#fff', fontSize: tv(14, 18) },

    // ── Legal notice ──────────────────────────────────────────────────────────
    legalNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: tv(12, 16),
        borderWidth: 1,
        paddingHorizontal: tv(12, 16),
        paddingVertical: tv(10, 12),
        marginBottom: tv(10, 12),
    },
    legalNoticeText: { flex: 1, fontSize: tv(11, 14), lineHeight: tv(16, 20) },
    legalCheckPressable: {
        width: tv(34, 46),
        height: tv(34, 46),
        borderRadius: tv(10, 14),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    legalBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: `${Brand.primary}14`,
    },
    legalBtnText: { fontSize: tv(11, 14) },
});