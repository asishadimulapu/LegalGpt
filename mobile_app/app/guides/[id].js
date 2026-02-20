import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { COLORS, SPACING } from '../../constants/theme';
import { getGuideById } from '../../services/db';

/**
 * Guide Detail Screen
 * 
 * Viva Explanation:
 * - Renders specific legal guide content
 * - Uses local DB fetch for offline instant access
 * - Displays metadata (Category, Updates) consistently
 */

/**
 * Safely format a date string; returns null if the value cannot be parsed.
 */
function formatDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString();
}

export default function GuideDetail() {
    const { id } = useLocalSearchParams();
    const [guide, setGuide] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const loadGuide = async () => {
            if (!id) {
                if (mounted) {
                    setGuide(null);
                    setLoading(false);
                }
                return;
            }
            try {
                const data = await getGuideById(id);
                if (mounted) setGuide(data);
            } catch (err) {
                console.error('Failed to load guide:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadGuide();

        return () => { mounted = false; };
    }, [id]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!guide) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Guide not found.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>{guide.title}</Text>
            <View style={styles.metaContainer}>
                <Text style={styles.category}>{guide.category}</Text>
                {formatDate(guide.last_updated) && (
                    <Text style={styles.date}>
                        Updated: {formatDate(guide.last_updated)}
                    </Text>
                )}
            </View>
            <View style={styles.divider} />
            <Text style={styles.body}>{guide.content}</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.lightBg },
    content: { padding: SPACING.lg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
        color: COLORS.textDark,
        marginBottom: SPACING.xs,
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    category: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        color: COLORS.primary,
        backgroundColor: COLORS.primaryTransparent,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    date: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.borderColor,
        marginBottom: SPACING.lg,
    },
    body: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
        lineHeight: 24,
    },
    errorText: {
        fontSize: 16,
        fontFamily: 'Inter_500Medium',
        color: COLORS.errorRed,
    }
});
