/**
 * QueryAnalytics — Query volume charts, latency stats, and query log table.
 */
import React, { useState, useEffect } from 'react';
import { Search, Zap, CheckCircle, Lock } from 'lucide-react';
import { getQueryAnalytics, getQueryLogs } from '../../services/adminApi';
import { AdminAnalyticsSkeleton } from '../../components/SkeletonLoader';

export default function QueryAnalytics() {
    const [analytics, setAnalytics] = useState(null);
    const [logs, setLogs] = useState({ logs: [], total: 0, page: 1, per_page: 20 });
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const [a, l] = await Promise.all([
                    getQueryAnalytics(days),
                    getQueryLogs(1, 20),
                ]);
                setAnalytics(a);
                setLogs(l);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [days]);

    const fetchLogs = async (page) => {
        try {
            const l = await getQueryLogs(page, 20);
            setLogs(l);
        } catch (err) {
            console.error('Failed to fetch query logs:', err);
        }
    };

    if (loading) {
        return <AdminAnalyticsSkeleton />;
    }

    if (error) return <div className="admin-empty">{error}</div>;

    const maxCount = analytics?.queries_per_day?.length
        ? Math.max(...analytics.queries_per_day.map(d => d.count), 1)
        : 1;

    return (
        <>
            <div className="admin-page-header">
                <h1>Query Analytics</h1>
                <p>RAG pipeline performance and usage metrics</p>
            </div>

            {/* Stats cards */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="stat-icon"><Search size={20} /></div>
                    <div className="stat-value">{analytics.total_queries}</div>
                    <div className="stat-label">Total Queries ({days}d)</div>
                </div>
                <div className="admin-stat-card">
                    <div className="stat-icon orange"><Zap size={20} /></div>
                    <div className="stat-value">{analytics.avg_latency_ms}ms</div>
                    <div className="stat-label">Avg Latency</div>
                </div>
                <div className="admin-stat-card">
                    <div className="stat-icon green"><CheckCircle size={20} /></div>
                    <div className="stat-value">{analytics.success_rate}%</div>
                    <div className="stat-label">Success Rate</div>
                </div>
            </div>

            {/* Time filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {[7, 14, 30, 90].map((d) => (
                    <button
                        key={d}
                        className={`admin-btn ${days === d ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
                        onClick={() => setDays(d)}
                    >
                        {d}d
                    </button>
                ))}
            </div>

            {/* Bar chart */}
            <div className="admin-chart">
                <h3>Queries per Day</h3>
                {analytics.queries_per_day.length === 0 ? (
                    <div className="admin-empty">No query data for this period</div>
                ) : (
                    <div className="admin-chart-bar-container">
                        {analytics.queries_per_day.map((d, i) => (
                            <div
                                key={i}
                                className="admin-chart-bar"
                                style={{ height: `${(d.count / maxCount) * 180}px` }}
                                title={`${d.date}: ${d.count} queries`}
                            >
                                <span className="admin-chart-bar-label">
                                    {d.date.slice(5)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Query log table */}
            <div className="admin-table-container">
                <div className="admin-table-toolbar">
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>Query Logs</h3>
                    <span className="admin-pagination-info" style={{ marginLeft: 'auto' }}>
                        {logs.total} total queries
                    </span>
                </div>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Query</th>
                            <th>User</th>
                            <th>Latency</th>
                            <th>Sources</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.logs.map((log) => (
                            <tr key={log.id}>
                                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <span className="admin-badge encrypted">
                                        <Lock size={12} style={{ marginRight: 4 }} />
                                        User Private
                                    </span>
                                </td>
                                <td>{log.user_email || '—'}</td>
                                <td>
                                    <span className={`admin-badge ${log.latency_ms > 5000 ? 'warning' : 'active'}`}>
                                        {log.latency_ms}ms
                                    </span>
                                </td>
                                <td>{log.num_sources}</td>
                                <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    {new Date(log.created_at).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {logs.total > logs.per_page && (
                    <div className="admin-pagination">
                        <button disabled={logs.page <= 1} onClick={() => fetchLogs(logs.page - 1)}>
                            ← Prev
                        </button>
                        <span className="admin-pagination-info">Page {logs.page}</span>
                        <button disabled={logs.logs.length < logs.per_page} onClick={() => fetchLogs(logs.page + 1)}>
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
