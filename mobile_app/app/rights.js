/**
 * LawGPT Mobile - Your Rights Screen
 * Matches web Rights.jsx with three tabs: Fundamental Rights, Quick Guides, IPC Sections
 */

import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { ms } from '../constants/responsive';

/* ── Data ──────────────────────────────────────────── */

const FUNDAMENTAL_RIGHTS = [
    {
        article: 'Article 14',
        title: 'Right to Equality',
        summary: 'Equality before law and equal protection of laws within the territory of India.',
        icon: 'scale-balance',
        iconLib: 'mci',
    },
    {
        article: 'Article 19',
        title: 'Right to Freedom',
        summary: 'Freedom of speech, assembly, association, movement, residence, and profession.',
        icon: 'globe',
        iconLib: 'feather',
    },
    {
        article: 'Article 21',
        title: 'Right to Life & Liberty',
        summary: 'No person shall be deprived of life or personal liberty except according to procedure established by law.',
        icon: 'heart',
        iconLib: 'feather',
    },
    {
        article: 'Article 22',
        title: 'Protection against Arrest',
        summary: 'Right to be informed of grounds of arrest, right to consult a lawyer, and to be produced before a magistrate within 24 hours.',
        icon: 'shield',
        iconLib: 'feather',
    },
    {
        article: 'Article 23',
        title: 'Prohibition of Trafficking',
        summary: 'Traffic in human beings and forced labour are prohibited.',
        icon: 'lock',
        iconLib: 'feather',
    },
    {
        article: 'Article 25',
        title: 'Freedom of Religion',
        summary: 'Freedom of conscience and free profession, practice, and propagation of religion.',
        icon: 'users',
        iconLib: 'feather',
    },
];

const QUICK_GUIDES = [
    {
        title: 'If You Are Arrested',
        icon: 'shield',
        points: [
            'You have the right to know the reason for arrest',
            'You have the right to a lawyer',
            'You must be presented before a magistrate within 24 hours',
            'You cannot be tortured or coerced into confession',
            'You can apply for bail',
        ],
    },
    {
        title: 'Workplace Rights',
        icon: 'briefcase',
        points: [
            'Right to minimum wages',
            'Right to equal pay for equal work',
            'Protection against sexual harassment',
            'Right to safe working conditions',
            'Right to form trade unions',
        ],
    },
    {
        title: 'Consumer Rights',
        icon: 'home',
        points: [
            'Right to safety from harmful products',
            'Right to be informed about quality & price',
            'Right to choose from a variety of products',
            'Right to be heard in case of grievances',
            'Right to seek redressal against unfair trade',
        ],
    },
    {
        title: "Women's Rights",
        icon: 'heart',
        points: [
            'Protection of Women from Domestic Violence Act',
            'Dowry Prohibition Act',
            'Equal Remuneration Act',
            'Maternity Benefit Act',
            'Sexual Harassment of Women at Workplace Act',
        ],
    },
];

const IPC_SECTIONS = [
    { section: 'Section 302', title: 'Punishment for Murder', category: 'Criminal' },
    { section: 'Section 376', title: 'Punishment for Rape', category: 'Criminal' },
    { section: 'Section 420', title: 'Cheating & Dishonesty', category: 'Criminal' },
    { section: 'Section 498A', title: 'Cruelty by Husband / Relatives', category: 'Family' },
    { section: 'Section 304B', title: 'Dowry Death', category: 'Criminal' },
    { section: 'Section 354', title: 'Assault on Woman', category: 'Criminal' },
    { section: 'Section 506', title: 'Criminal Intimidation', category: 'Criminal' },
    { section: 'Section 379', title: 'Punishment for Theft', category: 'Property' },
    { section: 'Section 406', title: 'Criminal Breach of Trust', category: 'Property' },
    { section: 'Section 509', title: 'Insult to Modesty of Woman', category: 'Criminal' },
];

const TABS = [
    { id: 'rights', label: 'Rights', icon: 'scale-balance', iconLib: 'mci' },
    { id: 'guides', label: 'Guides', icon: 'book-open', iconLib: 'feather' },
    { id: 'ipc', label: 'IPC', icon: 'file-text', iconLib: 'feather' },
];

/* ── Component ─────────────────────────────────────── */

export default function RightsScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState('rights');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredIPC = IPC_SECTIONS.filter(
        (s) =>
            s.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const openDrawer = () => navigation.openDrawer();

    const askAI = (topic) => {
        router.push(`/chat?query=${encodeURIComponent(`Tell me about ${topic}`)}`);
    };

    const renderIcon = (name, lib, size, color) => {
        if (lib === 'mci') return <MaterialCommunityIcons name={name} size={size} color={color} />;
        return <Feather name={name} size={size} color={color} />;
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable style={styles.menuBtn} onPress={openDrawer}>
                    <Feather name="menu" size={24} color="white" />
                </Pressable>
                <View style={styles.headerCenter}>
                    <Feather name="shield" size={20} color="white" />
                    <Text style={styles.headerTitle}>Your Legal Rights</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {TABS.map(({ id, label, icon, iconLib }) => (
                    <Pressable
                        key={id}
                        style={[styles.tab, activeTab === id && styles.tabActive]}
                        onPress={() => setActiveTab(id)}
                    >
                        {renderIcon(icon, iconLib, 16, activeTab === id ? COLORS.primary : COLORS.textMuted)}
                        <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>
                            {label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Fundamental Rights ── */}
                {activeTab === 'rights' && (
                    <View style={styles.section}>
                        {FUNDAMENTAL_RIGHTS.map(({ article, title, summary, icon, iconLib }) => (
                            <View key={article} style={styles.rightCard}>
                                <View style={styles.rightCardHeader}>
                                    <View style={styles.rightIconWrap}>
                                        {renderIcon(icon, iconLib, 20, COLORS.primary)}
                                    </View>
                                    <View style={styles.rightCardInfo}>
                                        <Text style={styles.rightArticle}>{article}</Text>
                                        <Text style={styles.rightTitle}>{title}</Text>
                                    </View>
                                </View>
                                <Text style={styles.rightSummary}>{summary}</Text>
                                <Pressable style={styles.askBtn} onPress={() => askAI(title)}>
                                    <Feather name="message-circle" size={14} color={COLORS.primary} />
                                    <Text style={styles.askBtnText}>Ask AI about this</Text>
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Quick Guides ── */}
                {activeTab === 'guides' && (
                    <View style={styles.section}>
                        {QUICK_GUIDES.map(({ title, icon, points }) => (
                            <View key={title} style={styles.guideCard}>
                                <View style={styles.guideHeader}>
                                    <Feather name={icon} size={20} color={COLORS.primary} />
                                    <Text style={styles.guideTitle}>{title}</Text>
                                </View>
                                <View style={styles.guidePoints}>
                                    {points.map((point, i) => (
                                        <View key={i} style={styles.guidePoint}>
                                            <Feather name="chevron-right" size={14} color={COLORS.primary} />
                                            <Text style={styles.guidePointText}>{point}</Text>
                                        </View>
                                    ))}
                                </View>
                                <Pressable style={styles.askBtn} onPress={() => askAI(title)}>
                                    <Feather name="message-circle" size={14} color={COLORS.primary} />
                                    <Text style={styles.askBtnText}>Ask AI for more details</Text>
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── IPC Sections ── */}
                {activeTab === 'ipc' && (
                    <View style={styles.section}>
                        {/* Search */}
                        <View style={styles.searchBar}>
                            <Feather name="search" size={18} color={COLORS.textMuted} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search IPC sections…"
                                placeholderTextColor={COLORS.textMuted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        {filteredIPC.map(({ section, title, category }) => (
                            <View key={section} style={styles.ipcItem}>
                                <View style={styles.ipcInfo}>
                                    <Text style={styles.ipcSection}>{section}</Text>
                                    <Text style={styles.ipcTitle}>{title}</Text>
                                    <View style={styles.ipcCategoryBadge}>
                                        <Text style={styles.ipcCategoryText}>{category}</Text>
                                    </View>
                                </View>
                                <Pressable style={styles.ipcAskBtn} onPress={() => askAI(`${section} - ${title}`)}>
                                    <Feather name="message-circle" size={14} color={COLORS.primary} />
                                    <Text style={styles.ipcAskText}>Ask AI</Text>
                                </Pressable>
                            </View>
                        ))}

                        {filteredIPC.length === 0 && (
                            <View style={styles.emptyState}>
                                <Feather name="alert-triangle" size={24} color={COLORS.textMuted} />
                                <Text style={styles.emptyText}>
                                    No sections found matching "{searchQuery}"
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Disclaimer CTA */}
                <View style={styles.disclaimerCta}>
                    <Feather name="alert-triangle" size={18} color={COLORS.accentOrange} />
                    <Text style={styles.disclaimerText}>
                        This information is for educational purposes only. For specific legal advice, consult a qualified lawyer.
                    </Text>
                    <Pressable style={styles.disclaimerBtn} onPress={() => router.push('/chat')}>
                        <Feather name="message-circle" size={14} color="white" />
                        <Text style={styles.disclaimerBtnText}>Chat with Legal AI</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.lightBg,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
        backgroundColor: COLORS.darkSurface,
    },
    menuBtn: {
        padding: SPACING.sm,
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Inter_600SemiBold',
        color: 'white',
    },

    // Tabs
    tabBar: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderColor,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        paddingVertical: 14,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        color: COLORS.textMuted,
    },
    tabTextActive: {
        color: COLORS.primary,
        fontFamily: 'Inter_600SemiBold',
    },

    scrollView: { flex: 1 },
    scrollContent: { padding: SPACING.lg },

    section: { gap: SPACING.md },

    // Right Card
    rightCard: {
        backgroundColor: 'white',
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        ...SHADOWS.card,
    },
    rightCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.sm,
    },
    rightIconWrap: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primaryTransparent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightCardInfo: { flex: 1 },
    rightArticle: {
        fontSize: 12,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    rightTitle: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
        marginTop: 2,
    },
    rightSummary: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        lineHeight: 22,
        marginBottom: SPACING.md,
    },
    askBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        paddingVertical: 10,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primaryTransparent,
    },
    askBtnText: {
        fontSize: 13,
        fontFamily: 'Inter_500Medium',
        color: COLORS.primary,
    },

    // Guide Card
    guideCard: {
        backgroundColor: 'white',
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        ...SHADOWS.card,
    },
    guideHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    guideTitle: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
    },
    guidePoints: { gap: SPACING.sm, marginBottom: SPACING.md },
    guidePoint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
    },
    guidePointText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
        lineHeight: 20,
    },

    // IPC Search
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: 'white',
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.borderColor,
        marginBottom: SPACING.md,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
        paddingVertical: 4,
    },

    // IPC Item
    ipcItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        ...SHADOWS.sm,
    },
    ipcInfo: { flex: 1 },
    ipcSection: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
    },
    ipcTitle: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        marginTop: 2,
    },
    ipcCategoryBadge: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.primaryTransparent,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
        marginTop: 4,
    },
    ipcCategoryText: {
        fontSize: 11,
        fontFamily: 'Inter_500Medium',
        color: COLORS.primary,
    },
    ipcAskBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primaryTransparent,
    },
    ipcAskText: {
        fontSize: 12,
        fontFamily: 'Inter_500Medium',
        color: COLORS.primary,
    },

    // Empty
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING.xxl,
        gap: SPACING.sm,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        textAlign: 'center',
    },

    // Disclaimer CTA
    disclaimerCta: {
        marginTop: SPACING.xl,
        backgroundColor: `${COLORS.accentOrange}10`,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: `${COLORS.accentOrange}30`,
        alignItems: 'center',
        gap: SPACING.sm,
    },
    disclaimerText: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
        textAlign: 'center',
        lineHeight: 20,
    },
    disclaimerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.lg,
        paddingVertical: 10,
        borderRadius: RADIUS.md,
        marginTop: SPACING.xs,
    },
    disclaimerBtnText: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        color: 'white',
    },
});
