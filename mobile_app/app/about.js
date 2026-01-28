/**
 * NyayaSahay Mobile - About Screen
 * Matches web About.jsx structure
 */

import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const TECH_STACK = [
    { name: 'React Native + Expo', desc: 'Mobile App Framework', icon: 'smartphone' },
    { name: 'FastAPI', desc: 'Backend API', icon: 'server' },
    { name: 'Groq LLM', desc: 'AI Language Model', icon: 'cpu' },
    { name: 'FAISS / pgvector', desc: 'Vector Database', icon: 'database' },
    { name: 'PostgreSQL', desc: 'User Data Storage', icon: 'hard-drive' },
    { name: 'LangChain', desc: 'RAG Pipeline', icon: 'link' },
];

const TEAM_MEMBERS = [
    { name: 'Asish Adimulapu', role: 'Full Stack Developer', initials: 'AA' },
];

export default function AboutScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const openDrawer = () => {
        navigation.openDrawer();
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable style={styles.menuBtn} onPress={openDrawer}>
                    <Feather name="menu" size={24} color="white" />
                </Pressable>
                <Text style={styles.headerTitle}>About NyayaSahay</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.heroIcon}>
                        <MaterialCommunityIcons name="scale-balance" size={48} color="white" />
                    </View>
                    <Text style={styles.heroTitle}>NyayaSahay</Text>
                    <Text style={styles.heroSubtitle}>AI-Powered Legal Assistant for India</Text>
                    <Text style={styles.heroDescription}>
                        NyayaSahay uses advanced RAG (Retrieval Augmented Generation) technology
                        to provide accurate legal information based on Indian law. Our mission is
                        to make legal knowledge accessible to everyone.
                    </Text>
                </View>

                {/* Mission Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Our Mission</Text>
                    <View style={styles.card}>
                        <Text style={styles.cardText}>
                            Legal knowledge should not be a privilege. NyayaSahay democratizes
                            access to legal information, helping citizens understand their rights
                            under Indian law without expensive consultations.
                        </Text>
                    </View>
                </View>

                {/* Tech Stack Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Technology Stack</Text>
                    <View style={styles.techGrid}>
                        {TECH_STACK.map((tech, index) => (
                            <View key={index} style={styles.techCard}>
                                <View style={styles.techIcon}>
                                    <Feather name={tech.icon} size={24} color={COLORS.primary} />
                                </View>
                                <Text style={styles.techName}>{tech.name}</Text>
                                <Text style={styles.techDesc}>{tech.desc}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Team Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Development Team</Text>
                    <View style={styles.teamGrid}>
                        {TEAM_MEMBERS.map((member, index) => (
                            <View key={index} style={styles.teamCard}>
                                <View style={styles.teamAvatar}>
                                    <Text style={styles.teamInitials}>{member.initials}</Text>
                                </View>
                                <Text style={styles.teamName}>{member.name}</Text>
                                <Text style={styles.teamRole}>{member.role}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Disclaimer Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Legal Disclaimer</Text>
                    <View style={[styles.card, styles.disclaimerCard]}>
                        <Feather name="alert-triangle" size={24} color={COLORS.accentOrange} />
                        <Text style={styles.disclaimerText}>
                            NyayaSahay provides legal information for educational purposes only.
                            This is NOT legal advice. For specific legal matters, please consult
                            a qualified legal professional.
                        </Text>
                    </View>
                </View>

                {/* Version Info */}
                <View style={styles.versionSection}>
                    <Text style={styles.versionText}>Version 1.0.0</Text>
                    <Text style={styles.copyrightText}>© 2024 NyayaSahay. All rights reserved.</Text>
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
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Inter_600SemiBold',
        color: 'white',
    },

    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
    },

    // Hero
    heroSection: {
        alignItems: 'center',
        paddingVertical: SPACING.xxxl,
        backgroundColor: COLORS.darkSurface,
        marginHorizontal: -SPACING.lg,
        paddingHorizontal: SPACING.lg,
    },
    heroIcon: {
        width: 100,
        height: 100,
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
        ...SHADOWS.glow,
    },
    heroTitle: {
        fontSize: 32,
        fontFamily: 'Inter_700Bold',
        color: 'white',
        marginBottom: SPACING.xs,
    },
    heroSubtitle: {
        fontSize: 16,
        fontFamily: 'Inter_500Medium',
        color: COLORS.primary,
        marginBottom: SPACING.lg,
    },
    heroDescription: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textLight,
        textAlign: 'center',
        lineHeight: 24,
    },

    // Sections
    section: {
        marginTop: SPACING.xxl,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        color: COLORS.textDark,
        marginBottom: SPACING.lg,
    },

    // Cards
    card: {
        backgroundColor: 'white',
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        ...SHADOWS.card,
    },
    cardText: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
        lineHeight: 24,
    },
    disclaimerCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.md,
        backgroundColor: `${COLORS.accentOrange}10`,
        borderWidth: 1,
        borderColor: COLORS.accentOrange,
    },
    disclaimerText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
        lineHeight: 22,
    },

    // Tech Grid
    techGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
    },
    techCard: {
        width: '47%',
        backgroundColor: 'white',
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        ...SHADOWS.card,
    },
    techIcon: {
        width: 50,
        height: 50,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primaryTransparent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    techName: {
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
        textAlign: 'center',
        marginBottom: 2,
    },
    techDesc: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        textAlign: 'center',
    },

    // Team Grid
    teamGrid: {
        gap: SPACING.md,
    },
    teamCard: {
        backgroundColor: 'white',
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        alignItems: 'center',
        ...SHADOWS.card,
    },
    teamAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    teamInitials: {
        fontSize: 22,
        fontFamily: 'Inter_700Bold',
        color: 'white',
    },
    teamName: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
        marginBottom: 2,
    },
    teamRole: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
    },

    // Version
    versionSection: {
        alignItems: 'center',
        marginTop: SPACING.xxl,
        paddingVertical: SPACING.xl,
    },
    versionText: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        color: COLORS.textMuted,
        marginBottom: SPACING.xs,
    },
    copyrightText: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
    },
});
