/**
 * NyayaSahay Mobile - Auth Screen
 * Pixel-perfect replica of web AuthModal.jsx with responsive design
 */

import { useState, useEffect } from 'react';
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
import { MaterialCommunityIcons, Feather, AntDesign } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { wp, hp, ms, screenSize } from '../constants/responsive';
import { registerUser, loginUser, saveUser } from '../services/api';

// API base URL (same as api.js)
const API_BASE_URL = 'https://law-gpt.app';

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
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Handle Google Sign In via web-based flow
    // Flow:
    // 1. Generate return URL using Linking.createURL (works in Expo Go & standalone)
    // 2. Fetch Google OAuth URL from backend, passing mobile_redirect
    // 3. Backend encodes redirect in state: mobile.<b64(redirect)>.<token>
    // 4. Open Google sign-in in browser via WebBrowser.openAuthSessionAsync
    // 5. After auth, Google redirects to law-gpt.app/auth/callback
    // 6. Callback decodes redirect from state, redirects to app via deep link
    // 7. openAuthSessionAsync detects the redirect and returns the URL
    // 8. App parses token from URL and saves user
    const handleGoogleSignIn = async () => {
        setError('');
        setIsGoogleLoading(true);
        try {
            // Generate the correct return URL for this environment
            // Expo Go: exp://192.168.x.x:8081/--/auth/callback
            // Standalone build: nyayasahay://auth/callback
            const returnUrl = Linking.createURL('auth/callback');
            console.log('📱 Return URL:', returnUrl);

            // Step 1: Get the Google OAuth URL from backend
            const response = await fetch(
                `${API_BASE_URL}/api/v1/auth/google/url?source=mobile&mobile_redirect=${encodeURIComponent(returnUrl)}`
            );
            if (!response.ok) {
                throw new Error('Failed to get Google sign-in URL');
            }
            const data = await response.json();
            const googleAuthUrl = data.auth_url;

            if (!googleAuthUrl) {
                console.error('Backend response:', JSON.stringify(data));
                throw new Error('No auth URL received from backend');
            }

            console.log('🔗 Opening Google OAuth...');

            // Step 2: Open Google OAuth in system browser
            // openAuthSessionAsync will detect when browser navigates to returnUrl
            const result = await WebBrowser.openAuthSessionAsync(
                googleAuthUrl,
                returnUrl
            );

            // Step 3: Parse the deep link result
            if (result.type === 'success' && result.url) {
                console.log('✅ Auth returned:', result.url);
                const url = new URL(result.url);
                const code = url.searchParams.get('code');
                const token = url.searchParams.get('token'); // Fallback

                if (code) {
                    // Secure flow: Exchange code for token
                    console.log('🔄 Exchanging transfer code...');
                    const { exchangeTransferCode } = require('../services/api'); // Dynamic import to avoid cycles if any
                    const authData = await exchangeTransferCode(code);

                    await saveUser({
                        token: authData.access_token,
                        email: authData.user.email,
                        name: authData.user.full_name,
                        id: authData.user.id
                    });

                    // Small delay to ensure SecureStore write completes
                    await new Promise(resolve => setTimeout(resolve, 100));
                    router.replace('/chat');

                } else if (token) {
                    // Legacy/Fallback flow
                    const email = url.searchParams.get('email');
                    const name = url.searchParams.get('name');
                    const id = url.searchParams.get('id');

                    // Step 4: Save user and navigate to chat
                    await saveUser({ token, email, name, id });
                    // Small delay to ensure SecureStore write completes
                    await new Promise(resolve => setTimeout(resolve, 100));
                    router.replace('/chat');
                } else {
                    throw new Error('No auth code or token received');
                }
            } else if (result.type === 'cancel' || result.type === 'dismiss') {
                // User cancelled - do nothing
                console.log('Auth cancelled/dismissed');
            } else {
                throw new Error('Authentication was not completed');
            }
        } catch (err) {
            console.error('Google Sign In Error:', err);
            setError(err.message || 'Failed to sign in with Google');
        } finally {
            setIsGoogleLoading(false);
        }
    };

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
                if (!response.access_token) {
                    throw new Error('No access token received');
                }
                const userData = { email: formData.email, token: response.access_token };
                await saveUser(userData);
                // Small delay to ensure SecureStore write completes
                await new Promise(resolve => setTimeout(resolve, 100));
                router.replace('/chat');
            } else {
                await registerUser(formData.name, formData.email, formData.password);
                // Auto login after registration
                const loginResponse = await loginUser(formData.email, formData.password);
                if (!loginResponse.access_token) {
                    throw new Error('No access token received');
                }
                const userData = { email: formData.email, name: formData.name, token: loginResponse.access_token };
                await saveUser(userData);
                // Small delay to ensure SecureStore write completes
                await new Promise(resolve => setTimeout(resolve, 100));
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

                {/* Google OAuth Button */}
                <Pressable
                    style={[styles.googleBtn, isGoogleLoading && styles.googleBtnDisabled]}
                    onPress={handleGoogleSignIn}
                    disabled={isGoogleLoading || isLoading}
                >
                    {isGoogleLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <AntDesign name="google" size={18} color="white" />
                            <Text style={styles.googleBtnText}>Continue with Google</Text>
                        </>
                    )}
                </Pressable>

                {/* Divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or continue with email</Text>
                    <View style={styles.dividerLine} />
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
                    By continuing, you agree to our{' '}
                    <Text style={styles.legalLink} onPress={() => router.push('/terms')}>
                        Terms of Service
                    </Text>
                    {' '}and{' '}
                    <Text style={styles.legalLink} onPress={() => router.push('/privacy')}>
                        Privacy Policy
                    </Text>
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

    // Google OAuth Button
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        height: 52,
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.md,
        ...SHADOWS.card,
    },
    googleBtnDisabled: {
        opacity: 0.7,
    },
    googleBtnText: {
        fontSize: 15,
        fontFamily: 'Inter_600SemiBold',
        color: 'white',
    },

    // Divider
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.borderColor,
    },
    dividerText: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
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
    legalLink: {
        color: COLORS.primary,
        fontFamily: 'Inter_500Medium',
    },
});
