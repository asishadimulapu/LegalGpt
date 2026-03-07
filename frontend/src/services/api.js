/**
 * API Service Module
 * Handles all communication with the FastAPI backend
 *
 * Auth strategy:
 *   - Web: HttpOnly cookie set by the backend (credentials: 'include')
 *   - The Authorization header is no longer sent from the browser.
 *   - User profile data (email, name, role) is stored in localStorage
 *     for UI purposes only — the JWT itself never touches JS.
 */

// Use environment variable in production, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD ? '' : 'http://localhost:8000');

/**
 * Handle 401 responses globally — try a silent token refresh first,
 * and only expire the session if the refresh also fails.
 */
let _refreshPromise = null;

async function tryRefreshToken() {
    // Deduplicate concurrent refresh attempts
    if (_refreshPromise) return _refreshPromise;
    _refreshPromise = (async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
            });
            return res.ok;
        } catch {
            return false;
        } finally {
            _refreshPromise = null;
        }
    })();
    return _refreshPromise;
}

function handleSessionExpired() {
    const saved = localStorage.getItem('LawGPT_user');
    if (saved) {
        localStorage.removeItem('LawGPT_user');
        // Dispatch custom event so App.jsx can update its state
        window.dispatchEvent(new CustomEvent('auth:expired'));
    }
}

/**
 * Wrapper around fetch that automatically retries once on 401 after
 * refreshing the access token.
 */
async function authedFetch(url, options = {}) {
    const opts = { ...options, credentials: 'include' };
    let response = await fetch(url, opts);
    if (response.status === 401) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            response = await fetch(url, opts);
        }
        if (response.status === 401) {
            handleSessionExpired();
        }
    }
    return response;
}


/**
 * Get auth headers — now returns empty since cookies handle auth.
 * Kept for backward compatibility with any code that spreads it.
 */
function getAuthHeaders() {
    return {};
}

/**
 * Send a chat query to the RAG pipeline
 * Note: First request after cold start may take 60-90 seconds (loading AI models)
 */
export async function sendChatMessage(query, sessionId = null) {
    // Create abort controller with 120 second timeout for cold starts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    try {
        const response = await authedFetch(`${API_BASE_URL}/api/v1/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
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
            throw new Error('Request timed out. The server may be starting up (cold start). Please try again in 30 seconds.');
        }
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('Unable to connect to the server. Please ensure the backend is running.');
        }
        throw error;
    }
}

/**
 * Get user's chat sessions (requires auth)
 */
export async function getChatSessions() {
    try {
        const response = await authedFetch(`${API_BASE_URL}/api/v1/chat/sessions`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                return []; // Not authenticated, return empty
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to fetch sessions');
        }

        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError') {
            throw new Error('Unable to connect to server');
        }
        throw error;
    }
}

/**
 * Get a specific chat session with messages (requires auth)
 */
export async function getChatSession(sessionId) {
    try {
        const response = await authedFetch(`${API_BASE_URL}/api/v1/chat/sessions/${sessionId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });

        if (!response.ok) {
            if (response.status === 401) { return null; }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to fetch session');
        }

        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError') {
            throw new Error('Unable to connect to server');
        }
        throw error;
    }
}

/**
 * Delete a chat session (requires auth)
 */
export async function deleteChatSession(sessionId) {
    try {
        const response = await authedFetch(`${API_BASE_URL}/api/v1/chat/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });

        if (!response.ok) {
            if (response.status === 401) { return null; }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to delete session');
        }

        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError') {
            throw new Error('Unable to connect to server');
        }
        throw error;
    }
}

/**
 * Check if the backend is healthy
 */
export async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, { credentials: 'include' });
        if (!response.ok) throw new Error('Backend is not healthy');
        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError') {
            throw new Error('Backend is not reachable');
        }
        throw error;
    }
}

/**
 * Register a new user
 */
export async function registerUser(name, email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
            method: 'POST',
            credentials: 'include',
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
    } catch (error) {
        if (error.name === 'TypeError') {
            throw new Error('Unable to connect to server');
        }
        throw error;
    }
}

/**
 * Login user
 */
export async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            credentials: 'include',
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
    } catch (error) {
        if (error.name === 'TypeError') {
            throw new Error('Unable to connect to server');
        }
        throw error;
    }
}

/**
 * Request a password reset email
 */
export async function forgotPassword(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to send reset email');
        }
        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError') throw new Error('Unable to connect to server');
        throw error;
    }
}

/**
 * Reset password using token from email link
 */
export async function resetPassword(token, newPassword) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, new_password: newPassword }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to reset password');
        }
        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError') throw new Error('Unable to connect to server');
        throw error;
    }
}

/**
 * Logout — clears server-side HttpOnly cookie
 */
export async function logoutUser() {
    try {
        await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        });
    } catch {
        // Ignore network errors on logout — cookie may already be gone
    }
}

/**
 * Upload a file for document analysis
 */
export async function uploadFile(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await authedFetch(`${API_BASE_URL}/api/v1/upload`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
            },
            body: formData,
        });

        if (!response.ok) {
            if (response.status === 401) { return null; }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'File upload failed');
        }

        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError') {
            throw new Error('Unable to connect to server');
        }
        throw error;
    }
}
/**
 * Send a chat query with file context using hybrid document analysis endpoint
 * This combines document analysis with RAG retrieval for mentioned sections
 * Now includes session_id and document_filename for chat history saving
 */
export async function sendChatWithFile(query, fileContext, sessionId = null, documentFilename = null) {
    // Create abort controller with 120 second timeout for document analysis
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    try {
        // Build request body with optional session_id and document_filename
        const requestBody = {
            document_content: fileContext,
            question: query,
        };

        if (sessionId) {
            requestBody.session_id = sessionId;
        }
        if (documentFilename) {
            requestBody.document_filename = documentFilename;
        }

        // Use the hybrid document analysis endpoint
        const response = await authedFetch(`${API_BASE_URL}/api/v1/upload/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
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

        // Build answer with legal context if available
        let enhancedAnswer = data.answer;

        if (data.legal_context && data.legal_context.length > 0) {
            enhancedAnswer += '\n\n---\n\n**📚 Related Legal Provisions (from RAG Database):**\n';
            data.legal_context.forEach(ctx => {
                enhancedAnswer += `\n**Section ${ctx.section}** (${ctx.source}):\n${ctx.content}\n`;
            });
        }

        // Transform response to match chat response format
        // Use the session_id from response (backend creates session if authenticated)
        return {
            answer: enhancedAnswer,
            sources: data.sources || [],
            session_id: data.session_id || sessionId,  // Use new session_id from backend
            is_fallback: false,
            latency_ms: data.latency_ms,
            document_type: data.document_type,
            extracted_sections: data.extracted_sections
        };
    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error('Document analysis timed out. The server may be busy. Please try again.');
        }
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('Unable to connect to the server. Please ensure the backend is running.');
        }
        throw error;
    }
}


/**
 * Fetch current user profile (includes is_superuser for admin access).
 * Relies on the HttpOnly cookie for auth.
 */
export async function fetchCurrentUser() {
    try {
        const response = await authedFetch(`${API_BASE_URL}/api/v1/auth/me`, {});
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}


/**
 * Silently refresh the access token by calling the refresh endpoint.
 * Used by AuthContext to keep the session alive while the tab is open.
 * @returns {Promise<boolean>} true if refresh succeeded
 */
export async function silentRefresh() {
    return tryRefreshToken();
}


export default {
    sendChatMessage,
    checkHealth,
    registerUser,
    loginUser,
    logoutUser,
    forgotPassword,
    resetPassword,
    fetchCurrentUser,
    silentRefresh,
    uploadFile,
    sendChatWithFile,
    getChatSessions,
    getChatSession,
    deleteChatSession,
    getUserProfile,
    updateUserProfile,
    getUserStats,
    getUserMemories,
    clearUserMemories,
    exportUserData,
    deleteUserAccount,
};


// =============================================================================
// Profile & Dashboard API
// =============================================================================

/**
 * Get the authenticated user's profile
 */
export async function getUserProfile() {
    try {
        const response = await authedFetch(`${API_BASE_URL}/api/v1/profile`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        });
        if (!response.ok) {
            if (response.status === 401) {
                return null;
            }
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to fetch profile');
        }
        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError') throw new Error('Unable to connect to server');
        throw error;
    }
}

/**
 * Update user profile
 */
export async function updateUserProfile(data) {
    try {
        const response = await authedFetch(`${API_BASE_URL}/api/v1/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            if (response.status === 401) { return null; }
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to update profile');
        }
        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError') throw new Error('Unable to connect to server');
        throw error;
    }
}

/**
 * Get user dashboard stats
 */
export async function getUserStats() {
    try {
        const response = await authedFetch(`${API_BASE_URL}/api/v1/profile/stats`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        });
        if (!response.ok) {
            if (response.status === 401) return null;
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to fetch stats');
        }
        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError') throw new Error('Unable to connect to server');
        throw error;
    }
}

/**
 * Get user AI memories
 */
export async function getUserMemories(memoryType = null, limit = 20) {
    try {
        let url = `${API_BASE_URL}/api/v1/profile/memories?limit=${limit}`;
        if (memoryType) url += `&memory_type=${memoryType}`;
        const response = await authedFetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        });
        if (!response.ok) {
            if (response.status === 401) return null;
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to fetch memories');
        }
        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError') throw new Error('Unable to connect to server');
        throw error;
    }
}

/**
 * Clear all AI memories
 */
export async function clearUserMemories() {
    try {
        const response = await authedFetch(`${API_BASE_URL}/api/v1/profile/memories`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        });
        if (!response.ok) {
            if (response.status === 401) { return null; }
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to clear memories');
        }
        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError') throw new Error('Unable to connect to server');
        throw error;
    }
}

/**
 * Export all user data (DPDPA / GDPR)
 */
export async function exportUserData() {
    try {
        const response = await authedFetch(`${API_BASE_URL}/api/v1/profile/export`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        });
        if (!response.ok) {
            if (response.status === 401) { return null; }
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to export data');
        }
        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError') throw new Error('Unable to connect to server');
        throw error;
    }
}

/**
 * Permanently delete user account and all data
 */
export async function deleteUserAccount() {
    try {
        const response = await authedFetch(`${API_BASE_URL}/api/v1/profile/delete-account`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        });
        if (!response.ok) {
            if (response.status === 401) { return null; }
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to delete account');
        }
        return await response.json();
    } catch (error) {
        if (error.name === 'TypeError') throw new Error('Unable to connect to server');
        throw error;
    }
}
