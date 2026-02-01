/**
 * NyayaSahay Mobile - Terms of Service Screen
 */

import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const SECTIONS = [
    {
        title: "1. Acceptance of Terms",
        content: "By accessing or using NyayaSahay, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service."
    },
    {
        title: "2. Nature of Service",
        content: "NyayaSahay provides legal information only, NOT legal advice. The information provided:\n\n• Is for educational purposes only\n• Should not be relied upon as legal advice\n• Does not create an attorney-client relationship\n• May not reflect the most current legal developments\n\nAlways consult a qualified legal professional for specific legal matters."
    },
    {
        title: "3. User Responsibilities",
        content: "As a user, you agree to:\n\n• Provide accurate information\n• Use the service lawfully\n• Not attempt to circumvent security measures\n• Not use the service for illegal purposes\n• Not upload malicious content\n• Respect intellectual property rights"
    },
    {
        title: "4. Prohibited Uses",
        content: "You may not use NyayaSahay to:\n\n• Violate any laws or regulations\n• Harass, abuse, or harm others\n• Transmit malware or viruses\n• Attempt unauthorized access\n• Impersonate others\n• Interfere with service operation"
    },
    {
        title: "5. Intellectual Property",
        content: "All content, features, and functionality are owned by NyayaSahay and protected by intellectual property laws. You may not:\n\n• Copy or modify our content\n• Use our branding without permission\n• Reverse engineer our technology\n• Create derivative works"
    },
    {
        title: "6. Disclaimer of Warranties",
        content: "NyayaSahay is provided \"AS IS\" without warranties of any kind. We do not guarantee:\n\n• Accuracy of legal information\n• Uninterrupted service availability\n• Error-free operation\n• Fitness for any particular purpose"
    },
    {
        title: "7. Limitation of Liability",
        content: "To the maximum extent permitted by law, NyayaSahay shall not be liable for any:\n\n• Indirect or consequential damages\n• Loss of profits or data\n• Damages from reliance on information provided\n• Service interruptions"
    },
    {
        title: "8. Changes to Terms",
        content: "We may modify these terms at any time. Continued use after changes constitutes acceptance of new terms. We will notify users of significant changes."
    },
    {
        title: "9. Governing Law",
        content: "These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in India."
    },
    {
        title: "10. Contact",
        content: "For questions about these terms:\n\nEmail: legal@nyayasahay.app"
    },
];

export default function TermsScreen() {
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
                <Text style={styles.headerTitle}>Terms of Service</Text>
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
                        <Feather name="file-text" size={32} color="white" />
                    </View>
                    <Text style={styles.heroTitle}>Terms of Service</Text>
                    <Text style={styles.heroSubtitle}>
                        Last updated: February 2026
                    </Text>
                </View>

                {/* Important Notice */}
                <View style={styles.warningCard}>
                    <Feather name="alert-triangle" size={24} color={COLORS.accentOrange} />
                    <Text style={styles.warningText}>
                        Please read these terms carefully. By using NyayaSahay, you agree to these terms.
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
    warningCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        backgroundColor: '#FFF8E1',
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        marginBottom: SPACING.xl,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.accentOrange,
    },
    warningText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        color: COLORS.textDark,
        lineHeight: 22,
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
