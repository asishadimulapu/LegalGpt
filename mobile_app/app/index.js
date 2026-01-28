/**
 * NyayaSahay Mobile - Landing Screen
 * Professional swipeable pages layout
 */

import { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Pressable,
    FlatList,
    Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
    Ionicons,
    MaterialCommunityIcons,
    Feather,
} from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Page data
const PAGES = [
    {
        id: 'hero',
        type: 'hero',
        title: 'Get Instant',
        titleHighlight: 'Legal Guidance',
        description: 'Our AI understands your situation in plain language and provides accurate legal information based on Indian law.',
        features: [
            'Trained on IPC, CrPC & case precedents',
            'Explains complex sections simply',
            'Available 24/7 with instant responses',
        ],
    },
    {
        id: 'features',
        type: 'features',
        badge: 'Features',
        title: 'Everything You Need',
        titleHighlight: 'for Legal Awareness',
        items: [
            { icon: 'file-text', title: 'Section Verification', desc: 'Verify if IPC/CrPC sections apply to you', color: COLORS.accentOrange },
            { icon: 'shield', title: 'Know Your Rights', desc: 'Rights during detention, FIR, arrest', color: COLORS.accentGreen },
            { icon: 'book-open', title: 'Legal Knowledge', desc: 'Simplified legal explanations', color: COLORS.accentBlue },
            { icon: 'search', title: 'Case Analysis', desc: 'AI-powered case law analysis', color: COLORS.accentPurple },
        ],
    },
    {
        id: 'how-it-works',
        type: 'steps',
        badge: 'How It Works',
        title: 'Legal Help in',
        titleHighlight: '4 Simple Steps',
        items: [
            { num: '01', icon: 'message-square', title: 'Describe Your Situation', desc: 'Tell us in simple words' },
            { num: '02', icon: 'cpu', title: 'AI Analyzes', desc: 'Searches IPC, CrPC, precedents' },
            { num: '03', icon: 'file-text', title: 'Get Insights', desc: 'Clear explanations & rights' },
            { num: '04', icon: 'check-circle', title: 'Take Action', desc: 'Make informed decisions' },
        ],
    },
    {
        id: 'rights',
        type: 'rights',
        badge: 'Your Rights',
        title: 'Fundamental Rights',
        titleHighlight: 'During Police Interactions',
        items: [
            { icon: 'alert-triangle', title: 'Right to Know Charges', article: 'Article 22(1)' },
            { icon: 'phone', title: 'Right to Legal Counsel', article: 'Article 22(1)' },
            { icon: 'users', title: 'Right to Inform Family', article: 'Section 50A CrPC' },
            { icon: 'clock', title: '24-Hour Magistrate Rule', article: 'Article 22(2)' },
        ],
    },
    {
        id: 'cta',
        type: 'cta',
        title: 'Ready to Know Your',
        titleHighlight: 'Rights?',
        description: 'Start your free legal consultation now.\nNo registration required.',
    },
];

export default function LandingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(0);

    const handleStartChat = () => {
        router.push('/chat');
    };

    const handleAuth = () => {
        router.push('/auth');
    };

    const handleNext = () => {
        if (currentPage < PAGES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentPage + 1, animated: true });
        }
    };

    const handleSkip = () => {
        router.push('/chat');
    };

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setCurrentPage(viewableItems[0].index);
        }
    }).current;

    const renderPage = ({ item, index }) => {
        switch (item.type) {
            case 'hero':
                return (
                    <View style={[styles.page, styles.heroPage]}>
                        <View style={styles.heroBadge}>
                            <Ionicons name="sparkles" size={14} color={COLORS.primary} />
                            <Text style={styles.heroBadgeText}>AI-Powered Legal Assistant</Text>
                        </View>
                        <Text style={styles.heroTitle}>
                            {item.title}{'\n'}
                            <Text style={styles.gradientText}>{item.titleHighlight}</Text>
                        </Text>
                        <Text style={styles.heroDescription}>{item.description}</Text>
                        <View style={styles.heroFeatures}>
                            {item.features.map((f, i) => (
                                <View key={i} style={styles.heroFeatureItem}>
                                    <Feather name="check-circle" size={18} color={COLORS.accentGreen} />
                                    <Text style={styles.heroFeatureText}>{f}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                );

            case 'features':
                return (
                    <View style={[styles.page, styles.featuresPage]}>
                        <View style={styles.pageBadge}>
                            <Text style={styles.pageBadgeText}>{item.badge}</Text>
                        </View>
                        <Text style={styles.pageTitle}>
                            {item.title}{'\n'}
                            <Text style={styles.gradientText}>{item.titleHighlight}</Text>
                        </Text>
                        <View style={styles.featuresGrid}>
                            {item.items.map((f, i) => (
                                <View key={i} style={styles.featureCard}>
                                    <View style={[styles.featureIcon, { backgroundColor: `${f.color}20` }]}>
                                        <Feather name={f.icon} size={22} color={f.color} />
                                    </View>
                                    <Text style={styles.featureTitle}>{f.title}</Text>
                                    <Text style={styles.featureDesc}>{f.desc}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                );

            case 'steps':
                return (
                    <View style={[styles.page, styles.stepsPage]}>
                        <View style={styles.pageBadge}>
                            <Text style={styles.pageBadgeText}>{item.badge}</Text>
                        </View>
                        <Text style={[styles.pageTitle, { color: 'white' }]}>
                            {item.title}{' '}
                            <Text style={styles.gradientText}>{item.titleHighlight}</Text>
                        </Text>
                        <View style={styles.stepsContainer}>
                            {item.items.map((s, i) => (
                                <View key={i} style={styles.stepCard}>
                                    <View style={styles.stepLeft}>
                                        <Feather name={s.icon} size={24} color={COLORS.primary} />
                                    </View>
                                    <View style={styles.stepContent}>
                                        <Text style={styles.stepTitle}>{s.title}</Text>
                                        <Text style={styles.stepDesc}>{s.desc}</Text>
                                    </View>
                                    <View style={styles.stepNum}>
                                        <Text style={styles.stepNumText}>{s.num}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                );

            case 'rights':
                return (
                    <View style={[styles.page, styles.rightsPage]}>
                        <View style={[styles.pageBadge, { backgroundColor: `${COLORS.accentOrange}20` }]}>
                            <Text style={[styles.pageBadgeText, { color: COLORS.accentOrange }]}>{item.badge}</Text>
                        </View>
                        <Text style={styles.pageTitle}>
                            {item.title}{'\n'}
                            <Text style={styles.gradientText}>{item.titleHighlight}</Text>
                        </Text>
                        <View style={styles.rightsGrid}>
                            {item.items.map((r, i) => (
                                <View key={i} style={styles.rightCard}>
                                    <View style={styles.rightIconContainer}>
                                        <Feather name={r.icon} size={20} color={COLORS.accentOrange} />
                                    </View>
                                    <View style={styles.rightContent}>
                                        <Text style={styles.rightTitle}>{r.title}</Text>
                                        <Text style={styles.rightArticle}>{r.article}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                );

            case 'cta':
                return (
                    <View style={[styles.page, styles.ctaPage]}>
                        <View style={styles.ctaIcon}>
                            <MaterialCommunityIcons name="scale-balance" size={60} color="white" />
                        </View>
                        <Text style={styles.ctaTitle}>
                            {item.title}{'\n'}
                            <Text style={styles.gradientText}>{item.titleHighlight}</Text>
                        </Text>
                        <Text style={styles.ctaDescription}>{item.description}</Text>
                        <Pressable style={styles.ctaBtn} onPress={handleStartChat}>
                            <Ionicons name="rocket" size={20} color="white" />
                            <Text style={styles.ctaBtnText}>Start Free Consultation</Text>
                            <Feather name="arrow-right" size={18} color="white" />
                        </Pressable>
                        <Pressable style={styles.ctaSecondaryBtn} onPress={handleAuth}>
                            <Text style={styles.ctaSecondaryBtnText}>Create Account</Text>
                        </Pressable>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <FlatList
                ref={flatListRef}
                data={PAGES}
                renderItem={renderPage}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
                getItemLayout={(_, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                })}
            />

            {/* Navigation Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
                {/* Dots */}
                <View style={styles.dots}>
                    {PAGES.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                currentPage === i && styles.dotActive,
                            ]}
                        />
                    ))}
                </View>

                {/* Buttons */}
                <View style={styles.footerButtons}>
                    {currentPage < PAGES.length - 1 ? (
                        <>
                            <Pressable style={styles.skipBtn} onPress={handleSkip}>
                                <Text style={styles.skipBtnText}>Skip</Text>
                            </Pressable>
                            <Pressable style={styles.nextBtn} onPress={handleNext}>
                                <Text style={styles.nextBtnText}>Next</Text>
                                <Feather name="arrow-right" size={18} color="white" />
                            </Pressable>
                        </>
                    ) : (
                        <Pressable style={[styles.nextBtn, styles.fullWidthBtn]} onPress={handleStartChat}>
                            <Text style={styles.nextBtnText}>Get Started</Text>
                            <Feather name="arrow-right" size={18} color="white" />
                        </Pressable>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.darkSurface,
    },
    page: {
        width: SCREEN_WIDTH,
        paddingHorizontal: SPACING.lg,
        justifyContent: 'center',
    },

    // Hero Page
    heroPage: {
        backgroundColor: COLORS.darkSurface,
        paddingTop: 80,
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        backgroundColor: COLORS.primaryTransparent,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: RADIUS.full,
        marginBottom: SPACING.lg,
    },
    heroBadgeText: {
        color: COLORS.primary,
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
    },
    heroTitle: {
        fontSize: 38,
        fontFamily: 'Inter_700Bold',
        color: COLORS.textWhite,
        lineHeight: 46,
        marginBottom: SPACING.md,
    },
    gradientText: {
        color: COLORS.primary,
    },
    heroDescription: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textLight,
        lineHeight: 24,
        marginBottom: SPACING.xl,
    },
    heroFeatures: {
        gap: SPACING.md,
    },
    heroFeatureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    heroFeatureText: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textLight,
    },

    // Features Page
    featuresPage: {
        backgroundColor: COLORS.lightBg,
        paddingTop: 60,
    },
    pageBadge: {
        alignSelf: 'center',
        backgroundColor: COLORS.primaryTransparent,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
        marginBottom: SPACING.md,
    },
    pageBadgeText: {
        color: COLORS.primary,
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
    },
    pageTitle: {
        fontSize: 28,
        fontFamily: 'Inter_700Bold',
        color: COLORS.textDark,
        textAlign: 'center',
        lineHeight: 36,
        marginBottom: SPACING.xl,
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
        justifyContent: 'center',
    },
    featureCard: {
        width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md) / 2,
        backgroundColor: 'white',
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        ...SHADOWS.card,
    },
    featureIcon: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    featureTitle: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
        marginBottom: 2,
    },
    featureDesc: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        lineHeight: 16,
    },

    // Steps Page
    stepsPage: {
        backgroundColor: COLORS.darkSurface,
        paddingTop: 60,
    },
    stepsContainer: {
        gap: SPACING.md,
    },
    stepCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.darkCard,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        gap: SPACING.md,
    },
    stepLeft: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primaryTransparent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 15,
        fontFamily: 'Inter_600SemiBold',
        color: 'white',
        marginBottom: 2,
    },
    stepDesc: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textLight,
    },
    stepNum: {
        backgroundColor: COLORS.primaryTransparent,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    stepNumText: {
        fontSize: 13,
        fontFamily: 'Inter_700Bold',
        color: COLORS.primary,
    },

    // Rights Page
    rightsPage: {
        backgroundColor: COLORS.lightBg,
        paddingTop: 60,
    },
    rightsGrid: {
        gap: SPACING.md,
    },
    rightCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        gap: SPACING.md,
        ...SHADOWS.card,
    },
    rightIconContainer: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        backgroundColor: `${COLORS.accentOrange}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightContent: {
        flex: 1,
    },
    rightTitle: {
        fontSize: 15,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
    },
    rightArticle: {
        fontSize: 12,
        fontFamily: 'Inter_500Medium',
        color: COLORS.primary,
        marginTop: 2,
    },

    // CTA Page
    ctaPage: {
        backgroundColor: COLORS.darkSurface,
        alignItems: 'center',
        paddingTop: 60,
    },
    ctaIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
        ...SHADOWS.glow,
    },
    ctaTitle: {
        fontSize: 32,
        fontFamily: 'Inter_700Bold',
        color: 'white',
        textAlign: 'center',
        lineHeight: 40,
        marginBottom: SPACING.md,
    },
    ctaDescription: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textLight,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: SPACING.xl,
    },
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        paddingHorizontal: 28,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.md,
        ...SHADOWS.glow,
    },
    ctaBtnText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
    },
    ctaSecondaryBtn: {
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: RADIUS.md,
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    ctaSecondaryBtnText: {
        color: COLORS.primary,
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
        backgroundColor: 'rgba(26, 31, 46, 0.95)',
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.textMuted,
    },
    dotActive: {
        width: 24,
        backgroundColor: COLORS.primary,
    },
    footerButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: SPACING.md,
    },
    skipBtn: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.textMuted,
    },
    skipBtnText: {
        color: COLORS.textLight,
        fontSize: 16,
        fontFamily: 'Inter_500Medium',
    },
    nextBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: RADIUS.md,
    },
    nextBtnText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
    },
    fullWidthBtn: {
        flex: 2,
    },
});
