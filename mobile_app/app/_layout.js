/**
 * NyayaSahay Mobile - Root Layout
 * Drawer navigation matching web sidebar exactly
 */

import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { getUser, clearUser, getChatSessions } from '../services/api';

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

/**
 * CustomDrawerContent - Drawer sidebar replicating web app navigation.
 *
 * Viva Explanation:
 * - Manages auth state (login/logout) and displays user info
 * - Shows recent chat sessions and quick-question shortcuts
 * - Clears onboarding-seen flag on logout for fresh welcome experience
 */
function CustomDrawerContent(props) {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    const [user, setUser] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);

    // Reload user and sessions when drawer gains focus (fixes login state sync)
    useEffect(() => {
        const unsubscribeDrawer = props.navigation.addListener('drawerOpen', () => {
            loadUserAndSessions();
        });
        // Also reload on screen focus (when navigating back from auth)
        const unsubscribeFocus = props.navigation.addListener('state', () => {
            loadUserAndSessions();
        });
        return () => {
            unsubscribeDrawer();
            unsubscribeFocus();
        };
    }, [props.navigation]);

    useEffect(() => {
        loadUserAndSessions();
    }, []);

    const loadUserAndSessions = async () => {
        const userData = await getUser();
        setUser(userData);
        if (userData) {
            loadSessions();
        } else {
            setSessions([]);
        }
    };

    const loadSessions = async () => {
        setLoadingSessions(true);
        try {
            const sessionList = await getChatSessions();
            setSessions(sessionList.slice(0, 5)); // Show last 5
        } catch (_e) {
            // Silent fail - sessions will remain empty
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleLogout = async () => {
        await clearUser();
        // Clear onboarding flag so user sees welcome on next visit
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.removeItem('nyayasahay_onboarding_seen');
        } catch (_e) { /* non-critical */ }
        setUser(null);
        setSessions([]);
        router.replace('/');
    };

    const handleNewChat = () => {
        router.replace('/chat');
        props.navigation.closeDrawer();
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        if (date.toDateString() === today.toDateString()) return 'Today';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const QUICK_QUESTIONS = [
        "What is Section 302 of IPC?",
        "What are my rights if arrested?",
        "Explain Article 21 of Constitution",
        "What is the punishment for theft?",
    ];

    return (
        <View style={[styles.drawerContainer, { paddingTop: insets.top }]}>
            <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerScroll}>
                {/* Logo Header */}
                <View style={styles.drawerHeader}>
                    <Pressable style={styles.logoContainer} onPress={() => router.push('/')}>
                        <View style={styles.logoIcon}>
                            <MaterialCommunityIcons name="scale-balance" size={22} color="white" />
                        </View>
                        <Text style={styles.logoText}>NyayaSahay</Text>
                    </Pressable>
                </View>

                {/* New Chat Button */}
                <Pressable style={styles.newChatBtn} onPress={handleNewChat}>
                    <Ionicons name="add" size={20} color="white" />
                    <Text style={styles.newChatBtnText}>New Chat</Text>
                </Pressable>


                {/* Chat History (if logged in) */}
                {user && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="clock" size={14} color={COLORS.textLight} />
                            <Text style={styles.sectionTitle}>Chat History</Text>
                        </View>
                        {loadingSessions ? (
                            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 10 }} />
                        ) : sessions.length > 0 ? (
                            <View style={styles.sessionList}>
                                {sessions.map((session) => (
                                    <Pressable
                                        key={session.id}
                                        style={styles.sessionItem}
                                        onPress={() => {
                                            router.push(`/chat?session=${session.id}`);
                                            props.navigation.closeDrawer();
                                        }}
                                    >
                                        <Ionicons name="chatbubble-outline" size={14} color={COLORS.textLight} />
                                        <View style={styles.sessionInfo}>
                                            <Text style={styles.sessionTitle} numberOfLines={1}>{session.title}</Text>
                                            <Text style={styles.sessionDate}>{formatDate(session.created_at)}</Text>
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.noSessions}>No chat history yet</Text>
                        )}
                    </View>
                )}

                {/* Quick Questions (if not logged in) */}
                {!user && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Quick Questions</Text>
                        <View style={styles.quickQuestions}>
                            {QUICK_QUESTIONS.map((q, i) => (
                                <Pressable
                                    key={i}
                                    style={styles.quickQuestionBtn}
                                    onPress={() => {
                                        router.push(`/chat?query=${encodeURIComponent(q)}`);
                                        props.navigation.closeDrawer();
                                    }}
                                >
                                    <Ionicons name="chatbubble-outline" size={14} color={COLORS.textLight} />
                                    <Text style={styles.quickQuestionText} numberOfLines={1}>{q}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}
            </DrawerContentScrollView>

            {/* Footer */}
            <View style={[styles.drawerFooter, { paddingBottom: insets.bottom + SPACING.md }]}>
                {/* Footer Links */}
                <View style={styles.footerLinksContainer}>
                    <View style={styles.footerRow}>
                        <Pressable style={styles.footerLink} onPress={() => router.push('/about')}>
                            <Feather name="info" size={14} color={COLORS.textMuted} />
                            <Text style={styles.footerLinkText}>About</Text>
                        </Pressable>
                        <Pressable style={styles.footerLink} onPress={() => router.push('/faq')}>
                            <Feather name="help-circle" size={14} color={COLORS.textMuted} />
                            <Text style={styles.footerLinkText}>FAQ</Text>
                        </Pressable>
                        <Pressable style={styles.footerLink} onPress={() => router.push('/contact')}>
                            <Feather name="mail" size={14} color={COLORS.textMuted} />
                            <Text style={styles.footerLinkText}>Contact</Text>
                        </Pressable>
                    </View>
                    <View style={styles.footerRow}>
                        <Pressable style={styles.footerLink} onPress={() => router.push('/privacy')}>
                            <Feather name="shield" size={14} color={COLORS.textMuted} />
                            <Text style={styles.footerLinkText}>Privacy</Text>
                        </Pressable>
                        <Pressable style={styles.footerLink} onPress={() => router.push('/terms')}>
                            <Feather name="file-text" size={14} color={COLORS.textMuted} />
                            <Text style={styles.footerLinkText}>Terms</Text>
                        </Pressable>
                        <Pressable style={styles.footerLink} onPress={() => router.push('/disclaimer')}>
                            <Feather name="alert-circle" size={14} color={COLORS.textMuted} />
                            <Text style={styles.footerLinkText}>Disclaimer</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Unified Account Section */}
                {user ? (
                    <View style={styles.accountCard}>
                        <View style={styles.accountInfo}>
                            <View style={styles.avatarContainer}>
                                <Feather name="user" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.accountDetails}>
                                <Text style={styles.accountEmail} numberOfLines={1}>{user.email}</Text>
                                <Text style={styles.accountLabel}>Logged in</Text>
                            </View>
                        </View>
                        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                            <Feather name="log-out" size={16} color={COLORS.errorRed} />
                            <Text style={styles.logoutBtnText}>Logout</Text>
                        </Pressable>
                    </View>
                ) : (
                    <Pressable style={styles.loginBtn} onPress={() => { router.push('/auth'); props.navigation.closeDrawer(); }}>
                        <View style={styles.loginIconContainer}>
                            <Feather name="user" size={18} color={COLORS.primary} />
                        </View>
                        <Text style={styles.loginBtnText}>Login / Register</Text>
                        <Feather name="chevron-right" size={18} color={COLORS.primary} />
                    </Pressable>
                )}
            </View>
        </View >
    );
}

/**
 * RootLayout - Root drawer navigator.
 *
 * Viva Explanation:
 * - Loads Inter fonts and hides splash once ready
 * - Configures the swipeable drawer with all app screens
 * - Initial route is index (onboarding), which auto-redirects logged-in users
 */
export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    const onLayoutRootView = useCallback(async () => {
        if (fontsLoaded) {
            await SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
            <Drawer
                drawerContent={(props) => <CustomDrawerContent {...props} />}
                screenOptions={{
                    headerShown: false,
                    drawerStyle: {
                        backgroundColor: COLORS.darkSurface,
                        width: 280,
                    },
                    drawerType: 'front',
                    swipeEnabled: true,
                }}
            >
                <Drawer.Screen name="index" options={{ drawerItemStyle: { display: 'none' } }} />
                <Drawer.Screen name="chat" options={{ drawerItemStyle: { display: 'none' } }} />
                <Drawer.Screen name="about" options={{ drawerItemStyle: { display: 'none' } }} />
                <Drawer.Screen name="auth" options={{ drawerItemStyle: { display: 'none' } }} />

                <Drawer.Screen name="faq" options={{ drawerItemStyle: { display: 'none' } }} />
                <Drawer.Screen name="privacy" options={{ drawerItemStyle: { display: 'none' } }} />
                <Drawer.Screen name="terms" options={{ drawerItemStyle: { display: 'none' } }} />
                <Drawer.Screen name="disclaimer" options={{ drawerItemStyle: { display: 'none' } }} />
                <Drawer.Screen name="contact" options={{ drawerItemStyle: { display: 'none' } }} />
            </Drawer>
        </View>
    );
}

const styles = StyleSheet.create({
    drawerContainer: {
        flex: 1,
        backgroundColor: COLORS.darkSurface,
    },
    drawerScroll: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
    },
    drawerHeader: {
        marginBottom: SPACING.xl,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    logoIcon: {
        width: 40,
        height: 40,
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        color: COLORS.textWhite,
    },
    newChatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.xl,
    },
    newChatBtnText: {
        color: COLORS.textWhite,
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
    },

    section: {
        marginBottom: SPACING.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textLight,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sessionList: {
        gap: SPACING.xs,
    },
    sessionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.darkCard,
        padding: 10,
        borderRadius: RADIUS.md,
    },
    sessionInfo: {
        flex: 1,
    },
    sessionTitle: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textLight,
    },
    sessionDate: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        marginTop: 2,
    },
    noSessions: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        textAlign: 'center',
        paddingVertical: SPACING.md,
    },
    quickQuestions: {
        gap: SPACING.sm,
    },
    quickQuestionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.darkCard,
        padding: 12,
        borderRadius: RADIUS.md,
    },
    quickQuestionText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textLight,
        flex: 1,
    },
    drawerFooter: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.whiteOverlay,
        gap: SPACING.md,
    },
    footerLinksContainer: {
        gap: SPACING.xs,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    footerLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 6,
    },
    footerLinkText: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
    },
    accountCard: {
        backgroundColor: COLORS.darkCard,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        gap: SPACING.md,
    },
    accountInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    avatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primaryTransparent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    accountDetails: {
        flex: 1,
    },
    accountEmail: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        color: COLORS.textWhite,
    },
    accountLabel: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        marginTop: 2,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: 10,
        borderRadius: RADIUS.md,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    logoutBtnText: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        color: COLORS.errorRed,
    },
    loginBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.darkCard,
    },
    loginIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryTransparent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginBtnText: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Inter_500Medium',
        color: COLORS.textWhite,
    },
});
