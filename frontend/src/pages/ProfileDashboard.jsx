/**
 * ProfileDashboard — Production-Level Profile & Settings
 *
 * Clean SaaS design inspired by Stripe / Notion / Linear
 * - Gradient-ring avatar
 * - Quick actions bar
 * - Animated stat counters
 * - Breadcrumb navigation
 * - Tabbed content sections
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Mail, MapPin, Calendar, Edit3, Save, X,
  MessageCircle, Brain, Globe, Shield, Download, Trash2,
  BookOpen, Scale, AlertTriangle, Check, Loader,
  BarChart3, Clock, Star, Languages, Eye, ChevronDown,
  ChevronUp, ChevronRight, ArrowRight, Sparkles,
} from 'lucide-react';
import {
  getUserProfile,
  updateUserProfile,
  getUserStats,
  getUserMemories,
  clearUserMemories,
  exportUserData,
  deleteUserAccount,
} from '../services/api';
import '../styles/profile.css';

/* ── Constants ────────────────────────────────────────── */

const LANGUAGES_LIST = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'ur', label: 'Urdu', native: 'اردو' },
];

const TOPIC_PRESETS = [
  'Criminal Law', 'Family Law', 'Property Law', 'Consumer Rights',
  'Labour Law', 'Constitutional Law', 'Cyber Law', 'Tax Law',
  'Corporate Law', 'Environmental Law', 'Intellectual Property',
  'Human Rights',
];

/* ── Animated Counter ─────────────────────────────────── */

function AnimatedCounter({ value, duration = 1200 }) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const target = typeof value === 'number' ? value : parseInt(value, 10) || 0;
    if (target === 0) { setCount(0); return; }

    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <>{count}</>;
}

/* ── Main Component ───────────────────────────────────── */

function ProfileDashboard({ user, onLogout }) {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [memoryFilter, setMemoryFilter] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedMemory, setExpandedMemory] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [form, setForm] = useState({
    full_name: '',
    location: '',
    preferred_language: 'en',
    legal_interests: [],
  });

  /* ── Data Fetch ───────────────────────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, statsRes, memoriesRes] = await Promise.allSettled([
        getUserProfile(),
        getUserStats(),
        getUserMemories(null, 50),
      ]);

      const p = profileRes.status === 'fulfilled' ? profileRes.value : null;
      const s = statsRes.status === 'fulfilled' ? statsRes.value : null;
      const m = memoriesRes.status === 'fulfilled' ? memoriesRes.value : null;

      if (p) {
        setProfile(p);
        setForm({
          full_name: p.full_name || '',
          location: p.location || '',
          preferred_language: p.preferred_language || 'en',
          legal_interests: p.legal_interests || [],
        });
      }
      if (s) setStats(s);
      if (m) setMemories(m);

      if (!p) showToast('Failed to load profile data', 'error');
    } catch {
      showToast('Failed to load profile data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    fetchAll();
  }, [user, navigate, fetchAll]);

  /* ── Helpers ──────────────────────────────────── */
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleFormChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleInterest = (topic) =>
    setForm((prev) => {
      const list = prev.legal_interests || [];
      return {
        ...prev,
        legal_interests: list.includes(topic)
          ? list.filter((t) => t !== topic)
          : [...list, topic],
      };
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateUserProfile(form);
      setProfile(updated);
      setEditing(false);
      showToast('Profile updated');
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearMemories = async () => {
    try {
      await clearUserMemories();
      setMemories([]);
      showToast('All memories cleared');
    } catch {
      showToast('Failed to clear memories', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lawgpt_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Data exported');
    } catch {
      showToast('Export failed', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteUserAccount();
      showToast('Account deleted. Redirecting…');
      setTimeout(() => { onLogout?.(); navigate('/'); }, 1500);
    } catch {
      showToast('Deletion failed', 'error');
    }
    setShowDeleteConfirm(false);
  };

  const filteredMemories = memoryFilter
    ? memories.filter((m) => m.memory_type === memoryFilter)
    : memories;

  const langLabel = LANGUAGES_LIST.find((l) => l.code === (profile?.preferred_language || 'en'));

  /* ── Loading / Error ──────────────────────────── */
  if (loading) {
    return (
      <div className="pf-page">
        <div className="pf-loader">
          <Loader className="spin" size={28} />
          <p>Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pf-page">
        <div className="pf-loader">
          <AlertTriangle size={28} />
          <p>Your session has expired. Please sign in again.</p>
          <button className="pf-btn pf-btn-primary" onClick={() => { if (onLogout) onLogout(); navigate('/'); }}>Sign In</button>
        </div>
      </div>
    );
  }

  /* ── Render ───────────────────────────────────── */
  return (
    <div className="pf-page">
      {/* Toast */}
      {toast && (
        <div className={`pf-toast ${toast.type}`}>
          {toast.type === 'success' ? <Check size={15} /> : <AlertTriangle size={15} />}
          {toast.message}
        </div>
      )}

      <div className="pf-shell">
        {/* Breadcrumbs */}
        <nav className="pf-breadcrumb">
          <Link to="/chat">Home</Link>
          <ChevronRight size={14} />
          <span className="pf-crumb-current">Profile</span>
        </nav>

        {/* Page Header */}
        <header className="pf-page-header">
          <h1 className="pf-page-title">Settings</h1>
          <p className="pf-page-desc">Manage your account, preferences, and data</p>
        </header>

        {/* ── Hero Card ───────────────────────────── */}
        <section className="pf-hero">
          <div className="pf-hero-top">
            {/* Avatar */}
            <div className="pf-avatar-wrapper">
              <div className="pf-avatar-ring">
                {profile.picture_url ? (
                  <img src={profile.picture_url} alt="" className="pf-avatar-img" />
                ) : (
                  <div className="pf-avatar-fallback">
                    <User size={30} />
                  </div>
                )}
              </div>
              <span className={`pf-provider ${profile.auth_provider}`}>
                {profile.auth_provider === 'google' ? 'Google' : 'Email'}
              </span>
            </div>

            {/* Info */}
            <div className="pf-hero-info">
              {editing ? (
                <input
                  className="pf-input pf-input-name"
                  value={form.full_name}
                  onChange={(e) => handleFormChange('full_name', e.target.value)}
                  placeholder="Your Name"
                  autoFocus
                />
              ) : (
                <h2 className="pf-name">{profile.full_name || 'LawGPT User'}</h2>
              )}

              <span className="pf-meta"><Mail size={13} /> {profile.email}</span>

              {editing ? (
                <div className="pf-input-row">
                  <MapPin size={13} />
                  <input
                    className="pf-input"
                    value={form.location}
                    placeholder="City, State"
                    onChange={(e) => handleFormChange('location', e.target.value)}
                  />
                </div>
              ) : (
                profile.location && <span className="pf-meta"><MapPin size={13} /> {profile.location}</span>
              )}

              <span className="pf-meta muted">
                <Calendar size={13} /> Joined {new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </span>
            </div>

            {/* Actions */}
            <div className="pf-hero-actions">
              {editing ? (
                <>
                  <button className="pf-btn pf-btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader className="spin" size={14} /> : <Save size={14} />} Save
                  </button>
                  <button className="pf-btn pf-btn-ghost" onClick={() => { setForm({ ...profile }); setEditing(false); }}>
                    <X size={14} /> Cancel
                  </button>
                </>
              ) : (
                <button className="pf-btn pf-btn-outline" onClick={() => setEditing(true)}>
                  <Edit3 size={14} /> Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pf-quick-actions">
            <Link to="/chat" className="pf-qa">
              <MessageCircle size={15} />
              <span>New Chat</span>
              <ArrowRight size={13} className="pf-qa-arrow" />
            </Link>
            <Link to="/rights" className="pf-qa">
              <Shield size={15} />
              <span>Your Rights</span>
              <ArrowRight size={13} className="pf-qa-arrow" />
            </Link>
            <button className="pf-qa" onClick={handleExport}>
              <Download size={15} />
              <span>Export Data</span>
              <ArrowRight size={13} className="pf-qa-arrow" />
            </button>
          </div>
        </section>

        {/* ── Stats ───────────────────────────────── */}
        {stats && (
          <section className="pf-stats">
            {[
              { icon: MessageCircle, value: stats.total_sessions, label: 'Sessions', cls: 'sessions' },
              { icon: BarChart3, value: stats.total_messages, label: 'Questions', cls: 'messages' },
              { icon: Brain, value: stats.total_memories, label: 'Memories', cls: 'memories' },
              { icon: Globe, value: stats.languages_used?.length || 1, label: 'Languages', cls: 'languages' },
            ].map(({ icon: Icon, value, label, cls }) => (
              <div className="pf-stat" key={cls}>
                <div className={`pf-stat-icon ${cls}`}><Icon size={17} /></div>
                <div className="pf-stat-body">
                  <span className="pf-stat-value"><AnimatedCounter value={value} /></span>
                  <span className="pf-stat-label">{label}</span>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── Tabs ────────────────────────────────── */}
        <nav className="pf-tabs">
          {[
            { id: 'overview', label: 'General', icon: User },
            { id: 'interests', label: 'Interests', icon: BookOpen },
            { id: 'memory', label: 'AI Memory', icon: Brain },
            { id: 'privacy', label: 'Privacy & Data', icon: Shield },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`pf-tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </nav>

        {/* ── Tab Content ─────────────────────────── */}
        <div className="pf-content">

          {/* GENERAL */}
          {activeTab === 'overview' && (
            <section className="pf-card">
              <div className="pf-card-head">
                <h3 className="pf-card-title"><Languages size={16} /> Language Preference</h3>
                <p className="pf-card-desc">Default language for AI responses. Auto-detect works for any language you type.</p>
              </div>
              {editing ? (
                <div className="pf-lang-grid">
                  {LANGUAGES_LIST.map((lang) => (
                    <button
                      key={lang.code}
                      className={`pf-lang ${form.preferred_language === lang.code ? 'selected' : ''}`}
                      onClick={() => handleFormChange('preferred_language', lang.code)}
                    >
                      <span className="pf-lang-native">{lang.native}</span>
                      <span className="pf-lang-label">{lang.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="pf-lang-current">
                  <Globe size={16} />
                  <span>{langLabel?.native || 'English'}</span>
                  <span className="pf-lang-code">({profile.preferred_language || 'en'})</span>
                </div>
              )}
            </section>
          )}

          {/* INTERESTS */}
          {activeTab === 'interests' && (
            <>
              <section className="pf-card">
                <div className="pf-card-head">
                  <h3 className="pf-card-title"><BookOpen size={16} /> Legal Interests</h3>
                  <p className="pf-card-desc">Select topics you care about — the AI will tailor suggestions accordingly.</p>
                </div>
                <div className="pf-chips">
                  {TOPIC_PRESETS.map((topic) => (
                    <button
                      key={topic}
                      className={`pf-chip ${form.legal_interests.includes(topic) ? 'selected' : ''}`}
                      onClick={() => toggleInterest(topic)}
                    >
                      {form.legal_interests.includes(topic) ? <Check size={13} /> : <BookOpen size={13} />}
                      {topic}
                    </button>
                  ))}
                </div>
                {form.legal_interests.length > 0 && (
                  <div className="pf-chips-footer">
                    <span><Star size={14} /> {form.legal_interests.length} selected</span>
                    <button className="pf-btn pf-btn-primary pf-btn-sm" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader className="spin" size={13} /> : <Save size={13} />} Save
                    </button>
                  </div>
                )}
              </section>

              {stats?.top_topics?.length > 0 && (
                <section className="pf-card">
                  <h3 className="pf-card-title"><Sparkles size={16} /> From Your Conversations</h3>
                  <div className="pf-chips">
                    {stats.top_topics.map((t) => (
                      <span key={t} className="pf-chip suggested">{t}</span>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* AI MEMORY */}
          {activeTab === 'memory' && (
            <section className="pf-card">
              <div className="pf-card-head">
                <div>
                  <h3 className="pf-card-title"><Brain size={16} /> AI Memory</h3>
                  <p className="pf-card-desc">Context the AI remembers to give personalised answers.</p>
                </div>
                {memories.length > 0 && (
                  <button className="pf-btn pf-btn-danger-outline pf-btn-sm" onClick={handleClearMemories}>
                    <Trash2 size={13} /> Clear All
                  </button>
                )}
              </div>

              <div className="pf-filters">
                {[
                  { value: null, label: 'All' },
                  { value: 'conversation_summary', label: 'Summaries' },
                  { value: 'user_fact', label: 'Facts' },
                ].map((f) => (
                  <button
                    key={f.value || 'all'}
                    className={`pf-filter ${memoryFilter === f.value ? 'active' : ''}`}
                    onClick={() => setMemoryFilter(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
                <span className="pf-filter-count">{filteredMemories.length} item{filteredMemories.length !== 1 ? 's' : ''}</span>
              </div>

              {filteredMemories.length === 0 ? (
                <div className="pf-empty">
                  <Brain size={36} />
                  <p>No memories yet. Start chatting to build AI context!</p>
                  <Link to="/chat" className="pf-btn pf-btn-primary pf-btn-sm"><MessageCircle size={14} /> Start Chat</Link>
                </div>
              ) : (
                <div className="pf-mem-list">
                  {filteredMemories.map((m) => (
                    <div
                      key={m.id}
                      className={`pf-mem ${expandedMemory === m.id ? 'open' : ''}`}
                      onClick={() => setExpandedMemory(expandedMemory === m.id ? null : m.id)}
                    >
                      <div className="pf-mem-header">
                        <span className={`pf-mem-badge ${m.memory_type}`}>
                          {m.memory_type === 'conversation_summary' ? 'Summary' : 'Fact'}
                        </span>
                        <span className="pf-mem-date">
                          <Clock size={11} />
                          {new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {expandedMemory === m.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </div>
                      <p className="pf-mem-text">
                        {expandedMemory === m.id
                          ? m.content
                          : m.content.length > 120 ? m.content.slice(0, 120) + '…' : m.content}
                      </p>
                      <div className="pf-mem-meta">
                        <Star size={11} />
                        <span>{((m.importance_score ?? 0) * 100).toFixed(0)}% relevance</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* PRIVACY */}
          {activeTab === 'privacy' && (
            <>
              <section className="pf-card">
                <div className="pf-card-head">
                  <h3 className="pf-card-title"><Shield size={16} /> Privacy & Data Control</h3>
                  <p className="pf-card-desc">Protected under DPDPA 2023 and GDPR. Full control over your information.</p>
                </div>

                <div className="pf-privacy-list">
                  <div className="pf-priv-row">
                    <div className="pf-priv-icon export"><Download size={17} /></div>
                    <div className="pf-priv-info">
                      <h4>Export Your Data</h4>
                      <p>Download profile, chats, and memories in JSON.</p>
                    </div>
                    <button className="pf-btn pf-btn-primary pf-btn-sm" onClick={handleExport}>
                      <Download size={13} /> Export
                    </button>
                  </div>

                  <div className="pf-priv-row">
                    <div className="pf-priv-icon clear"><Brain size={17} /></div>
                    <div className="pf-priv-info">
                      <h4>Clear AI Memories</h4>
                      <p>Remove all AI-generated memory and context.</p>
                    </div>
                    <button className="pf-btn pf-btn-warning pf-btn-sm" onClick={handleClearMemories}>
                      <Trash2 size={13} /> Clear
                    </button>
                  </div>

                  <div className="pf-priv-row danger">
                    <div className="pf-priv-icon danger"><AlertTriangle size={17} /></div>
                    <div className="pf-priv-info">
                      <h4>Delete Account</h4>
                      <p>Permanently delete account and all data. Irreversible.</p>
                    </div>
                    <button className="pf-btn pf-btn-danger pf-btn-sm" onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </section>

              <section className="pf-card">
                <h3 className="pf-card-title"><Scale size={16} /> Compliance</h3>
                <div className="pf-compliance">
                  {[
                    { icon: Shield, title: 'DPDPA 2023', desc: 'Digital Personal Data Protection Act' },
                    { icon: Globe, title: 'GDPR', desc: 'General Data Protection Regulation' },
                    { icon: Eye, title: 'Right to Access', desc: 'Export all your data anytime' },
                    { icon: Trash2, title: 'Right to Erasure', desc: 'Delete your data permanently' },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div className="pf-compliance-item" key={title}>
                      <Icon size={15} />
                      <div><strong>{title}</strong><span>{desc}</span></div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="pf-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
            <AlertTriangle size={36} className="pf-modal-icon" />
            <h3>Delete Your Account?</h3>
            <p>This will permanently delete:</p>
            <ul>
              <li>Your profile and preferences</li>
              <li>All chat sessions and messages</li>
              <li>All AI memories</li>
              <li>Your account credentials</li>
            </ul>
            <p className="pf-modal-warn">This action is <strong>irreversible</strong>.</p>
            <div className="pf-modal-btns">
              <button className="pf-btn pf-btn-ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="pf-btn pf-btn-danger" onClick={handleDeleteAccount}>
                <Trash2 size={13} /> Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileDashboard;
