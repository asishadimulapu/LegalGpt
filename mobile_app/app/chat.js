/**
 * LawGPT Mobile - Chat Screen
 * Pixel-perfect replica of web Chat.jsx with responsive design
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { wp, hp, ms, screenSize } from '../constants/responsive';
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
            setInputValue('');
        }
    }, [params.session, isBackendReady, params.t]);

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

        const botMessageId = Date.now() + 1;
        try {
            // Create placeholder bot message
            const botMessage = {
                id: botMessageId,
                role: 'bot',
                content: '',
                sources: [],
                isFallback: false,
                latency: 0,
                timestamp: getTimestamp(),
                basedOnFile: !!fileContent,
            };
            setMessages(prev => [...prev, botMessage]);

            if (fileContent) {
                // Use document analysis for file-based queries (no streaming yet)
                const response = await analyzeDocument(fileContent, query, sessionId, uploadedFile?.name);

                if (response.session_id) {
                    setSessionId(response.session_id);
                }

                setMessages(prev => prev.map(msg =>
                    msg.id === botMessageId
                        ? {
                            ...msg,
                            content: response.answer,
                            sources: response.sources || [],
                            isFallback: response.is_fallback,
                            latency: response.latency_ms
                        }
                        : msg
                ));

                if (fileContent) {
                    setUploadedFile(null);
                    setFileContent(null);
                }
                setIsLoading(false);
                scrollToBottom();
                return;
            }

            // Use the non-streaming chat API (sendChatMessage uses /api/v1/chat)
            // TODO: Re-enable streaming via /chat/stream once production is re-deployed
            const response = await sendChatMessage(query, sessionId);

            if (response.session_id) {
                setSessionId(response.session_id);
            }

            setMessages(prev => prev.map(msg =>
                msg.id === botMessageId
                    ? {
                        ...msg,
                        content: response.answer,
                        sources: response.sources || [],
                        isFallback: response.is_fallback,
                        latency: response.latency_ms,
                    }
                    : msg
            ));

        } catch (err) {
            setMessages(prev => prev.filter(msg => msg.id !== botMessageId).concat({
                id: Date.now() + 2,
                role: 'bot',
                content: `I apologize, but I encountered an error: ${err.message}. Please try again.`,
                isFallback: true,
                timestamp: getTimestamp(),
            }));
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
        router.replace({ pathname: '/chat', params: { t: Date.now() } });
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                        <Text style={styles.emptyTitle}>Welcome to LawGPT</Text>
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
        gap: ms(14),
    },
    loadingText: {
        fontSize: ms(15),
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: ms(14),
        paddingBottom: ms(12),
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderColor,
        backgroundColor: 'white',
    },
    menuBtn: {
        padding: ms(8),
        marginRight: ms(6),
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: ms(12),
    },
    headerAvatar: {
        width: ms(42),
        height: ms(42),
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: ms(16),
        fontFamily: 'Inter_600SemiBold',
        color: COLORS.textDark,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: ms(5),
        marginTop: 2,
    },
    statusDot: {
        width: ms(7),
        height: ms(7),
        borderRadius: ms(4),
    },
    statusText: {
        fontSize: ms(12),
        fontFamily: 'Inter_400Regular',
    },
    newChatHeaderBtn: {
        padding: ms(8),
        backgroundColor: COLORS.primaryTransparent,
        borderRadius: RADIUS.md,
    },

    // Messages
    messagesContainer: {
        flex: 1,
        backgroundColor: COLORS.lightBg,
    },
    messagesContent: {
        padding: ms(18),
        paddingBottom: ms(24),
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingTop: ms(50),
    },
    emptyIcon: {
        width: ms(70),
        height: ms(70),
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: ms(18),
    },
    emptyTitle: {
        fontSize: ms(20),
        fontFamily: 'Inter_700Bold',
        color: COLORS.darkSurface,
        marginBottom: ms(6),
    },
    emptySubtitle: {
        fontSize: ms(14),
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        textAlign: 'center',
        marginBottom: ms(4),
    },
    emptyHint: {
        fontSize: ms(13),
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        textAlign: 'center',
        marginBottom: ms(24),
    },
    exampleCards: {
        width: '100%',
        gap: ms(8),
    },
    exampleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: ms(8),
        backgroundColor: 'white',
        padding: ms(14),
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.borderColor,
    },
    exampleCardText: {
        flex: 1,
        fontSize: ms(13),
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
    },

    // Typing Indicator
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: ms(12),
        marginTop: ms(12),
    },
    typingAvatar: {
        width: ms(34),
        height: ms(34),
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: ms(12),
        backgroundColor: 'white',
        paddingHorizontal: ms(18),
        paddingVertical: ms(12),
        borderRadius: RADIUS.lg,
        borderBottomLeftRadius: RADIUS.sm,
        ...SHADOWS.sm,
    },
    typingDots: {
        flexDirection: 'row',
        gap: ms(4),
    },
    dot: {
        width: ms(7),
        height: ms(7),
        borderRadius: ms(4),
        backgroundColor: COLORS.primary,
    },
    dot1: { opacity: 0.4 },
    dot2: { opacity: 0.7 },
    dot3: { opacity: 1 },
    typingText: {
        fontSize: ms(13),
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
    },

    // Backend Error
    backendError: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: ms(8),
        paddingHorizontal: ms(24),
        paddingVertical: ms(12),
        backgroundColor: COLORS.errorBg,
    },
    backendErrorText: {
        flex: 1,
        fontSize: ms(12),
        fontFamily: 'Inter_400Regular',
        color: COLORS.errorRed,
    },

    // Input Area
    inputArea: {
        paddingHorizontal: ms(18),
        paddingTop: ms(12),
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: COLORS.borderColor,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: ms(8),
    },
    input: {
        flex: 1,
        minHeight: ms(46),
        maxHeight: ms(130),
        paddingHorizontal: ms(16),
        paddingVertical: ms(12),
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: COLORS.borderColor,
        borderRadius: RADIUS.lg,
        fontSize: ms(15),
        fontFamily: 'Inter_400Regular',
        color: COLORS.textDark,
    },
    sendBtn: {
        width: ms(46),
        height: ms(46),
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: COLORS.borderColor,
    },
    disclaimer: {
        fontSize: ms(11),
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: ms(8),
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: ms(8),
    },
    logoutHeaderBtn: {
        padding: ms(8),
        backgroundColor: COLORS.errorBg,
        borderRadius: RADIUS.md,
    },
    loginHeaderBtn: {
        padding: ms(8),
        backgroundColor: COLORS.primaryTransparent,
        borderRadius: RADIUS.md,
    },

    // File Upload
    filePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: ms(8),
        backgroundColor: COLORS.primaryTransparent,
        paddingHorizontal: ms(14),
        paddingVertical: ms(8),
        borderRadius: RADIUS.md,
        marginBottom: ms(8),
    },
    fileName: {
        flex: 1,
        fontSize: ms(13),
        fontFamily: 'Inter_500Medium',
        color: COLORS.primary,
    },
    removeFileBtn: {
        padding: ms(4),
    },
    uploadError: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: ms(8),
        backgroundColor: COLORS.errorBg,
        paddingHorizontal: ms(14),
        paddingVertical: ms(8),
        borderRadius: RADIUS.md,
        marginBottom: ms(8),
    },
    uploadErrorText: {
        flex: 1,
        fontSize: ms(12),
        fontFamily: 'Inter_400Regular',
        color: COLORS.errorRed,
    },
    uploadingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: ms(8),
        paddingVertical: ms(8),
        marginBottom: ms(8),
    },
    uploadingText: {
        fontSize: ms(12),
        fontFamily: 'Inter_400Regular',
        color: COLORS.textMuted,
    },
    uploadBtn: {
        width: ms(42),
        height: ms(46),
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

