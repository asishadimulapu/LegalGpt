/**
 * LawGPT Mobile - Reset Password Screen
 * Reached via deep link: law-gpt://reset-password?token=abc123
 * Lets the user set a new password.
 */

import { useState, useEffect, useRef } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { resetPassword } from '../services/api';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { token: rawToken } = useLocalSearchParams();
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const redirectTimer = useRef(null);

    // Cleanup redirect timer on unmount
    useEffect(() => {
        return () => {
            if (redirectTimer.current) clearTimeout(redirectTimer.current);
        };
    }, []);

    const validate = () => {
        if (!token) return 'Invalid reset link — no token found.';
        if (password.length < 12) return 'Password must be at least 12 characters';
        if (!/[A-Z]/.test(password)) return 'Must contain an uppercase letter';
        if (!/[a-z]/.test(password)) return 'Must contain a lowercase letter';
        if (!/\d/.test(password)) return 'Must contain a number';
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Must contain a special character';
        if (password !== confirmPassword) return 'Passwords do not match';
        return '';
    };

    const handleSubmit = async () => {
        setError('');
        setSuccess('');
        const validationError = validate();
        if (validationError) { setError(validationError); return; }

        setIsLoading(true);
        try {
            const res = await resetPassword(token, password);
            setSuccess(res.message || 'Password has been reset successfully!');
            redirectTimer.current = setTimeout(() => router.replace('/auth'), 3000);
        } catch (err) {
            setError(err.message || 'Failed to reset password');
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
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logo}>
                        <MaterialCommunityIcons name="lock-check" size={32} color="white" />
                    </View>
                    <Text style={styles.title}>Set New Password</Text>
                    <Text style={styles.subtitle}>Enter your new password below</Text>
                </View>

                {success ? (
                    <View style={styles.successContainer}>
                        <Feather name="check-circle" size={48} color={COLORS.primary} />
                        <Text style={styles.successTitle}>Password Reset!</Text>
                        <Text style={styles.successText}>{success}</Text>
                        <Text style={styles.redirectText}>Redirecting to sign in…</Text>
                    </View>
                ) : (
                    <View style={styles.form}>
                        <View style={styles.formGroup}>
                            <View style={styles.label}>
                                <Feather name="lock" size={14} color={COLORS.textMuted} />
                                <Text style={styles.labelText}>New Password</Text>
                            </View>
                            <View style={styles.passwordWrapper}>
                                <TextInput
                                    style={[styles.input, styles.passwordInput]}
                                    placeholder="Enter new password"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={password}
                                    onChangeText={(v) => { setPassword(v); setError(''); }}
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    accessibilityLabel="New password"
                                    accessibilityHint="Enter your new password"
                                />
                                <Pressable
                                    style={styles.passwordToggle}
                                    onPress={() => setShowPassword(!showPassword)}
                                    accessibilityRole="button"
                                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                                    accessibilityState={{ expanded: showPassword }}
                                >
                                    <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
                                </Pressable>
                            </View>
                            <Text style={styles.hint}>Min 12 chars · uppercase · lowercase · number · special</Text>
                        </View>

                        <View style={styles.formGroup}>
                            <View style={styles.label}>
                                <Feather name="lock" size={14} color={COLORS.textMuted} />
                                <Text style={styles.labelText}>Confirm Password</Text>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm new password"
                                placeholderTextColor={COLORS.textMuted}
                                value={confirmPassword}
                                onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
                                secureTextEntry
                                autoCapitalize="none"
                                accessibilityLabel="Confirm password"
                                accessibilityHint="Re-enter your new password to confirm"
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
                                <Text style={styles.submitBtnText}>Reset Password</Text>
                            )}
                        </Pressable>
                    </View>
                )}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        <Text style={styles.footerLink} onPress={() => router.replace('/auth')}>
                            ← Back to Sign In
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
    header: { alignItems: 'center', marginBottom: SPACING.xl },
    logo: {
        width: 70, height: 70, borderRadius: RADIUS.lg,
        backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
        marginBottom: SPACING.lg, ...SHADOWS.glow,
    },
    title: { fontSize: 26, fontFamily: 'Inter_700Bold', color: COLORS.textDark, marginBottom: SPACING.sm },
    subtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', color: COLORS.textMuted, textAlign: 'center' },
    form: { gap: SPACING.md },
    formGroup: { gap: SPACING.xs },
    label: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 4 },
    labelText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: COLORS.textDark },
    input: {
        height: 52, paddingHorizontal: SPACING.md, backgroundColor: 'white',
        borderWidth: 2, borderColor: COLORS.borderColor, borderRadius: RADIUS.md,
        fontSize: 16, fontFamily: 'Inter_400Regular', color: COLORS.textDark,
    },
    passwordWrapper: { position: 'relative' },
    passwordInput: { paddingRight: 50 },
    passwordToggle: { position: 'absolute', right: 0, top: 0, height: 52, width: 50, alignItems: 'center', justifyContent: 'center' },
    hint: { fontSize: 12, fontFamily: 'Inter_400Regular', color: COLORS.textMuted, marginTop: 4 },
    errorContainer: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        backgroundColor: COLORS.errorBg, padding: SPACING.md, borderRadius: RADIUS.md,
    },
    errorText: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', color: COLORS.errorRed },
    successContainer: { alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xl },
    successTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: COLORS.textDark },
    successText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: COLORS.textMuted, textAlign: 'center' },
    redirectText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: COLORS.textMuted },
    submitBtn: {
        height: 52, backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
        alignItems: 'center', justifyContent: 'center', marginTop: SPACING.md,
        ...SHADOWS.glow,
    },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: 'white' },
    footer: { marginTop: SPACING.xl, alignItems: 'center' },
    footerText: { fontSize: 15, fontFamily: 'Inter_400Regular', color: COLORS.textMuted },
    footerLink: { color: COLORS.primary, fontFamily: 'Inter_600SemiBold' },
});
