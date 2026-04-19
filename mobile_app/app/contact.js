/**
 * LawGPT Mobile - Contact Screen
 */

import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const CONTACT_METHODS = [
    {
        icon: "mail",
        title: "Email Support",
        detail: "support@law-gpt.app",
        subtitle: "We typically respond within 24 hours",
        action: () => Linking.openURL('mailto:support@law-gpt.app').catch(() => console.warn('Failed to open email client')),
    },
    {
        icon: "globe",
        title: "Website",
        detail: "www.law-gpt.app",
        subtitle: "Visit our website for more information",
        action: () => Linking.openURL('https://law-gpt.app').catch(() => console.warn('Failed to open website')),
    },
    {
        icon: "github",
        title: "GitHub",
        detail: "Open Source Project",
        subtitle: "Report issues or contribute",
        action: () => Linking.openURL('https://github.com/asishadimulapu/LegalGpt').catch(() => console.warn('Failed to open GitHub')),
    },
];

const FAQ_PREVIEW = [
    { q: "How do I use LawGPT?", a: "Simply type your legal question in the chat and our AI will provide information based on Indian law." },
    { q: "Is my data secure?", a: "Yes, we use encryption and secure storage to protect your data." },
    { q: "Can I get legal advice?", a: "No, we provide legal information only. For advice, consult a qualified advocate." },
];

export default function ContactScreen() {
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
                <Text style={styles.headerTitle}>Contact Us</Text>
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
                        <Feather name="message-circle" size={40} color="white" />
                    </View>
                    <Text style={styles.heroTitle}>Get in Touch</Text>
                    <Text style={styles.heroSubtitle}>
                        We're here to help with any questions or feedback
                    </Text>
                </View>

                {/* Contact Cards */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact Methods</Text>
                    {CONTACT_METHODS.map((method, index) => (
                        <Pressable key={index} style={styles.contactCard} onPress={method.action}>
                            <View style={styles.contactIcon}>
                                <Feather name={method.icon} size={24} color={COLORS.primary} />
                            </View>
                            <View style={styles.contactContent}>
                                <Text style={styles.contactTitle}>{method.title}</Text>
                                <Text style={styles.contactDetail}>{method.detail}</Text>
                                <Text style={styles.contactSubtitle}>{method.subtitle}</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
                        </Pressable>
                    ))}
                </View>

                {/* Quick FAQ */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Answers</Text>
                    {FAQ_PREVIEW.map((item, index) => (
                        <View key={index} style={styles.faqCard}>
                            <Text style={styles.faqQuestion}>{item.q}</Text>
                            <Text style={styles.faqAnswer}>{item.a}</Text>
                        </View>
                    ))}
                </View>

                {/* Response Time */}
                <View style={styles.responseCard}>
                    <Feather name="clock" size={24} color={COLORS.accentGreen} />
                    <View style={styles.responseContent}>
                        <Text style={styles.responseTitle}>Response Time</Text>
                        <Text style={styles.responseText}>
                            We aim to respond to all inquiries within 24-48 hours during business days.
                        </Text>
                    </View>
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
        width: 80,
        height: 80,
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    heroTitle: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
        color: COLORS.textDark,
        marginBottom: SPACING.xs,
    },
    heroSubtitle: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
        marginBottom: SPACING.md,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        marginBottom: SPACING.sm,
        ...SHADOWS.sm,
    },
    contactIcon: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primaryTransparent,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    contactContent: {
        flex: 1,
    },
    contactTitle: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
    },
    contactDetail: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        color: COLORS.primary,
        marginTop: 2,
    },
    contactSubtitle: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        marginTop: 2,
    },
    faqCard: {
        backgroundColor: 'white',
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        marginBottom: SPACING.sm,
        ...SHADOWS.sm,
    },
    faqQuestion: {
        fontSize: 15,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
        marginBottom: SPACING.xs,
    },
    faqAnswer: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        lineHeight: 22,
    },
    responseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.accentGreen,
    },
    responseContent: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    responseTitle: {
        fontSize: 15,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
        marginBottom: SPACING.xs,
    },
    responseText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        lineHeight: 22,
    },
});
