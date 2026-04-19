/**
 * Your Rights — Legal Knowledge Hub
 *
 * Tabs:
 *  1. Fundamental Rights (Articles 14–32)
 *  2. Quick Guides (arrest, workplace, consumer, women's rights)
 *  3. IPC Sections reference with search
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  BookOpen,
  Scale,
  FileText,
  Search,
  ChevronRight,
  MessageCircle,
  AlertTriangle,
  Users,
  Lock,
  Heart,
  Briefcase,
  Home,
  Globe,
} from 'lucide-react';
import { LegalPageSkeleton } from '../components/SkeletonLoader';
import '../styles/rights.css';

/* ── Data ──────────────────────────────────────────── */

const FUNDAMENTAL_RIGHTS = [
  {
    article: 'Article 14',
    title: 'Right to Equality',
    summary:
      'Equality before law and equal protection of laws within the territory of India.',
    icon: Scale,
  },
  {
    article: 'Article 19',
    title: 'Right to Freedom',
    summary:
      'Freedom of speech, assembly, association, movement, residence, and profession.',
    icon: Globe,
  },
  {
    article: 'Article 21',
    title: 'Right to Life & Liberty',
    summary:
      'No person shall be deprived of life or personal liberty except according to procedure established by law.',
    icon: Heart,
  },
  {
    article: 'Article 22',
    title: 'Protection against Arrest',
    summary:
      'Right to be informed of grounds of arrest, right to consult a lawyer, and to be produced before a magistrate within 24 hours.',
    icon: Shield,
  },
  {
    article: 'Article 23',
    title: 'Prohibition of Trafficking',
    summary: 'Traffic in human beings and forced labour are prohibited.',
    icon: Lock,
  },
  {
    article: 'Article 25',
    title: 'Freedom of Religion',
    summary:
      'Freedom of conscience and free profession, practice, and propagation of religion.',
    icon: Users,
  },
];

const QUICK_GUIDES = [
  {
    title: 'If You Are Arrested',
    icon: Shield,
    points: [
      'You have the right to know the reason for arrest',
      'You have the right to a lawyer',
      'You must be presented before a magistrate within 24 hours',
      'You cannot be tortured or coerced into confession',
      'You can apply for bail',
    ],
  },
  {
    title: 'Workplace Rights',
    icon: Briefcase,
    points: [
      'Right to minimum wages',
      'Right to equal pay for equal work',
      'Protection against sexual harassment',
      'Right to safe working conditions',
      'Right to form trade unions',
    ],
  },
  {
    title: 'Consumer Rights',
    icon: Home,
    points: [
      'Right to safety from harmful products',
      'Right to be informed about quality & price',
      'Right to choose from a variety of products',
      'Right to be heard in case of grievances',
      'Right to seek redressal against unfair trade',
    ],
  },
  {
    title: "Women's Rights",
    icon: Heart,
    points: [
      'Protection of Women from Domestic Violence Act',
      'Dowry Prohibition Act',
      'Equal Remuneration Act',
      'Maternity Benefit Act',
      'Sexual Harassment of Women at Workplace Act',
    ],
  },
];

const IPC_SECTIONS = [
  { section: 'Section 302', title: 'Punishment for Murder', category: 'Criminal' },
  { section: 'Section 376', title: 'Punishment for Rape', category: 'Criminal' },
  { section: 'Section 420', title: 'Cheating & Dishonesty', category: 'Criminal' },
  { section: 'Section 498A', title: 'Cruelty by Husband / Relatives', category: 'Family' },
  { section: 'Section 304B', title: 'Dowry Death', category: 'Criminal' },
  { section: 'Section 354', title: 'Assault on Woman', category: 'Criminal' },
  { section: 'Section 506', title: 'Criminal Intimidation', category: 'Criminal' },
  { section: 'Section 379', title: 'Punishment for Theft', category: 'Property' },
  { section: 'Section 406', title: 'Criminal Breach of Trust', category: 'Property' },
  { section: 'Section 509', title: 'Insult to Modesty of Woman', category: 'Criminal' },
];

/* ── Component ─────────────────────────────────────── */

function Rights() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('rights');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  if (isLoading) return <LegalPageSkeleton />;

  const filteredIPC = IPC_SECTIONS.filter(
    (s) =>
      s.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="rights-page">
      {/* Header */}
      <header className="rights-header">
        <h1>
          <Shield size={28} /> Your Legal Rights
        </h1>
        <p>
          Quick reference to fundamental rights, important IPC sections, and
          legal guides under Indian law.
        </p>
      </header>

      {/* Tabs */}
      <nav className="rights-tabs">
        {[
          { id: 'rights', label: 'Fundamental Rights', icon: Scale },
          { id: 'guides', label: 'Quick Guides', icon: BookOpen },
          { id: 'ipc', label: 'IPC Sections', icon: FileText },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`rights-tab ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="rights-content">
        {/* ── Fundamental Rights ── */}
        {activeTab === 'rights' && (
          <section className="rights-section">
            <div className="rights-grid">
              {FUNDAMENTAL_RIGHTS.map(({ article, title, summary, icon: Icon }) => (
                <div key={article} className="right-card">
                  <div className="right-card-icon">
                    <Icon size={22} />
                  </div>
                  <div className="right-card-body">
                    <span className="right-article">{article}</span>
                    <h3>{title}</h3>
                    <p>{summary}</p>
                  </div>
                  <Link to="/chat" className="right-ask-btn">
                    <MessageCircle size={14} /> Ask AI about this
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Quick Guides ── */}
        {activeTab === 'guides' && (
          <section className="rights-section">
            <div className="guides-grid">
              {QUICK_GUIDES.map(({ title, icon: Icon, points }) => (
                <div key={title} className="guide-card">
                  <div className="guide-header">
                    <Icon size={20} />
                    <h3>{title}</h3>
                  </div>
                  <ul className="guide-points">
                    {points.map((point, i) => (
                      <li key={i}>
                        <ChevronRight size={14} />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/chat" className="guide-ask-btn">
                    <MessageCircle size={14} /> Ask AI for more details
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── IPC Sections ── */}
        {activeTab === 'ipc' && (
          <section className="rights-section">
            <div className="ipc-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search IPC sections…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="ipc-list">
              {filteredIPC.map(({ section, title, category }) => (
                <div key={section} className="ipc-item">
                  <div className="ipc-info">
                    <span className="ipc-section">{section}</span>
                    <span className="ipc-title">{title}</span>
                    <span className="ipc-category">{category}</span>
                  </div>
                  <Link to="/chat" className="ipc-ask-btn">
                    <MessageCircle size={14} /> Ask AI
                  </Link>
                </div>
              ))}
              {filteredIPC.length === 0 && (
                <div className="ipc-empty">
                  <AlertTriangle size={20} />
                  <p>No sections found matching &ldquo;{searchQuery}&rdquo;</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Disclaimer CTA */}
        <div className="rights-cta">
          <AlertTriangle size={18} />
          <p>
            This information is for educational purposes only. For specific
            legal advice, consult a qualified lawyer.
          </p>
          <Link to="/chat" className="rights-cta-btn">
            <MessageCircle size={16} /> Chat with Legal AI
          </Link>
        </div>
      </main>
    </div>
  );
}

export default Rights;
