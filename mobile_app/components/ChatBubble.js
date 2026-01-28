/**
 * NyayaSahay Mobile - ChatBubble Component
 * Pixel-perfect replica of web ChatBubble.jsx
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function ChatBubble({
    role,
    content,
    sources = [],
    isFallback = false,
    latency = null,
    timestamp = null,
}) {
    const getConfidence = () => {
        if (isFallback) return { level: 'low', value: 0, text: 'No match found' };
        if (sources.length >= 3) return { level: 'high', value: 85, text: 'High confidence' };
        if (sources.length >= 1) return { level: 'medium', value: 60, text: 'Medium confidence' };
        return { level: 'low', value: 30, text: 'Low confidence' };
    };

    const confidence = role === 'bot' ? getConfidence() : null;

    const getConfidenceColor = (level) => {
        switch (level) {
            case 'high': return COLORS.accentGreen;
            case 'medium': return COLORS.accentOrange;
            default: return COLORS.textMuted;
        }
    };

    return (
        <View style={[styles.messageRow, role === 'user' && styles.messageRowUser]}>
            {/* Avatar for bot */}
            {role === 'bot' && (
                <View style={styles.avatarBot}>
                    <MaterialCommunityIcons name="scale-balance" size={18} color="white" />
                </View>
            )}

            <View style={[
                styles.bubble,
                role === 'user' ? styles.bubbleUser : styles.bubbleBot,
                isFallback && styles.bubbleFallback,
            ]}>
                {/* Fallback Notice */}
                {isFallback && role === 'bot' && (
                    <View style={styles.fallbackBanner}>
                        <Feather name="info" size={14} color={COLORS.accentOrange} />
                        <Text style={styles.fallbackText}>Information not found in legal database</Text>
                    </View>
                )}

                {/* Content */}
                <Text style={[
                    styles.messageText,
                    role === 'user' && styles.messageTextUser,
                ]}>
                    {content}
                </Text>

                {/* Legal References */}
                {role === 'bot' && sources && sources.length > 0 && !isFallback && (
                    <View style={styles.sourcesSection}>
                        <View style={styles.sourcesTitle}>
                            <Feather name="book-open" size={12} color={COLORS.primary} />
                            <Text style={styles.sourcesTitleText}>Legal References</Text>
                        </View>
                        <View style={styles.sourcesList}>
                            {sources.slice(0, 3).map((source, index) => (
                                <View key={index} style={styles.sourceTag}>
                                    <Text style={styles.sourceAct}>{source.act}</Text>
                                    {source.section && (
                                        <Text style={styles.sourceSection}>{source.section}</Text>
                                    )}
                                </View>
                            ))}
                            {sources.length > 3 && (
                                <Text style={styles.sourcesMore}>+{sources.length - 3} more</Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Confidence Bar */}
                {role === 'bot' && confidence && (
                    <View style={styles.confidenceSection}>
                        <Text style={styles.confidenceLabel}>Confidence:</Text>
                        <View style={styles.confidenceBarWrapper}>
                            <View
                                style={[
                                    styles.confidenceBarFill,
                                    {
                                        width: `${confidence.value}%`,
                                        backgroundColor: getConfidenceColor(confidence.level),
                                    }
                                ]}
                            />
                        </View>
                        <Text style={[
                            styles.confidenceText,
                            { color: getConfidenceColor(confidence.level) }
                        ]}>
                            {confidence.text}
                        </Text>
                    </View>
                )}

                {/* Timestamp */}
                {timestamp && (
                    <Text style={[
                        styles.timestamp,
                        role === 'user' && styles.timestampUser,
                    ]}>
                        {timestamp}
                        {latency && role === 'bot' && ` • ${latency}ms`}
                    </Text>
                )}
            </View>

            {/* Avatar for user */}
            {role === 'user' && (
                <View style={styles.avatarUser}>
                    <Feather name="user" size={18} color="white" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    messageRowUser: {
        flexDirection: 'row-reverse',
    },
    avatarBot: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarUser: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.accentBlue,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bubble: {
        flex: 1,
        maxWidth: '80%',
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
    },
    bubbleBot: {
        backgroundColor: 'white',
        borderBottomLeftRadius: RADIUS.sm,
        ...SHADOWS.sm,
    },
    bubbleUser: {
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: RADIUS.sm,
    },
    bubbleFallback: {
        borderWidth: 1,
        borderColor: COLORS.accentOrange,
        borderStyle: 'dashed',
    },
    fallbackBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        backgroundColor: `${COLORS.accentOrange}15`,
        borderRadius: RADIUS.sm,
        marginBottom: SPACING.sm,
    },
    fallbackText: {
        fontSize: 12,
        fontFamily: 'Inter_500Medium',
        color: COLORS.accentOrange,
    },
    messageText: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
        lineHeight: 22,
    },
    messageTextUser: {
        color: 'white',
    },
    sourcesSection: {
        marginTop: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderColor,
    },
    sourcesTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginBottom: SPACING.sm,
    },
    sourcesTitleText: {
        fontSize: 12,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.primary,
    },
    sourcesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
    },
    sourceTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primaryTransparent,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
    },
    sourceAct: {
        fontSize: 11,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.primary,
    },
    sourceSection: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
        color: COLORS.primary,
    },
    sourcesMore: {
        fontSize: 11,
        fontFamily: 'Inter_500Medium',
        color: COLORS.textMuted,
        alignSelf: 'center',
    },
    confidenceSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginTop: SPACING.md,
    },
    confidenceLabel: {
        fontSize: 12,
        fontFamily: 'Inter_500Medium',
        color: COLORS.textMuted,
    },
    confidenceBarWrapper: {
        flex: 1,
        height: 6,
        backgroundColor: COLORS.borderColor,
        borderRadius: 3,
        overflow: 'hidden',
    },
    confidenceBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    confidenceText: {
        fontSize: 11,
        fontFamily: 'Inter_600SemiBold',
    },
    timestamp: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        marginTop: SPACING.sm,
    },
    timestampUser: {
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'right',
    },
});
