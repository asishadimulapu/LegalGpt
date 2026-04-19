/**
 * UserManagement — Admin user CRUD table with search, filter, detail modal, and actions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Ban, CheckCircle, Crown, Key, Trash2, Search, MessageSquare, Mail, HelpCircle, Brain, Globe, Languages, X, Lock } from 'lucide-react';
import { getUsers, getUserDetail, updateUser, deleteUser } from '../../services/adminApi';
import { AdminTableSkeleton, SimpleTableRowsSkeleton } from '../../components/SkeletonLoader';

export default function UserManagement() {
    const [data, setData] = useState({ users: [], total: 0, page: 1, per_page: 20, total_pages: 1 });
    const [search, setSearch] = useState('');
    const [provider, setProvider] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState('');

    // Detail modal
    const [selectedUser, setSelectedUser] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetchUsers = useCallback(async (page = 1, searchParam, providerParam) => {
        setLoading(true);
        const minDelay = new Promise(r => setTimeout(r, 1200));
        try {
            const res = await getUsers(page, 20, searchParam ?? search, providerParam ?? provider);
            setData(res);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            await minDelay;
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(1, '', ''); }, [fetchUsers]);

    const openDetail = async (userId) => {
        setDetailLoading(true);
        try {
            const detail = await getUserDetail(userId);
            setSelectedUser(detail);
        } catch (err) {
            alert(err.message);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleToggleActive = async (userId, currentActive) => {
        if (!window.confirm(`${currentActive ? 'Deactivate' : 'Activate'} this user?`)) return;
        setActionLoading(userId);
        try {
            await updateUser(userId, { is_active: !currentActive });
            fetchUsers(data.page);
            if (selectedUser?.id === userId) setSelectedUser(null);
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading('');
        }
    };

    const handleToggleAdmin = async (userId, currentAdmin) => {
        if (!window.confirm(`${currentAdmin ? 'Revoke' : 'Grant'} admin access?`)) return;
        setActionLoading(userId);
        try {
            await updateUser(userId, { is_superuser: !currentAdmin });
            fetchUsers(data.page);
            if (selectedUser?.id === userId) setSelectedUser(null);
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading('');
        }
    };

    const handleDelete = async (userId, email) => {
        if (!window.confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
        setActionLoading(userId);
        try {
            await deleteUser(userId);
            fetchUsers(data.page);
            if (selectedUser?.id === userId) setSelectedUser(null);
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading('');
        }
    };

    return (
        <>
            <div className="admin-page-header">
                <h1>User Management</h1>
                <p>{data.total} total users</p>
            </div>

            <div className="admin-table-container">
                <div className="admin-table-toolbar">
                    <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchUsers(1)}
                    />
                    <select
                        className="admin-filter-select"
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                    >
                        <option value="">All Providers</option>
                        <option value="email">Email</option>
                        <option value="google">Google</option>
                    </select>
                    <button className="admin-btn admin-btn-ghost" onClick={() => fetchUsers(1)}>
                        <Search size={14} /> Search
                    </button>
                </div>

                {loading ? (
                    <AdminTableSkeleton cols={6} rows={8} />
                ) : error ? (
                    <div className="admin-empty">⚠️ {error}</div>
                ) : (
                    <>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Provider</th>
                                    <th>Status</th>
                                    <th>Role</th>
                                    <th>Sessions</th>
                                    <th>Messages</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.users.map((u) => (
                                    <tr key={u.id}>
                                        <td>
                                            <div
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => openDetail(u.id)}
                                                title="Click to view details"
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    {u.picture_url ? (
                                                        <img
                                                            src={u.picture_url}
                                                            alt=""
                                                            style={{ width: 32, height: 32, borderRadius: '50%' }}
                                                        />
                                                    ) : (
                                                        <div style={{
                                                            width: 32, height: 32, borderRadius: '50%',
                                                            background: 'linear-gradient(135deg,#667eea,#764ba2)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '0.8rem', color: '#fff', fontWeight: 700,
                                                        }}>
                                                            {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <strong style={{ color: '#fff' }}>{u.full_name || '—'}</strong>
                                                        <br />
                                                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                                                            {u.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="admin-badge info">
                                                {u.auth_provider === 'google' ? '🔵 Google' : '✉️ Email'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`admin-badge ${u.is_active ? 'active' : 'inactive'}`}>
                                                {u.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            {u.is_superuser && (
                                                <span className="admin-badge admin">Admin</span>
                                            )}
                                        </td>
                                        <td>{u.session_count}</td>
                                        <td>{u.message_count}</td>
                                        <td style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                                            {new Date(u.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    className="admin-btn admin-btn-ghost admin-btn-sm"
                                                    onClick={() => openDetail(u.id)}
                                                    title="View details"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    className="admin-btn admin-btn-ghost admin-btn-sm"
                                                    onClick={() => handleToggleActive(u.id, u.is_active)}
                                                    disabled={actionLoading === u.id}
                                                >
                                                    {u.is_active ? <Ban size={14} /> : <CheckCircle size={14} />}
                                                </button>
                                                <button
                                                    className="admin-btn admin-btn-ghost admin-btn-sm"
                                                    onClick={() => handleToggleAdmin(u.id, u.is_superuser)}
                                                    disabled={actionLoading === u.id}
                                                    title={u.is_superuser ? 'Revoke admin' : 'Make admin'}
                                                >
                                                    {u.is_superuser ? <Crown size={14} /> : <Key size={14} />}
                                                </button>
                                                <button
                                                    className="admin-btn admin-btn-danger admin-btn-sm"
                                                    onClick={() => handleDelete(u.id, u.email)}
                                                    disabled={actionLoading === u.id}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {data.total_pages > 1 && (
                            <div className="admin-pagination">
                                <button
                                    disabled={data.page <= 1}
                                    onClick={() => fetchUsers(data.page - 1)}
                                >
                                    ← Prev
                                </button>
                                <span className="admin-pagination-info">
                                    Page {data.page} of {data.total_pages}
                                </span>
                                <button
                                    disabled={data.page >= data.total_pages}
                                    onClick={() => fetchUsers(data.page + 1)}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── User Detail Modal ──────────────────── */}
            {(selectedUser || detailLoading) && (
                <div
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000,
                    }}
                    onClick={() => setSelectedUser(null)}
                >
                    <div
                        style={{
                            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 20, padding: 32,
                            width: '90%', maxWidth: 600, maxHeight: '85vh',
                            overflowY: 'auto', position: 'relative',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {detailLoading ? (
                            <SimpleTableRowsSkeleton rows={4} cols={2} />
                        ) : selectedUser && (
                            <>
                                {/* Close button */}
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    style={{
                                        position: 'absolute', top: 16, right: 16,
                                        background: 'none', border: 'none',
                                        color: 'rgba(255,255,255,0.5)', fontSize: '1.4rem',
                                        cursor: 'pointer',
                                    }}
                                >✕</button>

                                {/* Header with avatar */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                                    {selectedUser.picture_url ? (
                                        <img
                                            src={selectedUser.picture_url}
                                            alt=""
                                            style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid rgba(102,126,234,0.4)' }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: 64, height: 64, borderRadius: '50%',
                                            background: 'linear-gradient(135deg,#667eea,#764ba2)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1.5rem', color: '#fff', fontWeight: 700,
                                        }}>
                                            {(selectedUser.full_name || selectedUser.email || '?').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.3rem' }}>
                                            {selectedUser.full_name || 'No Name'}
                                        </h2>
                                        <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                                            {selectedUser.email}
                                        </p>
                                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                            <span className={`admin-badge ${selectedUser.is_active ? 'active' : 'inactive'}`}>
                                                {selectedUser.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            {selectedUser.is_superuser && <span className="admin-badge admin">Admin</span>}
                                            <span className="admin-badge info">
                                                {selectedUser.auth_provider === 'google' ? '🔵 Google' : '✉️ Email'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Info Grid */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px',
                                    marginBottom: 24,
                                }}>
                                    <InfoItem label="User ID" value={selectedUser.id} mono />
                                    {selectedUser.google_id && (
                                        <InfoItem label="Google ID" value={selectedUser.google_id} mono />
                                    )}
                                    <InfoItem label="Auth Provider" value={selectedUser.auth_provider} />
                                    <InfoItem label="Joined" value={new Date(selectedUser.created_at).toLocaleString()} />
                                    <InfoItem label="Last Active" value={selectedUser.last_active ? new Date(selectedUser.last_active).toLocaleString() : 'Never'} />
                                    <InfoItem label="Location" value={selectedUser.location || 'Not set'} />
                                    <InfoItem label="Language" value={selectedUser.preferred_language || 'en'} />
                                </div>

                                {/* Stats */}
                                <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Search size={16} /> Activity Stats</h3>
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
                                    marginBottom: 24,
                                }}>
                                    <MiniStat icon="💬" value={selectedUser.session_count} label="Sessions" />
                                    <MiniStat icon="📨" value={selectedUser.message_count} label="Messages" />
                                    <MiniStat icon="🔍" value={selectedUser.query_count} label="Queries" />
                                    <MiniStat icon="🧠" value={selectedUser.memory_count} label="Memories" />
                                </div>

                                {/* Legal Interests */}
                                {selectedUser.case_types?.length > 0 && (
                                    <div style={{ marginBottom: 16 }}>
                                        <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: 8 }}>⚖️ Case Types</h3>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {selectedUser.case_types.map((t, i) => (
                                                <span key={i} className="admin-badge info">{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {selectedUser.legal_interests?.length > 0 && (
                                    <div style={{ marginBottom: 16 }}>
                                        <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: 8 }}>📚 Legal Interests</h3>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {selectedUser.legal_interests.map((t, i) => (
                                                <span key={i} className="admin-badge info">{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Recent Sessions */}
                                {selectedUser.recent_sessions?.length > 0 && (
                                    <div>
                                        <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: 8 }}>🕓 Recent Sessions</h3>
                                        {selectedUser.recent_sessions.map((s) => (
                                            <div key={s.id} style={{
                                                padding: '8px 12px', marginBottom: 6,
                                                background: 'rgba(255,255,255,0.04)',
                                                borderRadius: 8, fontSize: '0.85rem',
                                                display: 'flex', justifyContent: 'space-between',
                                            }}>
                                                <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                                                    <span className="admin-badge encrypted">
                                                        <Lock size={12} style={{ marginRight: 4 }} />
                                                        User Private
                                                    </span>
                                                </span>
                                                <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                                                    {new Date(s.updated_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}


/* ── Helper Components ─────────────────────────── */
function InfoItem({ label, value, mono = false }) {
    return (
        <div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                {label}
            </div>
            <div style={{
                fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)',
                fontFamily: mono ? 'monospace' : 'inherit',
                wordBreak: 'break-all',
            }}>
                {value}
            </div>
        </div>
    );
}

function MiniStat({ icon, value, label }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '12px 8px', textAlign: 'center',
        }}>
            <div style={{ fontSize: '1rem' }}>{icon}</div>
            <div style={{
                fontSize: '1.3rem', fontWeight: 700,
                background: 'linear-gradient(135deg,#667eea,#764ba2)',
                WebkitBackgroundClip: 'text', color: 'transparent',
            }}>{value}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{label}</div>
        </div>
    );
}
