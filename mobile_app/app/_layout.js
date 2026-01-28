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

// Custom Drawer Content - Pixel-perfect replica of web sidebar
function CustomDrawerContent(props) {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    const [user, setUser] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);

    // Reload user and sessions when drawer gains focus (fixes login state sync)
    useEffect(() => {
        const unsubscribe = props.navigation.addListener('drawerOpen', () => {
            loadUser();
        });
        return unsubscribe;
    }, [props.navigation]);

    useEffect(() => {
        loadUser();
    }, []);

    useEffect(() => {
        if (user) {
            loadSessions();
        } else {
            setSessions([]);
        }
    }, [user]);

    const loadUser = async () => {
        const userData = await getUser();
        setUser(userData);
    };

    const loadSessions = async () => {
        setLoadingSessions(true);
        try {
            const sessionList = await getChatSessions();
            setSessions(sessionList.slice(0, 5)); // Show last 5
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleLogout = async () => {
        await clearUser();
        setUser(null);
        setSessions([]);
        router.replace('/');
    };

    const handleNewChat = () => {
        router.push('/chat');
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

                {/* User Section */}
                {user && (
                    <View style={styles.userSection}>
                        <Feather name="user" size={16} color={COLORS.textLight} />
                        <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                    </View>
                )}

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
                <Pressable style={styles.footerLink} onPress={() => router.push('/about')}>
                    <Feather name="info" size={18} color={COLORS.textLight} />
                    <Text style={styles.footerLinkText}>About</Text>
                </Pressable>
                <Pressable style={styles.footerLink} onPress={() => router.push('/')}>
                    <Feather name="home" size={18} color={COLORS.textLight} />
                    <Text style={styles.footerLinkText}>Home</Text>
                </Pressable>
                {user && (
                    <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                        <Feather name="log-out" size={18} color={COLORS.errorRed} />
                        <Text style={styles.logoutBtnText}>Logout</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

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
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.darkCard,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.md,
    },
    userEmail: {
        color: COLORS.textLight,
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        flex: 1,
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
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: COLORS.whiteOverlay,
        gap: SPACING.sm,
    },
    footerLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: RADIUS.md,
    },
    footerLinkText: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textLight,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: RADIUS.md,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    logoutBtnText: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: COLORS.errorRed,
    },
});
