/**
 * API Service Module
 * Handles all communication with the FastAPI backend
 */

// Use environment variable in production, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD ? '' : 'http://localhost:8000');


/**
 * Get auth headers if user is logged in
 */
function getAuthHeaders() {
    const saved = localStorage.getItem('nyayasahay_user');
    if (saved) {
        const user = JSON.parse(saved);
        if (user.token) {
            return { 'Authorization': `Bearer ${user.token}` };
        }
    }
    return {};
}

/**
 * Validate if the stored token is still valid
 * Returns false if token is expired or invalid
 */
export async function validateToken(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        return response.ok; // true if 200, false if 401
    } catch (error) {
        return false;
    }
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
        const response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
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
        const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions`, {
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
        const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions/${sessionId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });

        if (!response.ok) {
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
        const response = await fetch(`${API_BASE_URL}/api/v1/chat/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });

        if (!response.ok) {
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
        const response = await fetch(`${API_BASE_URL}/health`);
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
 * Upload a file for document analysis
 */
export async function uploadFile(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/api/v1/upload`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
            },
            body: formData,
        });

        if (!response.ok) {
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
        const response = await fetch(`${API_BASE_URL}/api/v1/upload/analyze`, {
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


export default {
    sendChatMessage,
    checkHealth,
    registerUser,
    loginUser,
    uploadFile,
    sendChatWithFile,
    getChatSessions,
    getChatSession,
    deleteChatSession,
    validateToken,
};
