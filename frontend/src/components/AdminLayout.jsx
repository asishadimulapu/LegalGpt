/**
 * AdminLayout — Admin-specific layout with sidebar and route guard.
 * Only renders for users with is_superuser=true.
 */
import React from 'react';
import { NavLink, Outlet, Navigate, Link } from 'react-router-dom';
import { Scale, LayoutDashboard, Users, BarChart3, ArrowLeft, ShieldX } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/admin.css';

export default function AdminLayout() {
    const { user } = useAuth();
    // Route guard: redirect non-admins
    if (!user?.is_superuser) {
        return (
            <div className="admin-forbidden">
                <div className="icon"><ShieldX size={48} /></div>
                <h2>Access Denied</h2>
                <p>You don't have permission to access the admin dashboard.</p>
                <Link to="/chat" className="admin-btn admin-btn-primary" style={{ marginTop: 20 }}>
                    <ArrowLeft size={16} /> Back to Chat
                </Link>
            </div>
        );
    }

    const navItems = [
        { to: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
        { to: '/admin/users', icon: <Users size={18} />, label: 'Users', end: false },
        { to: '/admin/analytics', icon: <BarChart3 size={18} />, label: 'Analytics', end: false },
    ];

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-sidebar-brand">
                    <h2><Scale size={20} /> LawGPT</h2>
                    <span>Admin Dashboard</span>
                </div>

                <nav className="admin-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `admin-nav-link${isActive ? ' active' : ''}`
                            }
                        >
                            <span className="icon">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="admin-sidebar-footer">
                    <Link to="/chat" className="admin-back-link">
                        <ArrowLeft size={16} /> Back to Chat
                    </Link>
                </div>
            </aside>

            <main className="admin-content">
                <Outlet />
            </main>
        </div>
    );
}
