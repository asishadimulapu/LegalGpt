/**
 * NyayaSahay Mobile - Landing Screen
 * Professional swipeable pages layout with responsive design
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
    useWindowDimensions,
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
import { wp, hp, ms, screenSize } from '../constants/responsive';

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
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

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
        const pageStyle = { width: screenWidth, paddingHorizontal: ms(16), justifyContent: 'center' };

        switch (item.type) {
            case 'hero':
                return (
                    <View style={[pageStyle, styles.heroPage]}>
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
                    <View style={[pageStyle, styles.featuresPage]}>
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
                    <View style={[pageStyle, styles.stepsPage]}>
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
                    <View style={[pageStyle, styles.rightsPage]}>
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
                    <View style={[pageStyle, styles.ctaPage]}>
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
                    length: screenWidth,
                    offset: screenWidth * index,
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
    // Note: page width is now set dynamically via pageStyle in renderPage

    // Hero Page
    heroPage: {
        backgroundColor: COLORS.darkSurface,
        paddingTop: ms(60),
        alignItems: 'flex-start',
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: ms(6),
        backgroundColor: COLORS.primaryTransparent,
        paddingHorizontal: ms(12),
        paddingVertical: ms(6),
        borderRadius: RADIUS.full,
        marginBottom: ms(16),
    },
    heroBadgeText: {
        color: COLORS.primary,
        fontSize: ms(12),
        fontFamily: 'Inter_600SemiBold',
    },
    heroTitle: {
        fontSize: ms(28),
        fontFamily: 'Inter_700Bold',
        color: COLORS.textWhite,
        lineHeight: ms(36),
        marginBottom: ms(12),
        width: '100%',
    },
    gradientText: {
        color: COLORS.primary,
    },
    heroDescription: {
        fontSize: ms(14),
        fontFamily: 'Inter_400Regular',
        color: COLORS.textLight,
        lineHeight: ms(22),
        marginBottom: ms(24),
    },
    heroFeatures: {
        gap: ms(12),
        width: '100%',
    },
    heroFeatureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: ms(8),
    },
    heroFeatureText: {
        fontSize: ms(13),
        fontFamily: 'Inter_400Regular',
        color: COLORS.textLight,
    },

    // Features Page
    featuresPage: {
        backgroundColor: COLORS.lightBg,
        paddingTop: ms(50),
    },
    pageBadge: {
        alignSelf: 'center',
        backgroundColor: COLORS.primaryTransparent,
        paddingHorizontal: ms(12),
        paddingVertical: ms(5),
        borderRadius: RADIUS.full,
        marginBottom: ms(12),
    },
    pageBadgeText: {
        color: COLORS.primary,
        fontSize: ms(12),
        fontFamily: 'Inter_600SemiBold',
    },
    pageTitle: {
        fontSize: ms(22),
        fontFamily: 'Inter_700Bold',
        color: COLORS.textDark,
        textAlign: 'center',
        lineHeight: ms(30),
        marginBottom: ms(20),
        width: '100%',
        paddingHorizontal: ms(8),
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: ms(12),
        justifyContent: 'center',
        width: '100%',
    },
    featureCard: {
        width: wp(43),
        backgroundColor: 'white',
        borderRadius: RADIUS.lg,
        padding: ms(14),
        ...SHADOWS.card,
    },
    featureIcon: {
        width: ms(40),
        height: ms(40),
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: ms(8),
    },
    featureTitle: {
        fontSize: ms(13),
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
        marginBottom: 2,
    },
    featureDesc: {
        fontSize: ms(11),
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        lineHeight: ms(15),
    },

    // Steps Page
    stepsPage: {
        backgroundColor: COLORS.darkSurface,
        paddingTop: ms(50),
    },
    stepsContainer: {
        gap: ms(12),
        width: '100%',
    },
    stepCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.darkCard,
        borderRadius: RADIUS.lg,
        padding: ms(14),
        gap: ms(12),
    },
    stepLeft: {
        width: ms(40),
        height: ms(40),
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primaryTransparent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: ms(14),
        fontFamily: 'Inter_600SemiBold',
        color: 'white',
        marginBottom: 2,
    },
    stepDesc: {
        fontSize: ms(12),
        fontFamily: 'Inter_400Regular',
        color: COLORS.textLight,
    },
    stepNum: {
        backgroundColor: COLORS.primaryTransparent,
        paddingHorizontal: ms(8),
        paddingVertical: ms(3),
        borderRadius: RADIUS.sm,
    },
    stepNumText: {
        fontSize: ms(12),
        fontFamily: 'Inter_700Bold',
        color: COLORS.primary,
    },

    // Rights Page
    rightsPage: {
        backgroundColor: COLORS.lightBg,
        paddingTop: ms(50),
    },
    rightsGrid: {
        gap: ms(12),
        width: '100%',
    },
    rightCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: RADIUS.lg,
        padding: ms(14),
        gap: ms(12),
        ...SHADOWS.card,
    },
    rightIconContainer: {
        width: ms(40),
        height: ms(40),
        borderRadius: RADIUS.md,
        backgroundColor: `${COLORS.accentOrange}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightContent: {
        flex: 1,
    },
    rightTitle: {
        fontSize: ms(14),
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
    },
    rightArticle: {
        fontSize: ms(11),
        fontFamily: 'Inter_500Medium',
        color: COLORS.primary,
        marginTop: 2,
    },

    // CTA Page
    ctaPage: {
        backgroundColor: COLORS.darkSurface,
        alignItems: 'center',
        paddingTop: ms(50),
    },
    ctaIcon: {
        width: ms(100),
        height: ms(100),
        borderRadius: ms(50),
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: ms(24),
        ...SHADOWS.glow,
    },
    ctaTitle: {
        fontSize: ms(28),
        fontFamily: 'Inter_700Bold',
        color: 'white',
        textAlign: 'center',
        lineHeight: ms(36),
        marginBottom: ms(12),
    },
    ctaDescription: {
        fontSize: ms(14),
        fontFamily: 'Inter_400Regular',
        color: COLORS.textLight,
        textAlign: 'center',
        lineHeight: ms(22),
        marginBottom: ms(24),
    },
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: ms(8),
        backgroundColor: COLORS.primary,
        paddingVertical: ms(14),
        paddingHorizontal: ms(24),
        borderRadius: RADIUS.md,
        marginBottom: ms(12),
        ...SHADOWS.glow,
    },
    ctaBtnText: {
        color: 'white',
        fontSize: ms(15),
        fontFamily: 'Inter_600SemiBold',
    },
    ctaSecondaryBtn: {
        paddingVertical: ms(12),
        paddingHorizontal: ms(24),
        borderRadius: RADIUS.md,
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    ctaSecondaryBtnText: {
        color: COLORS.primary,
        fontSize: ms(15),
        fontFamily: 'Inter_600SemiBold',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: ms(20),
        paddingTop: ms(16),
        backgroundColor: 'rgba(26, 31, 46, 0.95)',
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: ms(6),
        marginBottom: ms(16),
    },
    dot: {
        width: ms(7),
        height: ms(7),
        borderRadius: ms(4),
        backgroundColor: COLORS.textMuted,
    },
    dotActive: {
        width: ms(20),
        backgroundColor: COLORS.primary,
    },
    footerButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: ms(12),
    },
    skipBtn: {
        flex: 1,
        paddingVertical: ms(12),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.textMuted,
    },
    skipBtnText: {
        color: COLORS.textLight,
        fontSize: ms(15),
        fontFamily: 'Inter_500Medium',
    },
    nextBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: ms(6),
        backgroundColor: COLORS.primary,
        paddingVertical: ms(12),
        borderRadius: RADIUS.md,
    },
    nextBtnText: {
        color: 'white',
        fontSize: ms(15),
        fontFamily: 'Inter_600SemiBold',
    },
    fullWidthBtn: {
        flex: 2,
    },
});

