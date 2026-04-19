/**
 * LawGPT Mobile - Disclaimer Screen
 */

import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const DISCLAIMERS = [
    {
        icon: "alert-circle",
        title: "Not Legal Advice",
        content: "LawGPT provides legal information for educational purposes only. This is NOT legal advice and should not be treated as such. Always consult a qualified advocate for specific legal matters."
    },
    {
        icon: "users",
        title: "No Attorney-Client Relationship",
        content: "Using LawGPT does not create an attorney-client relationship. The information provided is general in nature and may not apply to your specific situation."
    },
    {
        icon: "clock",
        title: "Information May Be Outdated",
        content: "Laws change frequently. While we strive to keep our database current, some information may not reflect the latest amendments or judicial interpretations."
    },
    {
        icon: "map-pin",
        title: "Jurisdiction Limitations",
        content: "LawGPT focuses on Indian law. Laws vary by state and jurisdiction. Local laws and procedures may differ from general information provided."
    },
    {
        icon: "cpu",
        title: "AI Limitations",
        content: "Our AI system, while advanced, may occasionally provide incomplete or inaccurate information. Always verify important legal information from authoritative sources."
    },
    {
        icon: "shield-off",
        title: "No Liability",
        content: "LawGPT and its operators are not liable for any actions taken based on information provided. Use this service at your own discretion and risk."
    },
];

export default function DisclaimerScreen() {
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
                <Text style={styles.headerTitle}>Disclaimer</Text>
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
                        <MaterialCommunityIcons name="scale-balance" size={40} color="white" />
                    </View>
                    <Text style={styles.heroTitle}>Important Disclaimer</Text>
                    <Text style={styles.heroSubtitle}>
                        Please read carefully before using LawGPT
                    </Text>
                </View>

                {/* Main Warning */}
                <View style={styles.mainWarning}>
                    <Feather name="alert-triangle" size={32} color={COLORS.errorRed} />
                    <Text style={styles.mainWarningTitle}>Legal Information Only</Text>
                    <Text style={styles.mainWarningText}>
                        LawGPT is an AI-powered legal information service. It is NOT a substitute 
                        for professional legal advice from a qualified advocate.
                    </Text>
                </View>

                {/* Disclaimer Cards */}
                {DISCLAIMERS.map((item, index) => (
                    <View key={index} style={styles.card}>
                        <View style={styles.cardIcon}>
                            <Feather name={item.icon} size={24} color={COLORS.primary} />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardText}>{item.content}</Text>
                        </View>
                    </View>
                ))}

                {/* Acknowledgment */}
                <View style={styles.acknowledgment}>
                    <Text style={styles.acknowledgmentText}>
                        By using LawGPT, you acknowledge that you have read, understood, 
                        and agree to this disclaimer.
                    </Text>
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
    mainWarning: {
        backgroundColor: COLORS.errorBg,
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        alignItems: 'center',
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.errorRed,
    },
    mainWarningTitle: {
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
        color: COLORS.errorRed,
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
    },
    mainWarningText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
        textAlign: 'center',
        lineHeight: 22,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        ...SHADOWS.sm,
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primaryTransparent,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
        marginBottom: SPACING.xs,
    },
    cardText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        lineHeight: 22,
    },
    acknowledgment: {
        backgroundColor: COLORS.darkSurface,
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        marginTop: SPACING.lg,
    },
    acknowledgmentText: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        color: 'white',
        textAlign: 'center',
        lineHeight: 22,
    },
});
