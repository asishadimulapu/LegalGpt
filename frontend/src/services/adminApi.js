/**
 * Admin API Service
 * Handles all communication with admin-only backend endpoints.
 * Auth is via HttpOnly cookie (credentials: 'include').
 * On 401, attempts a silent token refresh before expiring session.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD ? '' : 'http://localhost:8000');

function getAuthHeaders() {
    // Cookie-based auth — no Authorization header needed.
    return {};
}

/** Deduplicated token refresh (shared promise). */
let _adminRefreshPromise = null;
async function _tryRefresh() {
    if (_adminRefreshPromise) return _adminRefreshPromise;
    _adminRefreshPromise = (async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
            });
            return res.ok;
        } catch { return false; }
        finally { _adminRefreshPromise = null; }
    })();
    return _adminRefreshPromise;
}

/**
 * Wrapper: fetch with credentials + auto-retry on 401 after refresh.
 */
async function adminFetch(url, opts = {}) {
    const options = { ...opts, credentials: 'include' };
    let res = await fetch(url, options);
    if (res.status === 401) {
        const ok = await _tryRefresh();
        if (ok) res = await fetch(url, options);
    }
    return res;
}

async function handleResponse(res) {
    if (res.status === 401) {
        localStorage.removeItem('LawGPT_user');
        window.dispatchEvent(new Event('auth:expired'));
        throw new Error('Session expired');
    }
    if (res.status === 403) {
        throw new Error('Admin access required');
    }
    const text = await res.text();
    let parsed = {};
    try {
        parsed = text ? JSON.parse(text) : {};
    } catch {
        if (!res.ok) {
            throw new Error(`Error ${res.status}: non-JSON response`);
        }
        return {};
    }
    if (!res.ok) {
        throw new Error(parsed.detail || `Error ${res.status}`);
    }
    return parsed;
}

// =============================================================================
// Dashboard
// =============================================================================
export async function getDashboardStats() {
    const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/dashboard`, {
        headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
}

// =============================================================================
// User Management
// =============================================================================
export async function getUsers(page = 1, perPage = 20, search = '', provider = '', activeOnly = null) {
    const params = new URLSearchParams({ page, per_page: perPage });
    if (search) params.append('search', search);
    if (provider) params.append('provider', provider);
    if (activeOnly !== null) params.append('active_only', activeOnly);

    const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/users?${params}`, {
        headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
}

export async function getUserDetail(userId) {
    const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/users/${encodeURIComponent(userId)}`, {
        headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
}

export async function updateUser(userId, updates) {
    const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(updates),
    });
    return handleResponse(res);
}

export async function deleteUser(userId) {
    const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
}

// =============================================================================
// Query Analytics
// =============================================================================
export async function getQueryAnalytics(days = 30) {
    const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/queries/analytics?days=${days}`, {
        headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
}

export async function getQueryLogs(page = 1, perPage = 20) {
    const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/queries?page=${page}&per_page=${perPage}`, {
        headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
}

// =============================================================================
// Documents
// =============================================================================
export async function getDocuments(page = 1, perPage = 20, source = '') {
    const params = new URLSearchParams({ page, per_page: perPage });
    if (source) params.append('source', source);

    const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/documents?${params}`, {
        headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
}

export async function deleteDocument(docId) {
    const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/documents/${encodeURIComponent(docId)}`, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
}

// =============================================================================
// Audit Logs
// =============================================================================
export async function getAuditLogs(page = 1, perPage = 20, eventType = '', severity = '') {
    const params = new URLSearchParams({ page, per_page: perPage });
    if (eventType) params.append('event_type', eventType);
    if (severity) params.append('severity', severity);

    const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/audit-logs?${params}`, {
        headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
}

// =============================================================================
// Settings
// =============================================================================
export async function getSettings() {
    const res = await adminFetch(`${API_BASE_URL}/api/v1/admin/settings`, {
        headers: { ...getAuthHeaders() },
    });
    return handleResponse(res);
}
