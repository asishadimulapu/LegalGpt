/**
 * NyayaSahay Mobile - API Service
 * Pixel-perfect replica of web api.js
 */

import * as SecureStore from 'expo-secure-store';

// API Configuration
// For testing: Use your local IP (phone must be on same WiFi as PC)
// For production: Use deployed URL
const USE_LOCAL = false; // Set to true for local testing
const LOCAL_IP = '192.168.0.104'; // Your PC's WiFi IP
const API_BASE_URL = USE_LOCAL
    ? `http://${LOCAL_IP}:8000`
    : 'https://law-gpt.app';

/**
 * Get auth headers from SecureStore
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
    } catch (e) {
        console.error('Error reading auth:', e);
    }
    return {};
}

/**
 * Send a chat query to the RAG pipeline
 */
export async function sendChatMessage(query, sessionId = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

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
    } catch (error) {
        console.error('getChatSessions error:', error);
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
 * Save user to SecureStore
 */
export async function saveUser(userData) {
    await SecureStore.setItemAsync('nyayasahay_user', JSON.stringify(userData));
}

/**
 * Get user from SecureStore
 */
export async function getUser() {
    try {
        const userJson = await SecureStore.getItemAsync('nyayasahay_user');
        return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Clear user from SecureStore (logout)
 */
export async function clearUser() {
    await SecureStore.deleteItemAsync('nyayasahay_user');
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
};
