/**
 * LawGPT Mobile - Profile Dashboard
 * Matches web ProfileDashboard.jsx with tabs: General, Interests, AI Memory, Privacy & Data
 */

import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { ms } from '../constants/responsive';
import {
    getUser,
    clearUser,
    getUserProfile,
    updateUserProfile,
    getUserStats,
    getUserMemories,
    clearUserMemories,
    exportUserData,
    deleteUserAccount,
} from '../services/api';

/* ── Constants ────────────────────────────────────────── */

const LANGUAGES_LIST = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
    { code: 'mr', label: 'Marathi', native: 'मराठी' },
    { code: 'bn', label: 'Bengali', native: 'বাংলা' },
    { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' },
    { code: 'ur', label: 'Urdu', native: 'اردو' },
];

const TOPIC_PRESETS = [
    'Criminal Law', 'Family Law', 'Property Law', 'Consumer Rights',
    'Labour Law', 'Constitutional Law', 'Cyber Law', 'Tax Law',
    'Corporate Law', 'Environmental Law', 'Intellectual Property',
    'Human Rights',
];

const TABS = [
    { id: 'overview', label: 'General', icon: 'user' },
    { id: 'interests', label: 'Interests', icon: 'book-open' },
    { id: 'memory', label: 'AI Memory', icon: 'cpu' },
    { id: 'privacy', label: 'Privacy', icon: 'shield' },
];

/* ── Component ───────────────────────────────────────── */

export default function ProfileScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [memories, setMemories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [memoryFilter, setMemoryFilter] = useState(null);
    const [expandedMemory, setExpandedMemory] = useState(null);

    const [form, setForm] = useState({
        full_name: '',
        location: '',
        preferred_language: 'en',
        legal_interests: [],
    });

    /* ── Data Fetch ───────────────────────────────── */
    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [profileRes, statsRes, memoriesRes] = await Promise.allSettled([
                getUserProfile(),
                getUserStats(),
                getUserMemories(null, 50),
            ]);

            const p = profileRes.status === 'fulfilled' ? profileRes.value : null;
            const s = statsRes.status === 'fulfilled' ? statsRes.value : null;
            const m = memoriesRes.status === 'fulfilled' ? memoriesRes.value : null;

            if (p) {
                setProfile(p);
                setForm({
                    full_name: p.full_name || '',
                    location: p.location || '',
                    preferred_language: p.preferred_language || 'en',
                    legal_interests: p.legal_interests || [],
                });
            }
            if (s) setStats(s);
            if (m) setMemories(m);
        } catch {
            Alert.alert('Error', 'Failed to load profile data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    /* ── Helpers ──────────────────────────────────── */
    const handleFormChange = (field, value) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const toggleInterest = (topic) =>
        setForm((prev) => {
            const list = prev.legal_interests || [];
            return {
                ...prev,
                legal_interests: list.includes(topic)
                    ? list.filter((t) => t !== topic)
                    : [...list, topic],
            };
        });

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await updateUserProfile(form);
            setProfile(updated);
            setEditing(false);
            Alert.alert('Success', 'Profile updated');
        } catch (err) {
            Alert.alert('Error', err.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleClearMemories = () => {
        Alert.alert(
            'Clear AI Memories',
            'Remove all AI-generated memory and context?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await clearUserMemories();
                            setMemories([]);
                            Alert.alert('Done', 'All memories cleared');
                        } catch {
                            Alert.alert('Error', 'Failed to clear memories');
                        }
                    },
                },
            ],
        );
    };

    const handleExport = async () => {
        try {
            const data = await exportUserData();
            const json = JSON.stringify(data, null, 2);
            const filename = `LawGPT_export_${new Date().toISOString().slice(0, 10)}.json`;
            const path = `${FileSystem.cacheDirectory}${filename}`;
            await FileSystem.writeAsStringAsync(path, json);
            await Sharing.shareAsync(path, {
                mimeType: 'application/json',
                dialogTitle: 'LawGPT Data Export',
            });
        } catch (err) {
            console.error('Export failed:', err);
            Alert.alert('Error', 'Export failed');
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account?',
            'This will permanently delete your profile, all chat sessions, messages, AI memories, and account credentials. This action is irreversible.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Everything',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteUserAccount();
                            await clearUser();
                            Alert.alert('Done', 'Account deleted. Redirecting…');
                            setTimeout(() => router.replace('/'), 1000);
                        } catch {
                            Alert.alert('Error', 'Deletion failed');
                        }
                    },
                },
            ],
        );
    };

    const handleLogout = async () => {
        await clearUser();
        router.replace('/');
    };

    const openDrawer = () => navigation.openDrawer();

    const filteredMemories = memoryFilter
        ? memories.filter((m) => m.memory_type === memoryFilter)
        : memories;

    const langLabel = LANGUAGES_LIST.find(
        (l) => l.code === (profile?.preferred_language || 'en'),
    );

    /* ── Loading ──────────────────────────────────── */
    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loaderText}>Loading profile…</Text>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.loaderContainer}>
                <Feather name="alert-triangle" size={32} color={COLORS.accentOrange} />
                <Text style={styles.loaderText}>Unable to load profile. Please sign in.</Text>
                <Pressable style={styles.ctaBtn} onPress={() => router.replace('/auth')}>
                    <Text style={styles.ctaBtnText}>Sign In</Text>
                </Pressable>
            </View>
        );
    }

    /* ── Render ───────────────────────────────────── */
    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable style={styles.menuBtn} onPress={openDrawer}>
                    <Feather name="menu" size={24} color="white" />
                </Pressable>
                <Text style={styles.headerTitle}>Profile</Text>
                {editing ? (
                    <View style={styles.headerActions}>
                        <Pressable style={styles.headerSaveBtn} onPress={handleSave} disabled={saving}>
                            {saving ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Feather name="save" size={18} color="white" />
                            )}
                        </Pressable>
                        <Pressable
                            style={styles.headerCancelBtn}
                            onPress={() => {
                                setForm({
                                    full_name: profile.full_name || '',
                                    location: profile.location || '',
                                    preferred_language: profile.preferred_language || 'en',
                                    legal_interests: profile.legal_interests || [],
                                });
                                setEditing(false);
                            }}
                        >
                            <Feather name="x" size={18} color="white" />
                        </Pressable>
                    </View>
                ) : (
                    <Pressable style={styles.editBtn} onPress={() => setEditing(true)}>
                        <Feather name="edit-3" size={18} color="white" />
                    </Pressable>
                )}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Hero Card ───────────────────────────── */}
                <View style={styles.heroCard}>
                    <View style={styles.avatarRing}>
                        {profile.picture_url ? (
                            <Image
                                source={{ uri: profile.picture_url }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Feather name="user" size={30} color={COLORS.primary} />
                            </View>
                        )}
                    </View>

                    <View style={styles.providerBadge}>
                        <Text style={styles.providerText}>
                            {profile.auth_provider === 'google' ? 'Google' : 'Email'}
                        </Text>
                    </View>

                    {editing ? (
                        <TextInput
                            style={styles.nameInput}
                            value={form.full_name}
                            onChangeText={(v) => handleFormChange('full_name', v)}
                            placeholder="Your Name"
                            placeholderTextColor={COLORS.textMuted}
                            autoFocus
                        />
                    ) : (
                        <Text style={styles.profileName}>
                            {profile.full_name || 'LawGPT User'}
                        </Text>
                    )}

                    <View style={styles.metaRow}>
                        <Feather name="mail" size={13} color={COLORS.textMuted} />
                        <Text style={styles.metaText}>{profile.email}</Text>
                    </View>

                    {editing ? (
                        <View style={styles.metaInputRow}>
                            <Feather name="map-pin" size={13} color={COLORS.textMuted} />
                            <TextInput
                                style={styles.metaInput}
                                value={form.location}
                                onChangeText={(v) => handleFormChange('location', v)}
                                placeholder="City, State"
                                placeholderTextColor={COLORS.textMuted}
                            />
                        </View>
                    ) : (
                        profile.location && (
                            <View style={styles.metaRow}>
                                <Feather name="map-pin" size={13} color={COLORS.textMuted} />
                                <Text style={styles.metaText}>{profile.location}</Text>
                            </View>
                        )
                    )}

                    <View style={styles.metaRow}>
                        <Feather name="calendar" size={13} color={COLORS.textMuted} />
                        <Text style={[styles.metaText, { color: COLORS.textMuted }]}>
                            Joined {new Date(profile.created_at).toLocaleDateString('en-IN', {
                                month: 'long', year: 'numeric',
                            })}
                        </Text>
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.quickActions}>
                        <Pressable style={styles.qaBtn} onPress={() => router.push('/chat')}>
                            <Feather name="message-circle" size={15} color={COLORS.primary} />
                            <Text style={styles.qaBtnText}>New Chat</Text>
                        </Pressable>
                        <Pressable style={styles.qaBtn} onPress={() => router.push('/rights')}>
                            <Feather name="shield" size={15} color={COLORS.primary} />
                            <Text style={styles.qaBtnText}>Rights</Text>
                        </Pressable>
                        <Pressable style={styles.qaBtn} onPress={handleExport}>
                            <Feather name="download" size={15} color={COLORS.primary} />
                            <Text style={styles.qaBtnText}>Export</Text>
                        </Pressable>
                    </View>
                </View>

                {/* ── Stats ───────────────────────────────── */}
                {stats && (
                    <View style={styles.statsRow}>
                        {[
                            { icon: 'message-circle', value: stats.total_sessions, label: 'Sessions', color: COLORS.accentBlue },
                            { icon: 'bar-chart-2', value: stats.total_messages, label: 'Questions', color: COLORS.accentGreen },
                            { icon: 'cpu', value: stats.total_memories, label: 'Memories', color: COLORS.accentPurple },
                            { icon: 'globe', value: stats.languages_used?.length || 1, label: 'Languages', color: COLORS.accentOrange },
                        ].map(({ icon, value, label, color }) => (
                            <View key={label} style={styles.statCard}>
                                <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
                                    <Feather name={icon} size={17} color={color} />
                                </View>
                                <Text style={styles.statValue}>{value ?? 0}</Text>
                                <Text style={styles.statLabel}>{label}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Tabs ────────────────────────────────── */}
                <View style={styles.tabBar}>
                    {TABS.map(({ id, label, icon }) => (
                        <Pressable
                            key={id}
                            style={[styles.tab, activeTab === id && styles.tabActive]}
                            onPress={() => setActiveTab(id)}
                        >
                            <Feather name={icon} size={15} color={activeTab === id ? COLORS.primary : COLORS.textMuted} />
                            <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>
                                {label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* ── Tab Content ─────────────────────────── */}

                {/* GENERAL */}
                {activeTab === 'overview' && (
                    <View style={styles.card}>
                        <View style={styles.cardHead}>
                            <Feather name="globe" size={16} color={COLORS.primary} />
                            <Text style={styles.cardTitle}>Language Preference</Text>
                        </View>
                        <Text style={styles.cardDesc}>
                            Default language for AI responses. Auto-detect works for any language you type.
                        </Text>
                        {editing ? (
                            <View style={styles.langGrid}>
                                {LANGUAGES_LIST.map((lang) => (
                                    <Pressable
                                        key={lang.code}
                                        style={[
                                            styles.langBtn,
                                            form.preferred_language === lang.code && styles.langBtnSelected,
                                        ]}
                                        onPress={() => handleFormChange('preferred_language', lang.code)}
                                    >
                                        <Text style={[
                                            styles.langNative,
                                            form.preferred_language === lang.code && styles.langNativeSelected,
                                        ]}>
                                            {lang.native}
                                        </Text>
                                        <Text style={styles.langLabel}>{lang.label}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.langCurrent}>
                                <Feather name="globe" size={16} color={COLORS.primary} />
                                <Text style={styles.langCurrentText}>
                                    {langLabel?.native || 'English'} ({profile.preferred_language || 'en'})
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* INTERESTS */}
                {activeTab === 'interests' && (
                    <View style={styles.card}>
                        <View style={styles.cardHead}>
                            <Feather name="book-open" size={16} color={COLORS.primary} />
                            <Text style={styles.cardTitle}>Legal Interests</Text>
                        </View>
                        <Text style={styles.cardDesc}>
                            Select topics you care about — the AI will tailor suggestions accordingly.
                        </Text>
                        <View style={styles.chipGrid}>
                            {TOPIC_PRESETS.map((topic) => (
                                <Pressable
                                    key={topic}
                                    style={[
                                        styles.chip,
                                        form.legal_interests.includes(topic) && styles.chipSelected,
                                    ]}
                                    onPress={() => toggleInterest(topic)}
                                >
                                    <Feather
                                        name={form.legal_interests.includes(topic) ? 'check' : 'book-open'}
                                        size={13}
                                        color={form.legal_interests.includes(topic) ? 'white' : COLORS.textMuted}
                                    />
                                    <Text style={[
                                        styles.chipText,
                                        form.legal_interests.includes(topic) && styles.chipTextSelected,
                                    ]}>
                                        {topic}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        {form.legal_interests.length > 0 && (
                            <View style={styles.chipFooter}>
                                <Text style={styles.chipCount}>
                                    {form.legal_interests.length} selected
                                </Text>
                                <Pressable style={styles.saveSmBtn} onPress={handleSave} disabled={saving}>
                                    {saving ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <>
                                            <Feather name="save" size={13} color="white" />
                                            <Text style={styles.saveSmBtnText}>Save</Text>
                                        </>
                                    )}
                                </Pressable>
                            </View>
                        )}
                    </View>
                )}

                {/* AI MEMORY */}
                {activeTab === 'memory' && (
                    <View style={styles.card}>
                        <View style={styles.cardHead}>
                            <Feather name="cpu" size={16} color={COLORS.primary} />
                            <Text style={styles.cardTitle}>AI Memory</Text>
                            {memories.length > 0 && (
                                <Pressable style={styles.clearBtn} onPress={handleClearMemories}>
                                    <Feather name="trash-2" size={13} color={COLORS.errorRed} />
                                    <Text style={styles.clearBtnText}>Clear All</Text>
                                </Pressable>
                            )}
                        </View>
                        <Text style={styles.cardDesc}>
                            Context the AI remembers to give personalised answers.
                        </Text>

                        {/* Filters */}
                        <View style={styles.filterRow}>
                            {[
                                { value: null, label: 'All' },
                                { value: 'conversation_summary', label: 'Summaries' },
                                { value: 'user_fact', label: 'Facts' },
                            ].map((f) => (
                                <Pressable
                                    key={f.value || 'all'}
                                    style={[styles.filterBtn, memoryFilter === f.value && styles.filterBtnActive]}
                                    onPress={() => setMemoryFilter(f.value)}
                                >
                                    <Text style={[
                                        styles.filterText,
                                        memoryFilter === f.value && styles.filterTextActive,
                                    ]}>
                                        {f.label}
                                    </Text>
                                </Pressable>
                            ))}
                            <Text style={styles.filterCount}>
                                {filteredMemories.length} item{filteredMemories.length !== 1 ? 's' : ''}
                            </Text>
                        </View>

                        {filteredMemories.length === 0 ? (
                            <View style={styles.emptyMemory}>
                                <Feather name="cpu" size={36} color={COLORS.textMuted} />
                                <Text style={styles.emptyMemoryText}>
                                    No memories yet. Start chatting to build AI context!
                                </Text>
                                <Pressable style={styles.ctaBtn} onPress={() => router.push('/chat')}>
                                    <Feather name="message-circle" size={14} color="white" />
                                    <Text style={styles.ctaBtnText}>Start Chat</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <View style={styles.memList}>
                                {filteredMemories.map((m) => (
                                    <Pressable
                                        key={m.id}
                                        style={styles.memItem}
                                        onPress={() => setExpandedMemory(expandedMemory === m.id ? null : m.id)}
                                    >
                                        <View style={styles.memHeader}>
                                            <View style={[
                                                styles.memBadge,
                                                { backgroundColor: m.memory_type === 'conversation_summary'
                                                    ? COLORS.primaryTransparent
                                                    : `${COLORS.accentPurple}15` },
                                            ]}>
                                                <Text style={[
                                                    styles.memBadgeText,
                                                    { color: m.memory_type === 'conversation_summary'
                                                        ? COLORS.primary
                                                        : COLORS.accentPurple },
                                                ]}>
                                                    {m.memory_type === 'conversation_summary' ? 'Summary' : 'Fact'}
                                                </Text>
                                            </View>
                                            <View style={styles.memDateRow}>
                                                <Feather name="clock" size={11} color={COLORS.textMuted} />
                                                <Text style={styles.memDate}>
                                                    {new Date(m.created_at).toLocaleDateString('en-IN', {
                                                        day: 'numeric', month: 'short', year: 'numeric',
                                                    })}
                                                </Text>
                                            </View>
                                            <Feather
                                                name={expandedMemory === m.id ? 'chevron-up' : 'chevron-down'}
                                                size={13}
                                                color={COLORS.textMuted}
                                            />
                                        </View>
                                        <Text style={styles.memText} numberOfLines={expandedMemory === m.id ? undefined : 3}>
                                            {m.content}
                                        </Text>
                                        <View style={styles.memMeta}>
                                            <Feather name="star" size={11} color={COLORS.accentOrange} />
                                            <Text style={styles.memMetaText}>
                                                {((m.importance_score ?? 0) * 100).toFixed(0)}% relevance
                                            </Text>
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* PRIVACY */}
                {activeTab === 'privacy' && (
                    <>
                        <View style={styles.card}>
                            <View style={styles.cardHead}>
                                <Feather name="shield" size={16} color={COLORS.primary} />
                                <Text style={styles.cardTitle}>Privacy & Data Control</Text>
                            </View>
                            <Text style={styles.cardDesc}>
                                Protected under DPDPA 2023 and GDPR. Full control over your information.
                            </Text>

                            {/* Export */}
                            <View style={styles.privRow}>
                                <View style={[styles.privIcon, { backgroundColor: `${COLORS.accentBlue}15` }]}>
                                    <Feather name="download" size={17} color={COLORS.accentBlue} />
                                </View>
                                <View style={styles.privInfo}>
                                    <Text style={styles.privTitle}>Export Your Data</Text>
                                    <Text style={styles.privDesc}>Download profile, chats, and memories in JSON.</Text>
                                </View>
                                <Pressable style={styles.privBtn} onPress={handleExport}>
                                    <Feather name="download" size={13} color="white" />
                                    <Text style={styles.privBtnText}>Export</Text>
                                </Pressable>
                            </View>

                            {/* Clear Memories */}
                            <View style={styles.privRow}>
                                <View style={[styles.privIcon, { backgroundColor: `${COLORS.accentOrange}15` }]}>
                                    <Feather name="cpu" size={17} color={COLORS.accentOrange} />
                                </View>
                                <View style={styles.privInfo}>
                                    <Text style={styles.privTitle}>Clear AI Memories</Text>
                                    <Text style={styles.privDesc}>Remove all AI-generated memory and context.</Text>
                                </View>
                                <Pressable style={[styles.privBtn, { backgroundColor: COLORS.accentOrange }]} onPress={handleClearMemories}>
                                    <Feather name="trash-2" size={13} color="white" />
                                    <Text style={styles.privBtnText}>Clear</Text>
                                </Pressable>
                            </View>

                            {/* Delete Account */}
                            <View style={[styles.privRow, styles.privRowDanger]}>
                                <View style={[styles.privIcon, { backgroundColor: `${COLORS.errorRed}15` }]}>
                                    <Feather name="alert-triangle" size={17} color={COLORS.errorRed} />
                                </View>
                                <View style={styles.privInfo}>
                                    <Text style={styles.privTitle}>Delete Account</Text>
                                    <Text style={styles.privDesc}>Permanently delete account and all data.</Text>
                                </View>
                                <Pressable style={[styles.privBtn, { backgroundColor: COLORS.errorRed }]} onPress={handleDeleteAccount}>
                                    <Feather name="trash-2" size={13} color="white" />
                                    <Text style={styles.privBtnText}>Delete</Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Compliance */}
                        <View style={[styles.card, { marginTop: SPACING.md }]}>
                            <View style={styles.cardHead}>
                                <MaterialCommunityIcons name="scale-balance" size={16} color={COLORS.primary} />
                                <Text style={styles.cardTitle}>Compliance</Text>
                            </View>
                            <View style={styles.complianceGrid}>
                                {[
                                    { icon: 'shield', title: 'DPDPA 2023', desc: 'Digital Personal Data Protection Act' },
                                    { icon: 'globe', title: 'GDPR', desc: 'General Data Protection Regulation' },
                                    { icon: 'eye', title: 'Right to Access', desc: 'Export all your data anytime' },
                                    { icon: 'trash-2', title: 'Right to Erasure', desc: 'Delete your data permanently' },
                                ].map(({ icon, title, desc }) => (
                                    <View key={title} style={styles.complianceItem}>
                                        <Feather name={icon} size={15} color={COLORS.primary} />
                                        <View style={styles.complianceText}>
                                            <Text style={styles.complianceTitle}>{title}</Text>
                                            <Text style={styles.complianceDesc}>{desc}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </>
                )}

                {/* Logout Button */}
                <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                    <Feather name="log-out" size={16} color={COLORS.errorRed} />
                    <Text style={styles.logoutBtnText}>Logout</Text>
                </Pressable>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.lightBg },

    loaderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.lightBg,
        gap: SPACING.md,
    },
    loaderText: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
        backgroundColor: COLORS.darkSurface,
    },
    menuBtn: { padding: SPACING.sm },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Inter_600SemiBold',
        color: 'white',
    },
    headerActions: { flexDirection: 'row', gap: SPACING.sm },
    headerSaveBtn: {
        padding: SPACING.sm,
        backgroundColor: COLORS.accentGreen,
        borderRadius: RADIUS.md,
    },
    headerCancelBtn: {
        padding: SPACING.sm,
        backgroundColor: `${COLORS.errorRed}30`,
        borderRadius: RADIUS.md,
    },
    editBtn: { padding: SPACING.sm },

    scrollView: { flex: 1 },
    scrollContent: { padding: SPACING.lg },

    // Hero Card
    heroCard: {
        backgroundColor: 'white',
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center',
        ...SHADOWS.card,
    },
    avatarRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: COLORS.primary,
        padding: 3,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    avatarFallback: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
        backgroundColor: COLORS.primaryTransparent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
    },
    providerBadge: {
        backgroundColor: COLORS.primaryTransparent,
        paddingHorizontal: 12,
        paddingVertical: 3,
        borderRadius: RADIUS.full,
        marginBottom: SPACING.sm,
    },
    providerText: {
        fontSize: 11,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.primary,
    },
    profileName: {
        fontSize: 22,
        fontFamily: 'Inter_700Bold',
        color: COLORS.textDark,
        marginBottom: SPACING.xs,
    },
    nameInput: {
        fontSize: 22,
        fontFamily: 'Inter_700Bold',
        color: COLORS.textDark,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.primary,
        paddingVertical: 4,
        marginBottom: SPACING.xs,
        textAlign: 'center',
        minWidth: 200,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: 4,
    },
    metaText: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
    },
    metaInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: 4,
    },
    metaInput: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderColor,
        paddingVertical: 2,
        minWidth: 150,
    },
    quickActions: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.lg,
        width: '100%',
    },
    qaBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        paddingVertical: 10,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primaryTransparent,
    },
    qaBtnText: {
        fontSize: 12,
        fontFamily: 'Inter_500Medium',
        color: COLORS.primary,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.lg,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        ...SHADOWS.sm,
    },
    statIcon: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xs,
    },
    statValue: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        color: COLORS.textDark,
    },
    statLabel: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        marginTop: 2,
    },

    // Tabs
    tabBar: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: RADIUS.lg,
        marginTop: SPACING.lg,
        ...SHADOWS.sm,
        overflow: 'hidden',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: COLORS.primary },
    tabText: {
        fontSize: 12,
        fontFamily: 'Inter_500Medium',
        color: COLORS.textMuted,
    },
    tabTextActive: { color: COLORS.primary, fontFamily: 'Inter_600SemiBold' },

    // Card
    card: {
        backgroundColor: 'white',
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginTop: SPACING.lg,
        ...SHADOWS.card,
    },
    cardHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.xs,
    },
    cardTitle: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
    },
    cardDesc: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        lineHeight: 20,
        marginBottom: SPACING.md,
    },

    // Language
    langGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    langBtn: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.lightBg,
        borderWidth: 1,
        borderColor: COLORS.borderColor,
        alignItems: 'center',
    },
    langBtnSelected: {
        backgroundColor: COLORS.primaryTransparent,
        borderColor: COLORS.primary,
    },
    langNative: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
    },
    langNativeSelected: { color: COLORS.primary },
    langLabel: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        marginTop: 2,
    },
    langCurrent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        padding: SPACING.md,
        backgroundColor: COLORS.lightBg,
        borderRadius: RADIUS.md,
    },
    langCurrentText: {
        fontSize: 15,
        fontFamily: 'Inter_500Medium',
        color: COLORS.textDark,
    },

    // Chips
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.lightBg,
        borderWidth: 1,
        borderColor: COLORS.borderColor,
    },
    chipSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipText: {
        fontSize: 13,
        fontFamily: 'Inter_500Medium',
        color: COLORS.textDark,
    },
    chipTextSelected: { color: 'white' },
    chipFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderColor,
    },
    chipCount: {
        fontSize: 13,
        fontFamily: 'Inter_500Medium',
        color: COLORS.textMuted,
    },
    saveSmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
    },
    saveSmBtnText: {
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
        color: 'white',
    },

    // Memory
    clearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.errorRed,
    },
    clearBtnText: {
        fontSize: 12,
        fontFamily: 'Inter_500Medium',
        color: COLORS.errorRed,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    filterBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.lightBg,
    },
    filterBtnActive: { backgroundColor: COLORS.primaryTransparent },
    filterText: {
        fontSize: 13,
        fontFamily: 'Inter_500Medium',
        color: COLORS.textMuted,
    },
    filterTextActive: { color: COLORS.primary },
    filterCount: {
        flex: 1,
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        textAlign: 'right',
    },
    emptyMemory: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        gap: SPACING.sm,
    },
    emptyMemoryText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    memList: { gap: SPACING.sm },
    memItem: {
        backgroundColor: COLORS.lightBg,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
    },
    memHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.xs,
    },
    memBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
    },
    memBadgeText: {
        fontSize: 11,
        fontFamily: 'Inter_600SemiBold',
    },
    memDateRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    memDate: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
    },
    memText: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
        lineHeight: 20,
    },
    memMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: SPACING.xs,
    },
    memMetaText: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
    },

    // Privacy
    privRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderColor,
    },
    privRowDanger: { borderBottomWidth: 0 },
    privIcon: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    privInfo: { flex: 1 },
    privTitle: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
    },
    privDesc: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        marginTop: 2,
    },
    privBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: RADIUS.md,
    },
    privBtnText: {
        fontSize: 12,
        fontFamily: 'Inter_600SemiBold',
        color: 'white',
    },

    // Compliance
    complianceGrid: { gap: SPACING.md },
    complianceItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
    },
    complianceText: { flex: 1 },
    complianceTitle: {
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
    },
    complianceDesc: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        marginTop: 2,
    },

    // CTA
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.lg,
        paddingVertical: 10,
        borderRadius: RADIUS.md,
    },
    ctaBtnText: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        color: 'white',
    },

    // Logout
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.xl,
        paddingVertical: 14,
        borderRadius: RADIUS.md,
        backgroundColor: `${COLORS.errorRed}10`,
        borderWidth: 1,
        borderColor: `${COLORS.errorRed}30`,
    },
    logoutBtnText: {
        fontSize: 15,
        fontFamily: 'Inter_500Medium',
        color: COLORS.errorRed,
    },
});
