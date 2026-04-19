/**
 * LawGPT Mobile - Email Verification Screen
 * Reached via deep link: law-gpt://verify-email?token=abc123
 * Automatically verifies the email and shows result.
 */

import { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { verifyEmail } from '../services/api';

export default function VerifyEmailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { token: rawToken } = useLocalSearchParams();
    // Normalize: useLocalSearchParams can return string | string[]
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken || '';

    const [status, setStatus] = useState('loading'); // loading | success | error
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No verification token found.');
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const res = await verifyEmail(token);
                if (!cancelled) {
                    setStatus('success');
                    setMessage(res.message || 'Email verified successfully!');
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('Email verification failed:', err);
                    setStatus('error');
                    setMessage('Verification failed. Please try again or request a new link.');
                }
            }
        })();

        return () => { cancelled = true; };
    }, [token]);

    return (
        <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
            <StatusBar style="light" />

            <View style={styles.content}>
                {status === 'loading' && (
                    <>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.title}>Verifying your email…</Text>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <View style={styles.iconCircle}>
                            <Feather name="check-circle" size={48} color={COLORS.primary} />
                        </View>
                        <Text style={styles.title}>Email Verified!</Text>
                        <Text style={styles.message}>{message}</Text>
                        <Pressable style={styles.btn} onPress={() => router.replace('/auth')}>
                            <Text style={styles.btnText}>Sign In</Text>
                        </Pressable>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <View style={[styles.iconCircle, styles.iconCircleError]}>
                            <Feather name="x-circle" size={48} color={COLORS.errorRed} />
                        </View>
                        <Text style={styles.title}>Verification Failed</Text>
                        <Text style={styles.message}>{message}</Text>
                        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => router.replace('/')}>
                            <Text style={styles.btnSecondaryText}>Go Home</Text>
                        </Pressable>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.darkBg,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    content: {
        alignItems: 'center',
        gap: SPACING.lg,
        maxWidth: 400,
        width: '100%',
    },
    iconCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: `${COLORS.primary}20`, alignItems: 'center', justifyContent: 'center',
    },
    iconCircleError: {
        backgroundColor: `${COLORS.errorRed}20`,
    },
    title: {
        fontSize: 24, fontFamily: 'Inter_700Bold', color: COLORS.textWhite, textAlign: 'center',
    },
    message: {
        fontSize: 15, fontFamily: 'Inter_400Regular', color: COLORS.textLight,
        textAlign: 'center', lineHeight: 22,
    },
    btn: {
        height: 52, width: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
        alignItems: 'center', justifyContent: 'center', marginTop: SPACING.md,
        ...SHADOWS.glow,
    },
    btnText: {
        fontSize: 16, fontFamily: 'Inter_600SemiBold', color: 'white',
    },
    btnSecondary: {
        backgroundColor: COLORS.darkCard,
    },
    btnSecondaryText: {
        fontSize: 16, fontFamily: 'Inter_600SemiBold', color: COLORS.textWhite,
    },
});
