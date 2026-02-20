import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { getGuides } from '../../services/db';
import { syncGuides } from '../../services/sync';

/**
 * Legal Guides List Screen
 * 
 * Viva Explanation:
 * - Displays list of offline-available legal resources
 * - Implements dual-strategy loading: fast local cache then background sync
 * - Supports pull-to-refresh for manual updates
 */
export default function GuidesList() {
    const router = useRouter();
    const [guides, setGuides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            // 1. Load from local DB first (fast)
            const localGuides = await getGuides();
            if (localGuides && localGuides.length > 0) {
                setGuides(localGuides);
                if (loading) setLoading(false); // Show content immediately
            }

            // 2. Sync in background (or foreground if refreshing)
            const syncedGuides = await syncGuides();
            if (syncedGuides) {
                setGuides(syncedGuides);
            }
        } catch (error) {
            console.error('Error loading guides:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    const renderItem = ({ item }) => (
        <Pressable
            style={styles.card}
            onPress={() => router.push(`/guides/${item.id}`)}
        >
            <View style={styles.cardIcon}>
                <Feather name="book-open" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardCategory}>{item.category}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
        </Pressable>
    );

    return (
        <View style={styles.container}>
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={guides}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No guides available offline.</Text>
                            <Text style={styles.emptySubText}>Pull down to sync.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.lightBg },
    list: { padding: SPACING.md },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.lightCard,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.sm,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryTransparent,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    cardContent: { flex: 1 },
    cardTitle: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
    },
    cardCategory: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        marginTop: 2,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: 'Inter_500Medium',
        color: COLORS.textMuted,
    },
    emptySubText: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 8,
    }
});
