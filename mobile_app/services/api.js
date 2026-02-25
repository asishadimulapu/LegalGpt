/**
 * NyayaSahay Mobile - API Service
 * Production-ready API client with secure storage
 */

import * as SecureStore from 'expo-secure-store';

// API Configuration - Production URL
const API_BASE_URL = 'https://law-gpt.app';

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 120000;

/**
 * Get auth headers from SecureStore
 * @returns {Promise<Object>} Authorization headers or empty object
 */
async function getAuthHeaders() {
    try {
        const userJson = await SecureStore.getItemAsync('nyayasahay_user');
        if (userJson) {
            const user = JSON.parse(userJson);
            if (user.token) {
                return { 'Authorization': `Bearer ${user.token}` };
            }
        }
    } catch (_e) {
        // Silent fail - return empty headers
    }
    return {};
}

/**
 * Send a chat query to the RAG pipeline
 * @param {string} query - User's legal question
 * @param {string|null} sessionId - Optional session ID for conversation continuity
 * @returns {Promise<Object>} Chat response with answer and sources
 */
export async function sendChatMessage(query, sessionId = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
            },
            body: JSON.stringify({
                query: query,
                session_id: sessionId,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Server error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
        }
        throw error;
    }
}

/**
 * Get user's chat sessions
 */
export async function getChatSessions() {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
            },
        });

        if (!response.ok) {
            if (response.status === 401) return [];
            throw new Error('Failed to fetch sessions');
        }

        return await response.json();
    } catch (_error) {
        // Silent fail - return empty array
        return [];
    }
}

/**
 * Get a specific chat session with messages
 */
export async function getChatSession(sessionId) {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch session');
    }

    return await response.json();
}

/**
 * Delete a chat session
 */
export async function deleteChatSession(sessionId) {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to delete session');
    }

    return await response.json();
}

/**
 * Check backend health
 */
export async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) throw new Error('Backend is not healthy');
        return await response.json();
    } catch (error) {
        throw new Error('Backend is not reachable');
    }
}

/**
 * Register a new user
 */
export async function registerUser(name, email, password) {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            full_name: name,
            email: email,
            password: password,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Registration failed');
    }

    return await response.json();
}

/**
 * Login user
 */
export async function loginUser(email, password) {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: email,
            password: password,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Invalid credentials');
    }

    return await response.json();
}

/**
 * Exchange Google access token for our JWT (mobile flow)
 * Uses the /google/mobile-auth endpoint
 */
export async function exchangeGoogleToken(googleAccessToken) {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/google/mobile-auth`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            access_token: googleAccessToken,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Google authentication failed');
    }

    return await response.json();
}

/**
 * Save user to SecureStore
 * @param {Object} userData - User data including token
 */
export async function saveUser(userData) {
    try {
        const jsonStr = JSON.stringify(userData);
        await SecureStore.setItemAsync('nyayasahay_user', jsonStr);
        // Verify the save was successful by reading it back
        const verify = await SecureStore.getItemAsync('nyayasahay_user');
        if (!verify) {
            throw new Error('Failed to verify saved user data');
        }
    } catch (error) {
        // If SecureStore fails, throw to let the caller handle it
        throw new Error('Failed to save user credentials');
    }
}

/**
 * Get user from SecureStore
 * @returns {Promise<Object|null>} User data or null
 */
export async function getUser() {
    try {
        const userJson = await SecureStore.getItemAsync('nyayasahay_user');
        if (!userJson) return null;
        const parsed = JSON.parse(userJson);
        // Validate that we have a token
        if (!parsed.token) return null;
        return parsed;
    } catch (_e) {
        return null;
    }
}

/**
 * Clear user from SecureStore (logout)
 */
export async function clearUser() {
    await SecureStore.deleteItemAsync('nyayasahay_user');
}

/**
 * Upload a file and extract its content
 * @param {Object} file - File object from DocumentPicker
 * @returns {Promise<Object>} Extracted text content
 */
export async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
    });

    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/api/v1/upload/extract`, {
        method: 'POST',
        headers: {
            ...authHeaders,
            // Don't set Content-Type for FormData - fetch handles it
        },
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed: ${response.status}`);
    }

    return await response.json();
}

/**
 * Upload and analyze a document
 * @param {string} documentContent - Extracted text from document
 * @param {string} question - User's question about the document
 * @param {string|null} sessionId - Optional session ID
 * @param {string|null} filename - Optional filename for context
 * @returns {Promise<Object>} Analysis response
 */
export async function analyzeDocument(documentContent, question, sessionId = null, filename = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const authHeaders = await getAuthHeaders();
        const requestBody = {
            document_content: documentContent,
            question: question,
        };

        if (sessionId) requestBody.session_id = sessionId;
        if (filename) requestBody.document_filename = filename;

        const response = await fetch(`${API_BASE_URL}/api/v1/upload/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Server error: ${response.status}`);
        }

        const data = await response.json();

        // Build enhanced answer with legal context
        let enhancedAnswer = data.answer;
        if (data.legal_context && data.legal_context.length > 0) {
            enhancedAnswer += '\n\n---\n\n**📚 Related Legal Provisions:**\n';
            data.legal_context.forEach(ctx => {
                enhancedAnswer += `\n**Section ${ctx.section}** (${ctx.source}):\n${ctx.content}\n`;
            });
        }

        return {
            answer: enhancedAnswer,
            sources: data.sources || [],
            session_id: data.session_id || sessionId,
            document_type: data.document_type,
            extracted_sections: data.extracted_sections,
            latency_ms: data.latency_ms,
        };
    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error('Document analysis timed out. Please try again.');
        }
        throw error;
    }
}

/**
 * Exchange a temporary transfer code for an access token.
 * Used after Google OAuth deep link returns a short-lived code.
 * @param {string} code - The transfer code from the deep link
 * @returns {Promise<Object>} The access token and user data
 */
export async function exchangeTransferCode(code) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/mobile/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Exchange failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Transfer code exchange timed out. Please try again.');
        }
        throw error;
    }
}

// =============================================================================
// Profile & Dashboard API
// =============================================================================

/**
 * Get the authenticated user's profile
 */
export async function getUserProfile() {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/v1/profile`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
        });
        if (!response.ok) {
            if (response.status === 401) return null;
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to fetch profile');
        }
        return await response.json();
    } catch (error) {
        if (error.message?.includes('Failed to fetch')) throw new Error('Unable to connect to server');
        throw error;
    }
}

/**
 * Update user profile
 */
export async function updateUserProfile(data) {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/v1/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to update profile');
        }
        return await response.json();
    } catch (error) {
        if (error.message?.includes('Failed to fetch')) throw new Error('Unable to connect to server');
        throw error;
    }
}

/**
 * Get user dashboard stats
 */
export async function getUserStats() {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/v1/profile/stats`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
        });
        if (!response.ok) {
            if (response.status === 401) return null;
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to fetch stats');
        }
        return await response.json();
    } catch (error) {
        if (error.message?.includes('Failed to fetch')) throw new Error('Unable to connect to server');
        throw error;
    }
}

/**
 * Get user AI memories
 */
export async function getUserMemories(memoryType = null, limit = 20) {
    try {
        let url = `${API_BASE_URL}/api/v1/profile/memories?limit=${encodeURIComponent(limit)}`;
        if (memoryType) url += `&memory_type=${encodeURIComponent(memoryType)}`;
        const authHeaders = await getAuthHeaders();
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
        });
        if (!response.ok) {
            if (response.status === 401) return null;
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to fetch memories');
        }
        return await response.json();
    } catch (error) {
        if (error.message?.includes('Failed to fetch')) throw new Error('Unable to connect to server');
        throw error;
    }
}

/**
 * Clear all AI memories
 */
export async function clearUserMemories() {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/v1/profile/memories`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to clear memories');
        }
        return await response.json();
    } catch (error) {
        if (error.message?.includes('Failed to fetch')) throw new Error('Unable to connect to server');
        throw error;
    }
}

/**
 * Export all user data (DPDPA / GDPR)
 */
export async function exportUserData() {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/v1/profile/export`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to export data');
        }
        return await response.json();
    } catch (error) {
        if (error.message?.includes('Failed to fetch')) throw new Error('Unable to connect to server');
        throw error;
    }
}

/**
 * Permanently delete user account and all data
 */
export async function deleteUserAccount() {
    try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/api/v1/profile/delete-account`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to delete account');
        }
        return await response.json();
    } catch (error) {
        if (error.message?.includes('Failed to fetch')) throw new Error('Unable to connect to server');
        throw error;
    }
}

export default {
    sendChatMessage,
    getChatSessions,
    getChatSession,
    deleteChatSession,
    checkHealth,
    registerUser,
    loginUser,
    saveUser,
    getUser,
    clearUser,
    uploadFile,
    analyzeDocument,
    exchangeTransferCode,
    getUserProfile,
    updateUserProfile,
    getUserStats,
    getUserMemories,
    clearUserMemories,
    exportUserData,
    deleteUserAccount,
};
