/**
 * AuditLogs — Security event viewer with filters and pagination.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getAuditLogs } from '../../services/adminApi';
import { SimpleTableRowsSkeleton } from '../../components/SkeletonLoader';

export default function AuditLogs() {
    const [data, setData] = useState({ logs: [], total: 0, page: 1, per_page: 20 });
    const [eventType, setEventType] = useState('');
    const [severity, setSeverity] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await getAuditLogs(page, 20, eventType, severity);
            setData(res);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [eventType, severity]);

    useEffect(() => { fetchLogs(1); }, [fetchLogs]);

    const severityColor = (s) => {
        switch (s?.toLowerCase()) {
            case 'critical': return 'error';
            case 'high': return 'error';
            case 'warning': return 'warning';
            case 'medium': return 'warning';
            default: return 'info';
        }
    };

    return (
        <>
            <div className="admin-page-header">
                <h1>Audit Logs</h1>
                <p>Security events and access monitoring</p>
            </div>

            <div className="admin-table-container">
                <div className="admin-table-toolbar">
                    <select
                        className="admin-filter-select"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                    >
                        <option value="">All Events</option>
                        <option value="login_success">Login Success</option>
                        <option value="login_failure">Login Failure</option>
                        <option value="registration">Registration</option>
                        <option value="password_change">Password Change</option>
                        <option value="google_oauth">Google OAuth</option>
                    </select>
                    <select
                        className="admin-filter-select"
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                    >
                        <option value="">All Severities</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                    </select>
                    <span className="admin-pagination-info" style={{ marginLeft: 'auto' }}>
                        {data.total} entries
                    </span>
                </div>

                {loading ? (
                    <SimpleTableRowsSkeleton rows={8} cols={5} />
                ) : error ? (
                    <div className="admin-empty">⚠️ {error}</div>
                ) : data.logs.length === 0 ? (
                    <div className="admin-empty">No audit logs found</div>
                ) : (
                    <>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Event</th>
                                    <th>User</th>
                                    <th>IP Address</th>
                                    <th>Severity</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.logs.map((log) => (
                                    <tr key={log.id}>
                                        <td style={{ fontWeight: 500 }}>{log.event_type}</td>
                                        <td>{log.user_email || '—'}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                                            {log.ip_address || '—'}
                                        </td>
                                        <td>
                                            <span className={`admin-badge ${severityColor(log.severity)}`}>
                                                {log.severity}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {data.total > data.per_page && (
                            <div className="admin-pagination">
                                <button
                                    disabled={data.page <= 1}
                                    onClick={() => fetchLogs(data.page - 1)}
                                >
                                    ← Prev
                                </button>
                                <span className="admin-pagination-info">
                                    Page {data.page} · {data.total} total
                                </span>
                                <button
                                    disabled={data.logs.length < data.per_page}
                                    onClick={() => fetchLogs(data.page + 1)}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
