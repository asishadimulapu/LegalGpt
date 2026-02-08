/**
 * NyayaSahay Mobile - FAQ Screen
 * Frequently Asked Questions
 */

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { wp, hp, ms, screenSize } from '../constants/responsive';

const FAQ_DATA = [
    {
        q: "What is NyayaSahay?",
        a: "NyayaSahay is an AI-powered legal assistant that provides information about Indian law, including IPC (Indian Penal Code), CrPC (Code of Criminal Procedure), and Constitutional provisions."
    },
    {
        q: "Is this legal advice?",
        a: "No. NyayaSahay provides legal information only, not legal advice. For specific legal matters, please consult a qualified advocate."
    },
    {
        q: "What laws does NyayaSahay cover?",
        a: "We cover IPC (Indian Penal Code), CrPC (Code of Criminal Procedure), Constitution of India, IT Act, and various other Indian legal provisions."
    },
    {
        q: "Can I upload documents for analysis?",
        a: "Yes, you can upload legal documents (PDF, TXT, DOC, DOCX) up to 10 MB for analysis. The AI will read the document and answer questions about it."
    },
    {
        q: "Is my data secure?",
        a: "Yes. We use industry-standard encryption, secure token storage, and do not share your data with third parties. All conversations are encrypted."
    },
    {
        q: "Do I need to create an account?",
        a: "No. You can use NyayaSahay without an account. However, creating an account allows you to save your chat history."
    },
    {
        q: "What if I get incorrect information?",
        a: "Always verify important legal information with a qualified lawyer. While we strive for accuracy, AI systems can make mistakes."
    },
    {
        q: "Is NyayaSahay free to use?",
        a: "Yes, NyayaSahay is currently free to use for basic legal queries. Premium features may be added in the future."
    },
];

function FAQItem({ question, answer, isOpen, onToggle }) {
    return (
        <Pressable style={styles.faqItem} onPress={onToggle}>
            <View style={styles.faqQuestion}>
                <Text style={styles.faqQuestionText}>{question}</Text>
                <Feather
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={COLORS.primary}
                />
            </View>
            {isOpen && (
                <Text style={styles.faqAnswer}>{answer}</Text>
            )}
        </Pressable>
    );
}

export default function FAQScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [openIndex, setOpenIndex] = useState(null);

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
                <Text style={styles.headerTitle}>FAQ</Text>
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
                        <Feather name="help-circle" size={32} color="white" />
                    </View>
                    <Text style={styles.heroTitle}>Frequently Asked Questions</Text>
                    <Text style={styles.heroSubtitle}>
                        Find answers to common questions about NyayaSahay
                    </Text>
                </View>

                {/* FAQ List */}
                <View style={styles.faqList}>
                    {FAQ_DATA.map((item, index) => (
                        <FAQItem
                            key={index}
                            question={item.q}
                            answer={item.a}
                            isOpen={openIndex === index}
                            onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                        />
                    ))}
                </View>

                {/* Contact CTA */}
                <View style={styles.contactCta}>
                    <Feather name="message-circle" size={24} color={COLORS.primary} />
                    <Text style={styles.contactText}>
                        Still have questions? Contact us at support@nyayasahay.app
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
        textAlign: 'center',
        marginBottom: SPACING.sm,
    },
    heroSubtitle: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    faqList: {
        gap: SPACING.sm,
    },
    faqItem: {
        backgroundColor: 'white',
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        ...SHADOWS.sm,
    },
    faqQuestion: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    faqQuestionText: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
        marginRight: SPACING.sm,
    },
    faqAnswer: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        lineHeight: 22,
        marginTop: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderColor,
    },
    contactCta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        backgroundColor: COLORS.primaryTransparent,
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        marginTop: SPACING.xl,
    },
    contactText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
    },
});
