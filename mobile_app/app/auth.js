/**
 * NyayaSahay Mobile - Auth Screen
 * Pixel-perfect replica of web AuthModal.jsx
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
import { registerUser, loginUser, saveUser } from '../services/api';

export default function AuthScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [mode, setMode] = useState('signin'); // 'signin' or 'register'
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isSignIn = mode === 'signin';

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        setError('');
    };

    const handleSubmit = async () => {
        setError('');

        // Validation
        if (!formData.email || !formData.password) {
            setError('Please fill in all required fields');
            return;
        }

        if (!isSignIn) {
            if (!formData.name) {
                setError('Please enter your name');
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            if (formData.password.length < 6) {
                setError('Password must be at least 6 characters');
                return;
            }
        }

        setIsLoading(true);
        try {
            if (isSignIn) {
                const response = await loginUser(formData.email, formData.password);
                const userData = { email: formData.email, token: response.access_token };
                await saveUser(userData);
                router.replace('/chat');
            } else {
                await registerUser(formData.name, formData.email, formData.password);
                // Auto login after registration
                const loginResponse = await loginUser(formData.email, formData.password);
                const userData = { email: formData.email, name: formData.name, token: loginResponse.access_token };
                await saveUser(userData);
                router.replace('/chat');
            }
        } catch (err) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        router.back();
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
                {/* Close Button */}
                <Pressable style={styles.closeBtn} onPress={handleClose}>
                    <Feather name="x" size={24} color={COLORS.textMuted} />
                </Pressable>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logo}>
                        <MaterialCommunityIcons name="scale-balance" size={32} color="white" />
                    </View>
                    <Text style={styles.title}>{isSignIn ? 'Welcome Back' : 'Create Account'}</Text>
                    <Text style={styles.subtitle}>
                        {isSignIn
                            ? 'Sign in to access your legal consultation history'
                            : 'Join NyayaSahay for personalized legal guidance'
                        }
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    {!isSignIn && (
                        <View style={styles.formGroup}>
                            <View style={styles.label}>
                                <Feather name="user" size={14} color={COLORS.textMuted} />
                                <Text style={styles.labelText}>Full Name</Text>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your full name"
                                placeholderTextColor={COLORS.textMuted}
                                value={formData.name}
                                onChangeText={(value) => handleChange('name', value)}
                                autoCapitalize="words"
                            />
                        </View>
                    )}

                    <View style={styles.formGroup}>
                        <View style={styles.label}>
                            <Feather name="mail" size={14} color={COLORS.textMuted} />
                            <Text style={styles.labelText}>Email Address</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            placeholderTextColor={COLORS.textMuted}
                            value={formData.email}
                            onChangeText={(value) => handleChange('email', value)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <View style={styles.label}>
                            <Feather name="lock" size={14} color={COLORS.textMuted} />
                            <Text style={styles.labelText}>Password</Text>
                        </View>
                        <View style={styles.passwordWrapper}>
                            <TextInput
                                style={[styles.input, styles.passwordInput]}
                                placeholder="Enter your password"
                                placeholderTextColor={COLORS.textMuted}
                                value={formData.password}
                                onChangeText={(value) => handleChange('password', value)}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <Pressable
                                style={styles.passwordToggle}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Feather
                                    name={showPassword ? 'eye-off' : 'eye'}
                                    size={20}
                                    color={COLORS.textMuted}
                                />
                            </Pressable>
                        </View>
                    </View>

                    {!isSignIn && (
                        <View style={styles.formGroup}>
                            <View style={styles.label}>
                                <Feather name="lock" size={14} color={COLORS.textMuted} />
                                <Text style={styles.labelText}>Confirm Password</Text>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm your password"
                                placeholderTextColor={COLORS.textMuted}
                                value={formData.confirmPassword}
                                onChangeText={(value) => handleChange('confirmPassword', value)}
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </View>
                    )}

                    {/* Error */}
                    {error && (
                        <View style={styles.errorContainer}>
                            <Feather name="alert-circle" size={16} color={COLORS.errorRed} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    {/* Submit Button */}
                    <Pressable
                        style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.submitBtnText}>
                                {isSignIn ? 'Sign In' : 'Create Account'}
                            </Text>
                        )}
                    </Pressable>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        {isSignIn ? "Don't have an account? " : "Already have an account? "}
                        <Text
                            style={styles.footerLink}
                            onPress={() => setMode(isSignIn ? 'register' : 'signin')}
                        >
                            {isSignIn ? 'Sign Up' : 'Sign In'}
                        </Text>
                    </Text>
                </View>

                {/* Disclaimer */}
                <Text style={styles.disclaimer}>
                    By continuing, you agree to our Terms of Service and Privacy Policy
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: SPACING.xl,
    },
    closeBtn: {
        alignSelf: 'flex-end',
        padding: SPACING.sm,
        marginBottom: SPACING.md,
    },


    // Header
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    logo: {
        width: 70,
        height: 70,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
        ...SHADOWS.glow,
    },
    title: {
        fontSize: 26,
        fontFamily: 'Inter_700Bold',
        color: COLORS.textDark,
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 22,
    },

    // Form
    form: {
        gap: SPACING.md,
    },
    formGroup: {
        gap: SPACING.xs,
    },
    label: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginBottom: 4,
    },
    labelText: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        color: COLORS.textDark,
    },
    input: {
        height: 52,
        paddingHorizontal: SPACING.md,
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: COLORS.borderColor,
        borderRadius: RADIUS.md,
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
    },
    passwordWrapper: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 50,
    },
    passwordToggle: {
        position: 'absolute',
        right: 0,
        top: 0,
        height: 52,
        width: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.errorBg,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
    },
    errorText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        color: COLORS.errorRed,
    },
    submitBtn: {
        height: 52,
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.md,
        ...SHADOWS.glow,
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    submitBtnText: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: 'white',
    },

    // Footer
    footer: {
        marginTop: SPACING.xl,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
    },
    footerLink: {
        color: COLORS.primary,
        fontFamily: 'Inter_600SemiBold',
    },

    // Disclaimer
    disclaimer: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: SPACING.xl,
        lineHeight: 18,
    },
});
