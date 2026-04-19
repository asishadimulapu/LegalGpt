/**
 * LawGPT Mobile - Forgot Password Screen
 * Allows users to request a password reset email
 */

import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { forgotPassword } from '../services/api';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        setError('');
        setSuccess('');

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setIsLoading(true);
        try {
            await forgotPassword(email);
            setSuccess('If an account exists with this email, a reset link has been sent.');
        } catch (err) {
            // Always show success message to prevent email enumeration
            setSuccess('If an account exists with this email, a reset link has been sent.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar style="dark" />
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }
                ]}
                keyboardShouldPersistTaps="handled"
            >
                {/* Back Button */}
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <Feather name="arrow-left" size={24} color={COLORS.textMuted} />
                </Pressable>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logo}>
                        <MaterialCommunityIcons name="lock-reset" size={32} color="white" />
                    </View>
                    <Text style={styles.title}>Forgot Password</Text>
                    <Text style={styles.subtitle}>
                        Enter your email address and we'll send you a link to reset your password.
                    </Text>
                </View>

                {success ? (
                    <View style={styles.successContainer}>
                        <Feather name="check-circle" size={48} color={COLORS.primary} />
                        <Text style={styles.successTitle}>Check Your Email</Text>
                        <Text style={styles.successText}>{success}</Text>
                        <Pressable style={styles.submitBtn} onPress={() => router.replace('/auth')}>
                            <Text style={styles.submitBtnText}>Back to Sign In</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.form}>
                        <View style={styles.formGroup}>
                            <View style={styles.label}>
                                <Feather name="mail" size={14} color={COLORS.textMuted} />
                                <Text style={styles.labelText}>Email Address</Text>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor={COLORS.textMuted}
                                value={email}
                                onChangeText={(v) => { setEmail(v); setError(''); }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        {error && (
                            <View style={styles.errorContainer}>
                                <Feather name="alert-circle" size={16} color={COLORS.errorRed} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        <Pressable
                            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.submitBtnText}>Send Reset Link</Text>
                            )}
                        </Pressable>
                    </View>
                )}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Remember your password?{' '}
                        <Text style={styles.footerLink} onPress={() => router.replace('/auth')}>
                            Sign In
                        </Text>
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    scrollContent: { flexGrow: 1, paddingHorizontal: SPACING.xl },
    backBtn: { alignSelf: 'flex-start', padding: SPACING.sm, marginBottom: SPACING.md },
    header: { alignItems: 'center', marginBottom: SPACING.xl },
    logo: {
        width: 70, height: 70, borderRadius: RADIUS.lg,
        backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
        marginBottom: SPACING.lg, ...SHADOWS.glow,
    },
    title: { fontSize: 26, fontFamily: 'Inter_700Bold', color: COLORS.textDark, marginBottom: SPACING.sm },
    subtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
    form: { gap: SPACING.md },
    formGroup: { gap: SPACING.xs },
    label: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 4 },
    labelText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: COLORS.textDark },
    input: {
        height: 52, paddingHorizontal: SPACING.md, backgroundColor: 'white',
        borderWidth: 2, borderColor: COLORS.borderColor, borderRadius: RADIUS.md,
        fontSize: 16, fontFamily: 'Inter_400Regular', color: COLORS.textDark,
    },
    errorContainer: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        backgroundColor: COLORS.errorBg, padding: SPACING.md, borderRadius: RADIUS.md,
    },
    errorText: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', color: COLORS.errorRed },
    successContainer: { alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xl },
    successTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: COLORS.textDark },
    successText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
    submitBtn: {
        height: 52, backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
        alignItems: 'center', justifyContent: 'center', marginTop: SPACING.md, width: '100%',
        ...SHADOWS.glow,
    },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: 'white' },
    footer: { marginTop: SPACING.xl, alignItems: 'center' },
    footerText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: COLORS.textMuted },
    footerLink: { color: COLORS.primary, fontFamily: 'Inter_600SemiBold' },
});
