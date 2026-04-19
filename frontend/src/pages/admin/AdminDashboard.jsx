/**
 * AdminDashboard — Overview with stats cards and recent activity.
 */
import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserPlus, MessageSquare, Mail, Search, Zap, Clock } from 'lucide-react';
import { getDashboardStats } from '../../services/adminApi';
import { AdminDashboardSkeleton } from '../../components/SkeletonLoader';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function load() {
            const minDelay = new Promise(r => setTimeout(r, 1200));
            try {
                const s = await getDashboardStats();
                setStats(s);
            } catch (err) {
                setError(err.message);
            } finally {
                await minDelay;
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <AdminDashboardSkeleton />;

    if (error) {
        return <div className="admin-empty">{error}</div>;
    }

    if (!stats) {
        return <div className="admin-empty">No dashboard data available</div>;
    }

    const cards = [
        { icon: <Users size={20} />, value: stats.total_users, label: 'Total Users', color: '' },
        { icon: <UserCheck size={20} />, value: stats.active_users, label: 'Active (7d)', color: 'green' },
        { icon: <UserPlus size={20} />, value: stats.new_users_today, label: 'New Today', color: 'blue' },
        { icon: <MessageSquare size={20} />, value: stats.total_sessions, label: 'Chat Sessions', color: 'purple' },
        { icon: <Mail size={20} />, value: stats.total_messages, label: 'Messages', color: 'orange' },
        { icon: <Search size={20} />, value: stats.total_queries, label: 'RAG Queries', color: '' },
        { icon: <Zap size={20} />, value: `${stats.avg_response_time_ms}ms`, label: 'Avg Latency', color: 'orange' },
    ];

    return (
        <>
            <div className="admin-page-header">
                <h1>Dashboard</h1>
                <p>Overview of your LawGPT platform</p>
            </div>

            <div className="admin-stats-grid">
                {cards.map((c, i) => (
                    <div className="admin-stat-card" key={i}>
                        <div className={`stat-icon ${c.color}`}>{c.icon}</div>
                        <div className="stat-value">{c.value}</div>
                        <div className="stat-label">{c.label}</div>
                    </div>
                ))}
            </div>
        </>
    );
}
