/**
 * LawGPT Mobile - Privacy Policy Screen
 */

import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const SECTIONS = [
    {
        title: "Information We Collect",
        content: "We collect information you provide directly, including:\n\n• Account information (email, name) when you register\n• Chat messages and queries you send\n• Uploaded documents (if applicable)\n\nWe automatically collect:\n• Device information and app usage data\n• IP address and general location\n• App performance metrics"
    },
    {
        title: "How We Use Your Information",
        content: "We use collected information to:\n\n• Provide and improve our legal information service\n• Respond to your queries with relevant legal information\n• Maintain and improve app performance\n• Communicate important updates\n• Ensure security and prevent fraud"
    },
    {
        title: "Data Security",
        content: "We implement industry-standard security measures:\n\n• End-to-end encryption for sensitive data\n• Secure token storage using device secure storage\n• Regular security audits\n• Access controls and monitoring\n\nNo data transmission is 100% secure, but we strive to protect your information."
    },
    {
        title: "Data Retention",
        content: "We retain your data only as long as necessary:\n\n• Chat history: Until you delete it or your account\n• Account data: Until account deletion\n• Analytics: Aggregated and anonymized\n\nYou can request data deletion at any time."
    },
    {
        title: "Your Rights",
        content: "You have the right to:\n\n• Access your personal data\n• Correct inaccurate data\n• Delete your data\n• Export your data\n• Opt-out of marketing communications\n\nContact us to exercise these rights."
    },
    {
        title: "Third-Party Services",
        content: "We use third-party services for:\n\n• Cloud hosting and infrastructure\n• AI language model processing\n• Analytics (anonymized)\n\nThese services have their own privacy policies."
    },
    {
        title: "Contact Us",
        content: "For privacy concerns:\n\nEmail: privacy@law-gpt.app\n\nWe will respond within 30 days."
    },
];

export default function PrivacyScreen() {
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
                <Text style={styles.headerTitle}>Privacy Policy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero */}
                <View style={styles.hero}>
                    <View style={styles.heroIcon}>
                        <Feather name="shield" size={32} color="white" />
                    </View>
                    <Text style={styles.heroTitle}>Privacy Policy</Text>
                    <Text style={styles.heroSubtitle}>
                        Last updated: February 2026
                    </Text>
                </View>

                {/* Intro */}
                <View style={styles.introCard}>
                    <Text style={styles.introText}>
                        LawGPT ("we", "our", "us") is committed to protecting your privacy.
                        This policy explains how we collect, use, and safeguard your information.
                    </Text>
                </View>

                {/* Sections */}
                {SECTIONS.map((section, index) => (
                    <View key={index} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <Text style={styles.sectionContent}>{section.content}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.lightBg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
        backgroundColor: COLORS.primary,
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
        padding: SPACING.lg,
    },
    hero: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    heroIcon: {
        width: 64,
        height: 64,
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    heroTitle: {
        fontSize: 22,
        fontFamily: 'Inter_700Bold',
        color: COLORS.textDark,
        marginBottom: SPACING.xs,
    },
    heroSubtitle: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
    },
    introCard: {
        backgroundColor: COLORS.primaryTransparent,
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        marginBottom: SPACING.xl,
    },
    introText: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
        lineHeight: 24,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        ...SHADOWS.sm,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
        marginBottom: SPACING.sm,
    },
    sectionContent: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        lineHeight: 22,
    },
});
