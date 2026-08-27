import { TVPressable } from '@/components/shared/TVPressable';
import { TVScrollView } from '@/components/tv/SpatialWrappers';
import { Brand, Colors, FontFamily, TVSafe, tv } from '@/constants/theme';
import { useLanguage } from '@/contexts/language-context';
import { useAppTheme } from '@/contexts/theme-context';
import { useLegalAcceptance } from '@/hooks/use-legal-acceptance';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const isTV = Platform.isTV;

type SectionKey = keyof ReturnType<typeof useLanguage>['t']['legal']['sections'];

const SECTION_ORDER: SectionKey[] = [
    'scopeAndAcceptance',
    'noContentProvided',
    'userProvidedContent',
    'userResponsibility',
    'noAffiliation',
    'prohibitedUses',
    'thirdPartyServices',
    'termination',
    'disclaimers',
    'limitationOfLiability',
    'indemnification',
    'dmcaNotice',
    'dmcaHowToSubmit',
    'governingLaw',
    'contact',
];

export default function LegalScreen() {
    const { isDark } = useAppTheme();
    const { isRTL, t } = useLanguage();
    const { isAccepted, accept } = useLegalAcceptance();

    const bg = isDark ? '#09090F' : '#F0F0F8';
    const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)';
    const borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
    const textC = isDark ? Colors.dark.text : Colors.light.text;
    const subC = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;

    const sections = useMemo(() => SECTION_ORDER.map((k) => t.legal.sections[k]), [t]);

    return (
        <View style={[styles.root, { backgroundColor: bg }]}>
            <LinearGradient
                colors={isDark ? ['#1a0005', '#09090F', '#09090F'] : ['#fff0f0', '#F0F0F8', '#F0F0F8']}
                style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={styles.safe}>
                {/* Header */}
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
                        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={tv(20, 26)} color={textC} />
                    </TVPressable>

                    <View style={styles.headerCenter}>
                        <View style={[styles.headerPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor }]}>
                            <View style={[styles.docIcon, { backgroundColor: `${Brand.primary}22` }]}>
                                <Ionicons name="document-text-outline" size={tv(16, 20)} color={Brand.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.title, { color: textC, fontFamily: FontFamily.black }]}>
                                    {t.legal.title}
                                </Text>
                                <Text style={[styles.subTitle, { color: subC, fontFamily: FontFamily.regular }]}>
                                    {t.legal.lastUpdatedLabel}: {t.legal.lastUpdatedDate}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.iconBtn} />
                </View>

                <View style={styles.body}>
                    <TVScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={[
                            styles.scroll,
                            { paddingHorizontal: tv(16, TVSafe.paddingHorizontal), paddingBottom: 24 },
                        ]}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Hero / Titles */}
                        <View style={[styles.hero, { borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)' }]}>
                            <LinearGradient
                                colors={isDark ? ['rgba(229,9,20,0.18)', 'transparent'] : ['rgba(229,9,20,0.10)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0.7 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={[styles.heroTop, isRTL && styles.rowReverse]}>
                                <View style={[styles.heroBadge, { backgroundColor: `${Brand.primary}22` }]}>
                                    <Ionicons name="shield-checkmark-outline" size={tv(16, 20)} color={Brand.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.heroTitle, { color: textC, fontFamily: FontFamily.black, textAlign: isRTL ? 'right' : 'left' }]}>
                                        {t.legal.eulaTitle}
                                    </Text>
                                    <Text style={[styles.heroTitle, { color: textC, fontFamily: FontFamily.black, textAlign: isRTL ? 'right' : 'left' }]}>
                                        {t.legal.tosTitle}
                                    </Text>
                                    <Text style={[styles.heroTitle, { color: textC, fontFamily: FontFamily.black, textAlign: isRTL ? 'right' : 'left' }]}>
                                        {t.legal.dmcaTitle}
                                    </Text>
                                </View>
                            </View>
                            <Text style={[styles.heroHint, { color: subC, fontFamily: FontFamily.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                                {isRTL
                                    ? 'يرجى قراءة الأقسام التالية بعناية. يمكنك الضغط على زر الموافقة في الأسفل في أي وقت.'
                                    : 'Please review the sections below. You can accept using the button at the bottom at any time.'}
                            </Text>
                        </View>

                        {/* Sections */}
                        {sections.map((sec, i) => (
                            <View key={i} style={[styles.sectionCard, { backgroundColor: cardBg, borderColor }]}>
                                <View style={[styles.sectionHeaderRow, isRTL && styles.rowReverse]}>
                                    <View style={[styles.sectionIndexPill, { backgroundColor: `${Brand.primary}18` }]}>
                                        <Text style={[styles.sectionIndex, { color: Brand.primary, fontFamily: FontFamily.black }]}>
                                            {String(i + 1).padStart(2, '0')}
                                        </Text>
                                    </View>
                                    <Text
                                        style={[
                                            styles.sectionHeading,
                                            {
                                                color: textC,
                                                fontFamily: FontFamily.bold,
                                                textAlign: isRTL ? 'right' : 'left',
                                                writingDirection: isRTL ? 'rtl' : 'ltr',
                                                flex: 1,
                                            },
                                        ]}
                                    >
                                        {sec.heading}
                                    </Text>
                                </View>
                                <View style={[styles.sectionAccent, { backgroundColor: `${Brand.primary}35` }]} />
                                {sec.body.map((p, idx) => (
                                    <View key={idx} style={[styles.paragraphRow, isRTL && styles.rowReverse]}>
                                        <View style={[styles.bulletDot, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)' }]} />
                                        <Text
                                            style={[
                                                styles.paragraph,
                                                {
                                                    color: subC,
                                                    fontFamily: FontFamily.regular,
                                                    textAlign: isRTL ? 'right' : 'left',
                                                    writingDirection: isRTL ? 'rtl' : 'ltr',
                                                    flex: 1,
                                                },
                                            ]}
                                        >
                                            {p}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </TVScrollView>

                    {/* Sticky Accept button (always reachable on TV) */}
                    <View style={[styles.acceptBar, { paddingHorizontal: tv(16, TVSafe.paddingHorizontal) }]}>
                        <TVPressable
                            onPress={async () => {
                                await accept();
                                router.back();
                            }}
                            style={[styles.acceptBtn, isAccepted && { opacity: 0.85 }]}
                            focusVariant="card"
                            hasTVPreferredFocus={isTV}
                        >
                            <LinearGradient
                                colors={[Brand.primary, Brand.primaryDark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <Ionicons name={isAccepted ? 'checkmark-circle' : 'checkmark-circle-outline'} size={tv(18, 22)} color="#fff" />
                            <Text style={[styles.acceptText, { fontFamily: FontFamily.extraBold }]}>
                                {isRTL ? 'أوافق' : 'I Agree'}
                            </Text>
                        </TVPressable>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    safe: { flex: 1 },
    body: { flex: 1 },
    rowReverse: { flexDirection: 'row-reverse' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: tv(8, 16),
        paddingBottom: tv(8, 12),
        gap: 10,
    },
    iconBtn: {
        width: tv(36, 46),
        height: tv(36, 46),
        borderRadius: tv(10, 14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    headerPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: tv(14, 18),
        borderWidth: 1,
        paddingHorizontal: tv(12, 16),
        paddingVertical: tv(8, 10),
        maxWidth: isTV ? 760 : undefined,
    },
    docIcon: {
        width: tv(34, 42),
        height: tv(34, 42),
        borderRadius: tv(12, 14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: { fontSize: tv(15, 20) },
    subTitle: { fontSize: tv(10, 13), marginTop: 2, opacity: 0.9 },
    scroll: {
        paddingTop: 6,
        paddingBottom: 24,
    },

    // Hero
    hero: {
        borderRadius: tv(16, 22),
        borderWidth: 1,
        padding: tv(14, 22),
        marginBottom: 12,
        overflow: 'hidden',
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroBadge: {
        width: tv(44, 56),
        height: tv(44, 56),
        borderRadius: tv(16, 18),
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroTitle: { fontSize: tv(14, 18), lineHeight: tv(18, 24) },
    heroHint: { marginTop: 10, fontSize: tv(11, 14), lineHeight: tv(16, 20), opacity: 0.95 },

    // Section cards
    sectionCard: {
        borderRadius: tv(16, 22),
        borderWidth: 1,
        padding: tv(12, 20),
        marginBottom: 12,
    },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionIndexPill: {
        minWidth: tv(36, 48),
        height: tv(28, 34),
        paddingHorizontal: 10,
        borderRadius: tv(12, 14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionIndex: { fontSize: tv(11, 14), letterSpacing: 0.6 },
    sectionHeading: { fontSize: tv(12, 16) },
    sectionAccent: {
        height: 1,
        marginTop: 10,
        marginBottom: 10,
        borderRadius: 1,
    },
    paragraphRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
    bulletDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 7,
    },
    paragraph: { fontSize: tv(11, 14), lineHeight: tv(16, 22), opacity: 0.96 },

    acceptBar: {
        paddingTop: 10,
        paddingBottom: 14,
    },
    acceptBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: tv(46, 58),
        borderRadius: tv(12, 16),
        overflow: 'hidden',
    },
    acceptText: { color: '#fff', fontSize: tv(14, 18) },
});

