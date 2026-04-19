/**
 * SkeletonLoader — Production-grade skeleton components
 * Covers all loading states across LawGPT frontend.
 */

import React from 'react';
import '../styles/skeleton.css';

/* ── Primitives ─────────────────────────────────── */

/** A single shimmering block */
export function SkeletonBlock({ width = '100%', height = 16, radius = 8, className = '' }) {
  return (
    <div
      className={`sk-block ${className}`}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

/** A skeleton circle (avatar, icon) */
export function SkeletonCircle({ size = 40, className = '' }) {
  return (
    <div
      className={`sk-block ${className}`}
      style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }}
    />
  );
}

/** A full skeleton text line with optional shorter last line */
export function SkeletonText({ lines = 3, gap = 10, lastLineWidth = '65%' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          height={14}
          width={i === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

/* ── Composed Skeletons ─────────────────────────── */

/** Profile hero card skeleton */
export function ProfileHeroSkeleton() {
  return (
    <div className="sk-profile-hero">
      <div className="sk-hero-top">
        <SkeletonCircle size={72} />
        <div className="sk-hero-info">
          <SkeletonBlock width={200} height={24} radius={6} />
          <SkeletonBlock width={160} height={14} radius={6} />
          <SkeletonBlock width={120} height={14} radius={6} />
        </div>
        <SkeletonBlock width={110} height={36} radius={8} className="sk-ml-auto" />
      </div>
      <div className="sk-quick-actions">
        {[1, 2, 3].map(i => (
          <SkeletonBlock key={i} height={44} radius={10} />
        ))}
      </div>
    </div>
  );
}

/** Stat cards row skeleton */
export function StatsRowSkeleton({ count = 4 }) {
  return (
    <div className="sk-stats-row">
      {Array.from({ length: count }).map((_, i) => (
        <div className="sk-stat-card" key={i}>
          <SkeletonCircle size={36} />
          <div className="sk-stat-body">
            <SkeletonBlock width={48} height={22} radius={6} />
            <SkeletonBlock width={64} height={12} radius={6} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Tab nav skeleton */
export function TabNavSkeleton({ count = 4 }) {
  return (
    <div className="sk-tab-nav">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} width={96} height={36} radius={8} />
      ))}
    </div>
  );
}

/** Card section skeleton */
export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="sk-card">
      <SkeletonBlock width={180} height={18} radius={6} />
      <SkeletonBlock width={260} height={13} radius={6} />
      <SkeletonText lines={lines} />
    </div>
  );
}

/** Table row skeletons */
export function TableRowsSkeleton({ rows = 8, cols = 6 }) {
  return (
    <div className="sk-table-wrapper">
      {/* Header */}
      <div className="sk-table-head">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} height={13} width={`${60 + Math.random() * 40}%`} radius={6} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div className="sk-table-row" key={rowIdx}>
          {/* Avatar + name cell */}
          <div className="sk-table-cell-user">
            <SkeletonCircle size={32} />
            <div style={{ flex: 1 }}>
              <SkeletonBlock height={13} width="70%" radius={6} />
              <SkeletonBlock height={11} width="50%" radius={6} />
            </div>
          </div>
          {Array.from({ length: cols - 1 }).map((_, colIdx) => (
            <SkeletonBlock
              key={colIdx}
              height={13}
              width={`${40 + Math.random() * 40}%`}
              radius={6}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Audit log / simple table skeleton (no avatar) */
export function SimpleTableRowsSkeleton({ rows = 8, cols = 5 }) {
  return (
    <div className="sk-table-wrapper">
      <div className="sk-table-head">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} height={13} width={`${50 + i * 5}%`} radius={6} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div className="sk-table-row" key={rowIdx}>
          {Array.from({ length: cols }).map((_, colIdx) => (
            <SkeletonBlock
              key={colIdx}
              height={13}
              width={colIdx === 0 ? '75%' : `${35 + Math.random() * 35}%`}
              radius={6}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Chat sidebar session list skeleton */
export function SessionListSkeleton({ count = 6 }) {
  return (
    <div className="sk-session-list">
      {Array.from({ length: count }).map((_, i) => (
        <div className="sk-session-item" key={i}>
          <SkeletonCircle size={16} />
          <div style={{ flex: 1 }}>
            <SkeletonBlock height={13} width={`${50 + i * 7}%`} radius={6} />
            <SkeletonBlock height={11} width="40%" radius={6} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Analytics stats card skeleton */
export function AnalyticsStatsSkeleton({ count = 3 }) {
  return (
    <div className="sk-analytics-stats">
      {Array.from({ length: count }).map((_, i) => (
        <div className="sk-analytics-card" key={i}>
          <SkeletonCircle size={40} />
          <SkeletonBlock width={80} height={28} radius={6} />
          <SkeletonBlock width={100} height={12} radius={6} />
        </div>
      ))}
    </div>
  );
}

/** Bar chart skeleton */
export function ChartSkeleton({ bars = 14 }) {
  return (
    <div className="sk-chart">
      <SkeletonBlock width={160} height={18} radius={6} />
      <div className="sk-chart-bars">
        {Array.from({ length: bars }).map((_, i) => {
          const heights = [60, 90, 45, 120, 80, 150, 70, 110, 55, 130, 95, 40, 100, 75];
          return (
            <div key={i} className="sk-chart-bar-col">
              <SkeletonBlock
                width={24}
                height={heights[i % heights.length]}
                radius={4}
              />
              <SkeletonBlock width={24} height={10} radius={4} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Full-page profile skeleton */
export function ProfilePageSkeleton() {
  return (
    <div className="pf-page">
      <div className="pf-shell sk-animate-in">
        {/* Breadcrumb */}
        <div className="sk-breadcrumb">
          <SkeletonBlock width={40} height={13} radius={6} />
          <SkeletonBlock width={60} height={13} radius={6} />
        </div>
        {/* Page header */}
        <div className="sk-page-header">
          <SkeletonBlock width={140} height={28} radius={8} />
          <SkeletonBlock width={280} height={14} radius={6} />
        </div>
        <ProfileHeroSkeleton />
        <StatsRowSkeleton count={4} />
        <TabNavSkeleton count={4} />
        <CardSkeleton lines={4} />
      </div>
    </div>
  );
}

/** Full admin table page skeleton */
export function AdminTableSkeleton({ cols = 6, rows = 8 }) {
  return (
    <div className="sk-animate-in">
      {/* Page header */}
      <div className="sk-admin-page-header">
        <SkeletonBlock width={220} height={26} radius={8} />
        <SkeletonBlock width={100} height={14} radius={6} />
      </div>
      {/* Toolbar */}
      <div className="sk-admin-toolbar">
        <SkeletonBlock height={38} radius={8} width={240} />
        <SkeletonBlock height={38} radius={8} width={140} />
        <SkeletonBlock height={38} radius={8} width={90} />
      </div>
      <TableRowsSkeleton rows={rows} cols={cols} />
    </div>
  );
}

/** Admin analytics page skeleton */
export function AdminAnalyticsSkeleton() {
  return (
    <div className="sk-animate-in">
      <div className="sk-admin-page-header">
        <SkeletonBlock width={200} height={26} radius={8} />
        <SkeletonBlock width={260} height={14} radius={6} />
      </div>
      <AnalyticsStatsSkeleton count={3} />
      {/* Time filter buttons */}
      <div className="sk-analytics-filters">
        {[1, 2, 3, 4].map(i => (
          <SkeletonBlock key={i} width={52} height={34} radius={8} />
        ))}
      </div>
      <ChartSkeleton bars={14} />
      {/* Table */}
      <div className="sk-admin-page-header" style={{ marginTop: 24 }}>
        <SkeletonBlock width={120} height={18} radius={6} />
      </div>
      <SimpleTableRowsSkeleton rows={6} cols={5} />
    </div>
  );
}

/** Chat page initial loading skeleton */
export function ChatLoadingSkeleton() {
  return (
    <div className="sk-chat-loading">
      <div className="sk-chat-brand">
        <SkeletonCircle size={48} />
        <SkeletonBlock width={120} height={22} radius={8} />
      </div>
      <SkeletonText lines={2} lastLineWidth="50%" />
      <div className="sk-chat-example-cards">
        {[1, 2, 3, 4].map(i => (
          <SkeletonBlock key={i} height={60} radius={12} />
        ))}
      </div>
    </div>
  );
}

/** Full landing page skeleton — navbar + hero + 4 sections */
export function LandingPageSkeleton() {
  return (
    <div className="sk-landing-page sk-animate-in">

      {/* ── Navbar ── */}
      <div className="sk-landing-nav">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SkeletonCircle size={32} />
          <SkeletonBlock width={90} height={20} radius={6} />
        </div>
        {/* Nav links */}
        <div className="sk-landing-nav-links">
          {[80, 100, 60].map((w, i) => (
            <SkeletonBlock key={i} width={w} height={14} radius={6} />
          ))}
        </div>
        {/* CTA buttons */}
        <div className="sk-landing-nav-actions">
          <SkeletonBlock width={72} height={36} radius={8} />
          <SkeletonBlock width={110} height={36} radius={8} />
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="sk-landing-hero">
        {/* Left: text + bullets + buttons */}
        <div className="sk-hero-left">
          <SkeletonBlock width={180} height={30} radius={20} />
          <SkeletonBlock width="70%" height={48} radius={8} />
          <SkeletonBlock width="90%" height={28} radius={8} />
          <SkeletonText lines={3} lastLineWidth="55%" />
          <div className="sk-hero-checklist">
            {[1, 2, 3].map(i => (
              <div className="sk-hero-check-item" key={i}>
                <SkeletonCircle size={20} />
                <SkeletonBlock width={`${160 + i * 20}px`} height={14} radius={6} />
              </div>
            ))}
          </div>
          <div className="sk-hero-buttons">
            <SkeletonBlock width={210} height={48} radius={12} />
            <SkeletonBlock width={90} height={48} radius={12} />
          </div>
        </div>

        {/* Right: chat preview card */}
        <div className="sk-chat-preview-skeleton">
          {/* Header */}
          <div className="sk-chat-preview-header">
            <SkeletonCircle size={42} />
            <div className="sk-chat-preview-info">
              <SkeletonBlock width={120} height={15} radius={6} />
              <SkeletonBlock width={90} height={12} radius={6} />
            </div>
            <SkeletonBlock width={64} height={22} radius={12} />
          </div>

          {/* Chat messages */}
          <div className="sk-chat-messages-area">
            {/* User bubble */}
            <div className="sk-chat-bubble-user">
              <SkeletonBlock height={13} radius={6} />
              <SkeletonBlock width="70%" height={13} radius={6} />
            </div>
            {/* Bot bubble */}
            <div className="sk-chat-bubble-bot">
              <SkeletonBlock height={13} radius={6} />
              <SkeletonBlock height={13} radius={6} />
              <SkeletonBlock width="80%" height={13} radius={6} />
              <SkeletonBlock height={13} radius={6} />
              <SkeletonBlock width="60%" height={13} radius={6} />
            </div>
          </div>

          {/* Input row */}
          <div className="sk-chat-preview-input-row">
            <SkeletonBlock height={13} radius={6} style={{ flex: 1 }} />
            <SkeletonCircle size={36} />
          </div>
        </div>
      </div>

      {/* ── Features Section ── */}
      <div className="sk-landing-section">
        <div className="sk-section-header">
          <SkeletonBlock width={90} height={26} radius={20} />
          <SkeletonBlock width={320} height={32} radius={8} />
          <SkeletonBlock width={240} height={14} radius={6} />
        </div>
        <div className="sk-features-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="sk-feature-card" key={i}>
              <SkeletonCircle size={48} />
              <SkeletonBlock width="65%" height={18} radius={6} />
              <SkeletonText lines={3} lastLineWidth="50%" />
            </div>
          ))}
        </div>
      </div>

      {/* ── How It Works Section ── */}
      <div className="sk-landing-section" style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="sk-section-header">
          <SkeletonBlock width={110} height={26} radius={20} />
          <SkeletonBlock width={280} height={32} radius={8} />
          <SkeletonBlock width={360} height={14} radius={6} />
        </div>
        <div className="sk-steps-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="sk-step-card" key={i}>
              <SkeletonCircle size={64} />
              <SkeletonBlock width="75%" height={17} radius={6} />
              <SkeletonText lines={3} lastLineWidth="60%" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Rights Section ── */}
      <div className="sk-landing-section">
        <div className="sk-section-header">
          <SkeletonBlock width={100} height={26} radius={20} />
          <SkeletonBlock width={300} height={32} radius={8} />
          <SkeletonBlock width={380} height={14} radius={6} />
        </div>
        <div className="sk-rights-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="sk-right-card" key={i}>
              <div className="sk-right-card-header">
                <SkeletonCircle size={36} />
                <SkeletonBlock width={100} height={22} radius={20} />
              </div>
              <SkeletonBlock width="70%" height={17} radius={6} />
              <SkeletonText lines={2} lastLineWidth="80%" />
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA Section ── */}
      <div className="sk-cta-section">
        <SkeletonBlock width={320} height={40} radius={8} />
        <SkeletonBlock width={260} height={16} radius={6} />
        <SkeletonBlock width={220} height={52} radius={14} />
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ABOUT PAGE SKELETON
═══════════════════════════════════════════════════════════════ */
export function AboutPageSkeleton() {
  return (
    <div className="sk-about-page">
      {/* back link */}
      <div className="sk-about-back"><SkeletonBlock width={100} height={14} radius={6} /></div>

      {/* hero */}
      <div className="sk-about-hero">
        <SkeletonCircle size={72} />
        <SkeletonBlock width={300} height={36} radius={8} className="sk-mt8" />
        <SkeletonBlock width={200} height={20} radius={6} className="sk-mt8" />
        <SkeletonBlock width={480} height={14} radius={6} className="sk-mt8" />
      </div>

      {/* stats row */}
      <div className="sk-about-stats">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="sk-about-stat-card">
            <SkeletonBlock width={60} height={36} radius={8} />
            <SkeletonBlock width={80} height={14} radius={6} className="sk-mt8" />
          </div>
        ))}
      </div>

      {/* mission section */}
      <div className="sk-about-section">
        <SkeletonBlock width={180} height={24} radius={6} />
        {[...Array(3)].map((_, i) => (
          <SkeletonBlock key={i} width="100%" height={14} radius={6} className="sk-mt8" />
        ))}
      </div>

      {/* team cards */}
      <div className="sk-about-team">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="sk-about-team-card">
            <SkeletonCircle size={64} />
            <SkeletonBlock width={120} height={16} radius={6} className="sk-mt8" />
            <SkeletonBlock width={90} height={12} radius={6} className="sk-mt8" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FAQ PAGE SKELETON
═══════════════════════════════════════════════════════════════ */
export function FAQPageSkeleton() {
  return (
    <div className="sk-faq-page">
      <div className="sk-faq-back"><SkeletonBlock width={100} height={14} radius={6} /></div>

      <div className="sk-faq-hero">
        <SkeletonBlock width={60} height={60} radius={16} />
        <SkeletonBlock width={280} height={36} radius={8} className="sk-mt8" />
        <SkeletonBlock width={380} height={16} radius={6} className="sk-mt8" />
        {/* search bar */}
        <SkeletonBlock width="100%" height={52} radius={12} className="sk-mt16" />
      </div>

      {/* FAQ items */}
      <div className="sk-faq-list">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="sk-faq-item">
            <div className="sk-faq-item-header">
              <SkeletonBlock width={`${60 + (i % 3) * 10}%`} height={16} radius={6} />
              <SkeletonBlock width={24} height={24} radius={6} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONTACT PAGE SKELETON
═══════════════════════════════════════════════════════════════ */
export function ContactPageSkeleton() {
  return (
    <div className="sk-contact-page">
      <div className="sk-contact-back"><SkeletonBlock width={100} height={14} radius={6} /></div>

      <div className="sk-contact-hero">
        <SkeletonBlock width={240} height={36} radius={8} />
        <SkeletonBlock width={360} height={16} radius={6} className="sk-mt8" />
      </div>

      <div className="sk-contact-body">
        {/* info cards */}
        <div className="sk-contact-info">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="sk-contact-info-card">
              <SkeletonCircle size={44} />
              <div className="sk-contact-info-text">
                <SkeletonBlock width={80} height={14} radius={6} />
                <SkeletonBlock width={120} height={12} radius={6} className="sk-mt8" />
              </div>
            </div>
          ))}
        </div>

        {/* form */}
        <div className="sk-contact-form">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="sk-form-field">
              <SkeletonBlock width={80} height={12} radius={6} />
              <SkeletonBlock width="100%" height={i === 3 ? 120 : 48} radius={10} className="sk-mt8" />
            </div>
          ))}
          <SkeletonBlock width={160} height={48} radius={12} className="sk-mt16" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LEGAL PAGE SKELETON  (Privacy / Terms / Disclaimer / Rights)
═══════════════════════════════════════════════════════════════ */
export function LegalPageSkeleton() {
  return (
    <div className="sk-legal-page">
      <div className="sk-legal-back"><SkeletonBlock width={100} height={14} radius={6} /></div>

      {/* title block */}
      <div className="sk-legal-hero">
        <SkeletonBlock width={60} height={60} radius={16} />
        <SkeletonBlock width={320} height={36} radius={8} className="sk-mt8" />
        <SkeletonBlock width={200} height={14} radius={6} className="sk-mt8" />
      </div>

      {/* sections */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="sk-legal-section">
          <SkeletonBlock width={200 + i * 20} height={20} radius={6} />
          {[...Array(3 + (i % 2))].map((_, j) => (
            <SkeletonBlock key={j} width={j === 2 ? '75%' : '100%'} height={14} radius={6} className="sk-mt8" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROFILE DASHBOARD SKELETON
═══════════════════════════════════════════════════════════════ */
export function ProfileDashboardSkeleton() {
  return (
    <div className="sk-profile-page">
      {/* sidebar */}
      <div className="sk-profile-sidebar">
        <SkeletonCircle size={80} />
        <SkeletonBlock width={140} height={18} radius={6} className="sk-mt8" />
        <SkeletonBlock width={100} height={14} radius={6} className="sk-mt8" />
        <div className="sk-profile-nav">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="sk-profile-nav-item">
              <SkeletonCircle size={20} />
              <SkeletonBlock width={100} height={14} radius={6} />
            </div>
          ))}
        </div>
      </div>

      {/* main content */}
      <div className="sk-profile-main">
        {/* stats row */}
        <div className="sk-profile-stats">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="sk-profile-stat-card">
              <SkeletonCircle size={36} />
              <SkeletonBlock width={50} height={28} radius={6} className="sk-mt8" />
              <SkeletonBlock width={80} height={12} radius={6} className="sk-mt8" />
            </div>
          ))}
        </div>

        {/* form card */}
        <div className="sk-profile-form-card">
          <SkeletonBlock width={180} height={22} radius={6} />
          <div className="sk-profile-form-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="sk-form-field">
                <SkeletonBlock width={90} height={12} radius={6} />
                <SkeletonBlock width="100%" height={48} radius={10} className="sk-mt8" />
              </div>
            ))}
          </div>
          <SkeletonBlock width={130} height={44} radius={10} className="sk-mt16" />
        </div>

        {/* memories card */}
        <div className="sk-profile-memories">
          <SkeletonBlock width={160} height={22} radius={6} />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="sk-memory-item">
              <SkeletonCircle size={32} />
              <div className="sk-memory-text">
                <SkeletonBlock width="90%" height={14} radius={6} />
                <SkeletonBlock width="60%" height={12} radius={6} className="sk-mt8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CHAT PAGE SKELETON
═══════════════════════════════════════════════════════════════ */
export function ChatPageSkeleton() {
  return (
    <div className="sk-chat-page">
      {/* sidebar */}
      <div className="sk-chat-sidebar">
        <div className="sk-chat-sidebar-header">
          <SkeletonBlock width={120} height={18} radius={8} />
          <SkeletonBlock width={36} height={36} radius={10} />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="sk-chat-session-item">
            <SkeletonBlock width={`${80 - i * 5}%`} height={14} radius={6} />
            <SkeletonBlock width={50} height={12} radius={6} className="sk-mt8" />
          </div>
        ))}
      </div>

      {/* chat area */}
      <div className="sk-chat-main">
        <div className="sk-chat-messages">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`sk-chat-msg-row ${i % 2 === 0 ? 'sk-user' : 'sk-bot'}`}>
              {i % 2 !== 0 && <SkeletonCircle size={36} />}
              <div className="sk-chat-bubble">
                <SkeletonBlock width={`${60 + (i % 3) * 15}%`} height={14} radius={12} />
                {i % 2 !== 0 && (
                  <SkeletonBlock width="80%" height={14} radius={12} className="sk-mt8" />
                )}
              </div>
              {i % 2 === 0 && <SkeletonCircle size={36} />}
            </div>
          ))}
        </div>
        <div className="sk-chat-input-row">
          <SkeletonBlock width="100%" height={56} radius={16} />
          <SkeletonBlock width={56} height={56} radius={16} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN DASHBOARD SKELETON
═══════════════════════════════════════════════════════════════ */
export function AdminDashboardSkeleton() {
  return (
    <div className="sk-admin-page">
      {/* top nav */}
      <div className="sk-admin-topnav">
        <SkeletonBlock width={160} height={22} radius={8} />
        <SkeletonBlock width={100} height={36} radius={10} />
      </div>

      {/* stats row */}
      <div className="sk-admin-stats-row">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="sk-admin-stat-card">
            <div className="sk-admin-stat-top">
              <SkeletonBlock width={100} height={14} radius={6} />
              <SkeletonCircle size={32} />
            </div>
            <SkeletonBlock width={80} height={32} radius={8} className="sk-mt8" />
            <SkeletonBlock width={120} height={12} radius={6} className="sk-mt8" />
          </div>
        ))}
      </div>

      {/* chart + table row */}
      <div className="sk-admin-body">
        <div className="sk-admin-chart">
          <SkeletonBlock width={180} height={20} radius={6} />
          <SkeletonBlock width="100%" height={220} radius={12} className="sk-mt16" />
        </div>
        <div className="sk-admin-table-card">
          <SkeletonBlock width={160} height={20} radius={6} />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="sk-admin-table-row">
              <SkeletonCircle size={32} />
              <div className="sk-admin-table-cell">
                <SkeletonBlock width={120} height={14} radius={6} />
                <SkeletonBlock width={80} height={12} radius={6} className="sk-mt8" />
              </div>
              <SkeletonBlock width={60} height={24} radius={10} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



/* ═══════════════════════════════════════════════════════════════
   AUTH PAGES SKELETON  (ResetPassword / VerifyEmail)
═══════════════════════════════════════════════════════════════ */
export function AuthCardSkeleton({ fields = 2 }) {
  return (
    <div className="sk-auth-page">
      <div className="sk-auth-card">
        <SkeletonCircle size={64} />
        <SkeletonBlock width={220} height={28} radius={8} className="sk-mt16" />
        <SkeletonBlock width={300} height={14} radius={6} className="sk-mt8" />
        <div className="sk-auth-fields">
          {[...Array(fields)].map((_, i) => (
            <div key={i} className="sk-form-field">
              <SkeletonBlock width={90} height={12} radius={6} />
              <SkeletonBlock width="100%" height={52} radius={12} className="sk-mt8" />
            </div>
          ))}
        </div>
        <SkeletonBlock width="100%" height={52} radius={12} className="sk-mt16" />
        <SkeletonBlock width={160} height={14} radius={6} className="sk-mt16" />
      </div>
    </div>
  );
}
