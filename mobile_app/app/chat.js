/**
 * NyayaSahay Mobile - Chat Screen
 * Pixel-perfect replica of web Chat.jsx
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useDrawerStatus } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { sendChatMessage, checkHealth, getUser, clearUser, uploadFile, analyzeDocument, getChatSession } from '../services/api';
import ChatBubble from '../components/ChatBubble';

const EXAMPLE_QUERIES = [
    "What is Section 302 of IPC?",
    "What are my rights if arrested?",
    "Explain Article 21 of Constitution",
    "What is the punishment for theft?",
];

export default function ChatScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const scrollViewRef = useRef(null);
    const inputRef = useRef(null);

    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isBackendReady, setIsBackendReady] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [user, setUser] = useState(null);
    
    // File upload state
    const [uploadedFile, setUploadedFile] = useState(null);
    const [fileContent, setFileContent] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    // Check backend health on mount
    useEffect(() => {
        checkBackendHealth();
    }, []);

    // Reload user when screen gains focus (fixes login state after auth)
    useFocusEffect(
        useCallback(() => {
            loadUser();
        }, [])
    );

    // Handle session loading from params (clicking chat history)
    useEffect(() => {
        if (params.session && isBackendReady) {
            loadSession(params.session);
        } else if (!params.session) {
            // New chat - clear everything
            setMessages([]);
            setSessionId(null);
            setUploadedFile(null);
            setFileContent(null);
            setUploadError(null);
        }
    }, [params.session, isBackendReady]);

    // Handle query from params (quick questions)
    useEffect(() => {
        if (params.query && isBackendReady && !params.session) {
            setInputValue(decodeURIComponent(params.query));
        }
    }, [params.query, isBackendReady]);

    const loadSession = async (sessionIdToLoad) => {
        try {
            setIsLoading(true);
            const sessionData = await getChatSession(sessionIdToLoad);
            setSessionId(sessionIdToLoad);
            
            // Convert session messages to display format
            if (sessionData.messages && sessionData.messages.length > 0) {
                const formattedMessages = sessionData.messages.map((msg, index) => ({
                    id: msg.id || index,
                    role: msg.role === 'user' ? 'user' : 'bot',
                    content: msg.content,
                    timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    sources: msg.sources || [],
                }));
                setMessages(formattedMessages);
            }
        } catch (err) {
            // Failed to load session - start fresh
            setMessages([]);
            setSessionId(null);
        } finally {
            setIsLoading(false);
        }
    };

    const checkBackendHealth = async () => {
        try {
            await checkHealth();
            setIsBackendReady(true);
        } catch (err) {
            setIsBackendReady(false);
        }
    };

    const loadUser = async () => {
        const userData = await getUser();
        setUser(userData);
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const getTimestamp = () => {
        return new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleSend = async () => {
        const query = inputValue.trim();
        if (!query || isLoading) return;

        setInputValue('');

        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: query,
            timestamp: getTimestamp(),
            hasFile: !!uploadedFile,
            fileName: uploadedFile?.name,
        };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        scrollToBottom();

        try {
            let response;

            if (fileContent) {
                // Use document analysis for file-based queries
                response = await analyzeDocument(fileContent, query, sessionId, uploadedFile?.name);
            } else {
                response = await sendChatMessage(query, sessionId);
            }

            if (response.session_id) {
                setSessionId(response.session_id);
            }

            const botMessage = {
                id: Date.now() + 1,
                role: 'bot',
                content: response.answer,
                sources: response.sources || [],
                isFallback: response.is_fallback || false,
                latency: response.latency_ms,
                timestamp: getTimestamp(),
                basedOnFile: !!fileContent,
            };
            setMessages(prev => [...prev, botMessage]);

            // Clear file after successful upload-based query
            if (fileContent) {
                setUploadedFile(null);
                setFileContent(null);
            }
        } catch (err) {
            const errorMessage = {
                id: Date.now() + 1,
                role: 'bot',
                content: `I apologize, but I encountered an error: ${err.message}. Please try again.`,
                isFallback: true,
                timestamp: getTimestamp(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            scrollToBottom();
        }
    };

    const handleExampleClick = (query) => {
        setInputValue(query);
        inputRef.current?.focus();
    };

    const handleNewChat = () => {
        // Clear all state
        setMessages([]);
        setSessionId(null);
        setUploadedFile(null);
        setFileContent(null);
        setUploadError(null);
        setInputValue('');
        // Navigate to chat without session param to trigger reset
        router.replace('/chat');
    };

    // Handle file picking
    const ALLOWED_FILE_TYPES = ['application/pdf', 'text/plain', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    const handleFilePick = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ALLOWED_FILE_TYPES,
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets[0];
            
            // Check file size (10MB max)
            if (file.size > 10 * 1024 * 1024) {
                setUploadError('File too large. Maximum size: 10 MB');
                return;
            }

            setUploadError(null);
            setIsUploading(true);

            try {
                const response = await uploadFile(file);
                setUploadedFile({
                    name: response.filename || file.name,
                    type: response.file_type || file.mimeType,
                    size: file.size,
                });
                setFileContent(response.text_content);
            } catch (err) {
                setUploadError(err.message);
                setUploadedFile(null);
                setFileContent(null);
            } finally {
                setIsUploading(false);
            }
        } catch (err) {
            setUploadError('Failed to pick file');
        }
    };

    const handleRemoveFile = () => {
        setUploadedFile(null);
        setFileContent(null);
        setUploadError(null);
    };

    const handleLogout = async () => {
        await clearUser();
        setUser(null);
        router.replace('/');
    };

    const openDrawer = () => {
        navigation.openDrawer();
    };

    // Loading state
    if (isBackendReady === null) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Connecting to Legal Assistant...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >
            <StatusBar style="dark" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable style={styles.menuBtn} onPress={openDrawer}>
                    <Feather name="menu" size={24} color={COLORS.textDark} />
                </Pressable>
                <View style={styles.headerInfo}>
                    <View style={styles.headerAvatar}>
                        <MaterialCommunityIcons name="scale-balance" size={22} color="white" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Legal Assistant</Text>
                        <View style={styles.statusBadge}>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: isBackendReady ? COLORS.accentGreen : COLORS.textMuted }
                            ]} />
                            <Text style={[
                                styles.statusText,
                                { color: isBackendReady ? COLORS.accentGreen : COLORS.textMuted }
                            ]}>
                                {isBackendReady ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <Pressable style={styles.newChatHeaderBtn} onPress={handleNewChat}>
                        <Ionicons name="add" size={22} color={COLORS.primary} />
                    </Pressable>
                    {user ? (
                        <Pressable style={styles.logoutHeaderBtn} onPress={handleLogout}>
                            <Feather name="log-out" size={20} color={COLORS.errorRed} />
                        </Pressable>
                    ) : (
                        <Pressable style={styles.loginHeaderBtn} onPress={() => router.push('/auth')}>
                            <Feather name="user" size={20} color={COLORS.primary} />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Messages Container */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
            >
                {messages.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <MaterialCommunityIcons name="scale-balance" size={40} color="white" />
                        </View>
                        <Text style={styles.emptyTitle}>Welcome to NyayaSahay</Text>
                        <Text style={styles.emptySubtitle}>
                            Your AI-powered legal assistant for Indian law
                        </Text>
                        <Text style={styles.emptyHint}>
                            Ask any question about IPC, CrPC, Constitution, or your legal rights
                        </Text>

                        {/* Example Cards */}
                        <View style={styles.exampleCards}>
                            {EXAMPLE_QUERIES.map((query, index) => (
                                <Pressable
                                    key={index}
                                    style={styles.exampleCard}
                                    onPress={() => handleExampleClick(query)}
                                >
                                    <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
                                    <Text style={styles.exampleCardText}>{query}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                ) : (
                    <>
                        {messages.map((message) => (
                            <ChatBubble
                                key={message.id}
                                role={message.role}
                                content={message.content}
                                sources={message.sources}
                                isFallback={message.isFallback}
                                latency={message.latency}
                                timestamp={message.timestamp}
                            />
                        ))}

                        {/* Typing Indicator */}
                        {isLoading && (
                            <View style={styles.typingIndicator}>
                                <View style={styles.typingAvatar}>
                                    <MaterialCommunityIcons name="scale-balance" size={18} color="white" />
                                </View>
                                <View style={styles.typingBubble}>
                                    <View style={styles.typingDots}>
                                        <View style={[styles.dot, styles.dot1]} />
                                        <View style={[styles.dot, styles.dot2]} />
                                        <View style={[styles.dot, styles.dot3]} />
                                    </View>
                                    <Text style={styles.typingText}>Analyzing your question...</Text>
                                </View>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Backend Error */}
            {!isBackendReady && (
                <View style={styles.backendError}>
                    <Feather name="alert-circle" size={16} color={COLORS.errorRed} />
                    <Text style={styles.backendErrorText}>
                        Backend server is not running. Please start the server.
                    </Text>
                </View>
            )}

            {/* Input Area */}
            <View style={[styles.inputArea, { paddingBottom: insets.bottom + SPACING.md }]}>
                {/* File Preview */}
                {uploadedFile && (
                    <View style={styles.filePreview}>
                        <Feather name="file-text" size={18} color={COLORS.primary} />
                        <Text style={styles.fileName} numberOfLines={1}>{uploadedFile.name}</Text>
                        <Pressable style={styles.removeFileBtn} onPress={handleRemoveFile}>
                            <Feather name="x" size={18} color={COLORS.errorRed} />
                        </Pressable>
                    </View>
                )}
                
                {/* Upload Error */}
                {uploadError && (
                    <View style={styles.uploadError}>
                        <Feather name="alert-circle" size={14} color={COLORS.errorRed} />
                        <Text style={styles.uploadErrorText}>{uploadError}</Text>
                    </View>
                )}
                
                {/* Uploading Indicator */}
                {isUploading && (
                    <View style={styles.uploadingIndicator}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={styles.uploadingText}>Uploading document...</Text>
                    </View>
                )}

                <View style={styles.inputWrapper}>
                    {/* Upload Button */}
                    <Pressable
                        style={[styles.uploadBtn, isUploading && styles.uploadBtnDisabled]}
                        onPress={handleFilePick}
                        disabled={isUploading || !isBackendReady}
                    >
                        <Feather name="paperclip" size={22} color={COLORS.textMuted} />
                    </Pressable>
                    
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        placeholder={uploadedFile ? "Ask about this document..." : "Describe your legal situation..."}
                        placeholderTextColor={COLORS.textMuted}
                        value={inputValue}
                        onChangeText={setInputValue}
                        multiline
                        maxLength={2000}
                        editable={isBackendReady}
                        onSubmitEditing={handleSend}
                        blurOnSubmit={false}
                    />
                    <Pressable
                        style={[
                            styles.sendBtn,
                            (!inputValue.trim() || isLoading || !isBackendReady) && styles.sendBtnDisabled
                        ]}
                        onPress={handleSend}
                        disabled={!inputValue.trim() || isLoading || !isBackendReady}
                    >
                        <Feather name="send" size={20} color="white" />
                    </Pressable>
                </View>
                <Text style={styles.disclaimer}>
                    <Feather name="alert-circle" size={12} color={COLORS.textMuted} />
                    {' '}This provides legal information only, not legal advice.
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        gap: SPACING.md,
    },
    loadingText: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderColor,
        backgroundColor: 'white',
    },
    menuBtn: {
        padding: SPACING.sm,
        marginRight: SPACING.sm,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    headerAvatar: {
        width: 45,
        height: 45,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
    },
    newChatHeaderBtn: {
        padding: SPACING.sm,
        backgroundColor: COLORS.primaryTransparent,
        borderRadius: RADIUS.md,
    },

    // Messages
    messagesContainer: {
        flex: 1,
        backgroundColor: COLORS.lightBg,
    },
    messagesContent: {
        padding: SPACING.lg,
        paddingBottom: SPACING.xl,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingTop: SPACING.xxxl,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    emptyTitle: {
        fontSize: 22,
        fontFamily: 'Inter_700Bold',
        color: COLORS.darkSurface,
        marginBottom: SPACING.sm,
    },
    emptySubtitle: {
        fontSize: 15,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        textAlign: 'center',
        marginBottom: SPACING.xs,
    },
    emptyHint: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    exampleCards: {
        width: '100%',
        gap: SPACING.sm,
    },
    exampleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: 'white',
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.borderColor,
    },
    exampleCardText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
    },

    // Typing Indicator
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.md,
        marginTop: SPACING.md,
    },
    typingAvatar: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        backgroundColor: 'white',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
        borderBottomLeftRadius: RADIUS.sm,
        ...SHADOWS.sm,
    },
    typingDots: {
        flexDirection: 'row',
        gap: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
    },
    dot1: { opacity: 0.4 },
    dot2: { opacity: 0.7 },
    dot3: { opacity: 1 },
    typingText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
    },

    // Backend Error
    backendError: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.errorBg,
    },
    backendErrorText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: COLORS.errorRed,
    },

    // Input Area
    inputArea: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: COLORS.borderColor,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: SPACING.sm,
    },
    input: {
        flex: 1,
        minHeight: 50,
        maxHeight: 150,
        paddingHorizontal: 18,
        paddingVertical: 14,
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: COLORS.borderColor,
        borderRadius: RADIUS.lg,
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
    },
    sendBtn: {
        width: 50,
        height: 50,
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: COLORS.borderColor,
    },
    disclaimer: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: SPACING.sm,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    logoutHeaderBtn: {
        padding: SPACING.sm,
        backgroundColor: COLORS.errorBg,
        borderRadius: RADIUS.md,
    },
    loginHeaderBtn: {
        padding: SPACING.sm,
        backgroundColor: COLORS.primaryTransparent,
        borderRadius: RADIUS.md,
    },
    
    // File Upload
    filePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.primaryTransparent,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.sm,
    },
    fileName: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        color: COLORS.primary,
    },
    removeFileBtn: {
        padding: SPACING.xs,
    },
    uploadError: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: COLORS.errorBg,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.sm,
    },
    uploadErrorText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: COLORS.errorRed,
    },
    uploadingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    uploadingText: {
        fontSize: 13,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
    },
    uploadBtn: {
        width: 44,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.lightBg,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.borderColor,
    },
    uploadBtnDisabled: {
        opacity: 0.5,
    },
});
