import { useState, useEffect, useMemo } from 'react';
import {
  loadClients, persistClient, getOrCreateClientToken,
  removeClient, setClientArchived, getClientPostsOnce,
} from '../services/db';
import './WorkspacePage.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHLY_TARGET = 16;
const PALETTE = ['#4F46E5','#7C3AED','#2563EB','#059669','#D97706','#DC2626','#0891B2','#BE185D'];
const EMOJI_SUGGESTIONS = ['🏢','💄','🏠','🍕','🐾','💪','📸','👗','🌿','🎨','🚗','💅'];
const EMPTY_FORM = { name: '', handle: '', emoji: '🏢', color: PALETTE[0], description: '', phone: '' };
const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const NAV = [
  { id: 'dashboard',     label: 'Dashboard'     },
  { id: 'clientes',      label: 'Clientes'       },
  { id: 'calendario',    label: 'Calendário'     },
  { id: 'posts',         label: 'Posts'          },
  { id: 'relatorios',    label: 'Relatórios'     },
  { id: 'configuracoes', label: 'Configurações'  },
];

const NAV_ICONS = {
  dashboard:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  clientes:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  calendario:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  posts:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  relatorios:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  configuracoes: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name = '') {
  return name.split(/[\s&\-_]+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function capitalizeFirst(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Social icons ──────────────────────────────────────────────────────────────
const InstagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none"/>
  </svg>
);
const TikTokIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z"/>
  </svg>
);
const LinkedInIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);
const FacebookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
  </svg>
);

// ── Client Card ───────────────────────────────────────────────────────────────
function ClientCard({ client, allPosts, currentMonthStr, todayDateStr, isSM, onSelect, onGenerateLink, onArchive, onRequestDelete, confirmDelete, onConfirmDelete, setConfirmDelete, generating }) {
  const postsMonth = allPosts.filter(p => p.clientId === client.id && p.date?.startsWith(currentMonthStr));
  const nextPost   = allPosts
    .filter(p => p.clientId === client.id && p.date >= todayDateStr)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const progress = Math.min(postsMonth.length / MONTHLY_TARGET, 1);

  const formatNextDate = (dateStr) =>
    new Date(dateStr + 'T12:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');

  return (
    <div
      className={`cf-client-card${client.archived ? ' cf-archived' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => !client.archived && onSelect(client)}
      onKeyDown={(e) => e.key === 'Enter' && !client.archived && onSelect(client)}
    >
      {/* Header */}
      <div className="cf-cc-header">
        <div className="cf-cc-avatar" style={{ background: client.color }}>
          {client.emoji && client.emoji !== '🏢' ? client.emoji : getInitials(client.name)}
        </div>
        <div className="cf-cc-info">
          <div className="cf-cc-name">{client.name}</div>
          <div className="cf-cc-cat">{client.description || client.handle || '—'}</div>
        </div>
      </div>

      {/* Social icons */}
      <div className="cf-cc-socials">
        {client.handle && <span className="cf-cc-social-icon" title="Instagram"><InstagramIcon /></span>}
        <span className="cf-cc-social-icon" title="TikTok"><TikTokIcon /></span>
        {client.description?.toLowerCase().includes('linkedin') && <span className="cf-cc-social-icon" title="LinkedIn"><LinkedInIcon /></span>}
        {client.description?.toLowerCase().includes('facebook') && <span className="cf-cc-social-icon" title="Facebook"><FacebookIcon /></span>}
      </div>

      {/* Progress */}
      <div className="cf-cc-progress-wrap">
        <div className="cf-cc-progress-row">
          <span className="cf-cc-progress-label">Posts do mês</span>
          <span className="cf-cc-progress-count">{postsMonth.length}/{MONTHLY_TARGET}</span>
        </div>
        <div className="cf-cc-progress-track">
          <div className="cf-cc-progress-fill" style={{ width: `${progress * 100}%`, background: client.color }} />
        </div>
      </div>

      {/* Next post */}
      <div className="cf-cc-footer">
        {nextPost ? (
          <span className="cf-cc-next">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            Próximo post: {formatNextDate(nextPost.date)}
          </span>
        ) : (
          <span className="cf-cc-next cf-cc-next-empty">Sem posts futuros</span>
        )}
        {!client.archived && (
          <span className="cf-cc-access">Acessar →</span>
        )}
      </div>

      {/* SM actions */}
      {isSM && (
        <div className="cf-cc-actions" onClick={e => e.stopPropagation()}>
          {!client.archived && (
            <button className="cf-cc-action-link" onClick={(e) => onGenerateLink(e, client)} disabled={generating} title="Gerar link do cliente">
              🔗 Link
            </button>
          )}
          <button className="cf-cc-action" onClick={(e) => onArchive(e, client)} title={client.archived ? 'Restaurar' : 'Arquivar'}>
            {client.archived ? '↩ Restaurar' : '📁 Arquivar'}
          </button>
          {confirmDelete === client.id ? (
            <>
              <button className="cf-cc-action cf-cc-action-yes" onClick={() => onConfirmDelete(client.id)}>✓ Sim</button>
              <button className="cf-cc-action" onClick={() => setConfirmDelete(null)}>✕</button>
            </>
          ) : (
            <button className="cf-cc-action cf-cc-action-del" onClick={() => onRequestDelete(client.id)} title="Excluir">🗑</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, iconBg, iconColor, icon }) {
  return (
    <div className="cf-kpi-card">
      <div className="cf-kpi-body">
        <div className="cf-kpi-label">{label}</div>
        <div className="cf-kpi-value">{value}</div>
        <div className="cf-kpi-sub">{sub}</div>
      </div>
      <div className="cf-kpi-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WorkspacePage({ userRole, firebaseUser, onSelectClient, onLogout, onSwitchAccount }) {
  const [clients,         setClients]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [activeSection,   setActiveSection]   = useState('dashboard');
  const [allPosts,        setAllPosts]        = useState([]);
  const [loadingPosts,    setLoadingPosts]    = useState(false);
  const [selectedPreviewPost, setSelectedPreviewPost] = useState(null);
  const [showModal,       setShowModal]       = useState(false);
  const [form,            setForm]            = useState(EMPTY_FORM);
  const [saving,          setSaving]          = useState(false);
  const [linkModal,       setLinkModal]       = useState(null);
  const [generating,      setGenerating]      = useState(false);
  const [confirmDelete,   setConfirmDelete]   = useState(null);
  const [clientSearch,    setClientSearch]    = useState('');

  const isSM  = userRole === 'social-media';
  const uid   = firebaseUser?.uid;
  const email = firebaseUser?.email;

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    loadClients(uid, email).then(setClients).catch(console.error).finally(() => setLoading(false));
  }, [uid, email]);

  useEffect(() => {
    if (!clients.length) return;
    setLoadingPosts(true);
    Promise.all(
      clients.map(async (c) => {
        const posts = await getClientPostsOnce(c.id).catch(() => []);
        return posts.map(p => ({ ...p, clientId: c.id, clientName: c.name, clientColor: c.color ?? '#4F46E5', clientEmoji: c.emoji ?? '🏢' }));
      })
    ).then(r => setAllPosts(r.flat())).catch(console.error).finally(() => setLoadingPosts(false));
  }, [clients]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const id = `client_${Date.now()}`;
    const newClient = { id, name: form.name.trim().toUpperCase(), handle: form.handle.trim() || '', emoji: form.emoji?.trim() || '🏢', color: form.color, description: form.description.trim(), phone: form.phone.trim() || '', createdAt: new Date().toISOString() };
    await persistClient(newClient, uid).catch(console.error);
    setClients(prev => [...prev, newClient]);
    setShowModal(false);
    setSaving(false);
    setForm(EMPTY_FORM);
  };

  const closeModal = () => { setShowModal(false); setForm(EMPTY_FORM); };

  const handleGenerateLink = async (e, client, forceNew = false) => {
    e.stopPropagation();
    setGenerating(true);
    try {
      const token = await getOrCreateClientToken(client.id, uid, forceNew);
      const url = `${window.location.origin}/?token=${token}`;
      setLinkModal({ client, token, url });
    } catch (err) { console.error(err); } finally { setGenerating(false); }
  };

  const handleArchive = async (e, client) => {
    e.stopPropagation();
    const next = !client.archived;
    await setClientArchived(client.id, next).catch(console.error);
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, archived: next } : c));
  };

  const handleDeleteConfirm = async (clientId) => {
    await removeClient(clientId).catch(console.error);
    setClients(prev => prev.filter(c => c.id !== clientId));
    setConfirmDelete(null);
  };

  const handlePostClick = (post) => {
    const client = clients.find(c => c.id === post.clientId) ?? null;
    setSelectedPreviewPost({ post, client });
  };

  const activeClients   = clients.filter(c => !c.archived);
  const archivedClients = clients.filter(c =>  c.archived);

  // ── KPI data ──────────────────────────────────────────────────────────────
  const today          = new Date();
  const todayDateStr   = today.toISOString().slice(0, 10);
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const publishedMonth = allPosts.filter(p => p.status === 'Publicado' && p.date?.startsWith(currentMonthStr)).length;
  const scheduledCount = allPosts.filter(p => p.status === 'Agendado').length;
  const pendingReview  = allPosts.filter(p => p.enviadoParaAprovacao && !p.clienteReview).length;

  const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek   = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);
  const postsThisWeek = allPosts.filter(p => p.date >= startOfWeek.toISOString().slice(0, 10) && p.date <= endOfWeek.toISOString().slice(0, 10)).length;

  const firstName = firebaseUser?.displayName?.split(' ')[0] ?? 'Social Media';
  const todayLabel = capitalizeFirst(today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

  // ── Filtered clients ──────────────────────────────────────────────────────
  const filteredClients = useMemo(() =>
    activeClients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || (c.description ?? '').toLowerCase().includes(clientSearch.toLowerCase())),
    [activeClients, clientSearch]
  );

  const sectionLabel = NAV.find(n => n.id === activeSection)?.label ?? 'Dashboard';

  const clientCardProps = { allPosts, currentMonthStr, todayDateStr, isSM, onSelect: onSelectClient, onGenerateLink: handleGenerateLink, onArchive: handleArchive, onRequestDelete: setConfirmDelete, confirmDelete, onConfirmDelete: handleDeleteConfirm, setConfirmDelete, generating };

  return (
    <div className="cf-page">

      {/* ── Sidebar ── */}
      <aside className="cf-sidebar">
        {/* Brand */}
        <div className="cf-sidebar-brand">
          <div className="cf-sidebar-logo-icon">⚡</div>
          <div>
            <div className="cf-sidebar-logo-text">ContentFlow</div>
            <div className="cf-sidebar-logo-role">SOCIAL MANAGER</div>
          </div>
        </div>

        {/* Nav */}
        <div className="cf-sidebar-section-label">MENU</div>
        <nav className="cf-sidebar-nav">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`cf-sidebar-nav-item${activeSection === item.id ? ' active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="cf-nav-icon-wrap">{NAV_ICONS[item.id]}</span>
              <span className="cf-nav-label">{item.label}</span>
              {activeSection === item.id && <span className="cf-nav-active-dot" />}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="cf-sidebar-footer">
          <div className="cf-sidebar-user">
            <div className="cf-sidebar-user-avatar">
              {getInitials(firebaseUser?.displayName ?? 'U')}
            </div>
            <div className="cf-sidebar-user-info">
              <div className="cf-sidebar-user-name">{firebaseUser?.displayName ?? 'Usuário'}</div>
              <div className="cf-sidebar-user-email">{firebaseUser?.email ?? ''}</div>
            </div>
          </div>
          <button className="cf-sidebar-logout" onClick={onLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Sair
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="cf-main">

        {/* Header bar */}
        <header className="cf-header">
          <div className="cf-header-left">
            <h1 className="cf-header-title">{sectionLabel}</h1>
            <p className="cf-header-date">{todayLabel}</p>
          </div>
          <div className="cf-header-right">
            <button className="cf-bell-btn" title="Notificações">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
            </button>
            {isSM && (
              <button className="cf-btn-primary" onClick={() => setShowModal(true)}>
                + Novo Cliente
              </button>
            )}
          </div>
        </header>

        {/* Scrollable content */}
        <div className="cf-content">

          {/* ── DASHBOARD ── */}
          {activeSection === 'dashboard' && (
            <>
              {/* Greeting */}
              <div className="cf-greeting">
                <h2 className="cf-greeting-title">Olá, {firstName}!</h2>
                <p className="cf-greeting-sub">
                  Você tem <strong>{postsThisWeek} posts agendados</strong> para esta semana.
                </p>
              </div>

              {/* KPI row */}
              <div className="cf-kpi-row">
                <KpiCard
                  label="Total de Clientes"
                  value={activeClients.length}
                  sub={`${activeClients.length} ativos`}
                  iconBg="#EEF2FF"
                  iconColor="#4F46E5"
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
                />
                <KpiCard
                  label="Posts Publicados"
                  value={publishedMonth}
                  sub="neste mês"
                  iconBg="#DCFCE7"
                  iconColor="#16A34A"
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
                />
                <KpiCard
                  label="Posts Agendados"
                  value={scheduledCount}
                  sub={`${pendingReview} em revisão`}
                  iconBg="#F3F4FF"
                  iconColor="#6366F1"
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                />
                <KpiCard
                  label="Engajamento Médio"
                  value={allPosts.length > 0 ? `${((publishedMonth / Math.max(allPosts.length, 1)) * 100).toFixed(1)}%` : '—'}
                  sub={publishedMonth > 0 ? '↑ publicações no mês' : 'sem dados suficientes'}
                  iconBg="#FEFCE8"
                  iconColor="#CA8A04"
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
                />
              </div>

              {/* Clients section */}
              <div className="cf-section">
                <div className="cf-section-header">
                  <div>
                    <h3 className="cf-section-title">Clientes</h3>
                    <p className="cf-section-sub">{activeClients.length} cliente{activeClients.length !== 1 ? 's' : ''} ativo{activeClients.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="cf-section-header-right">
                    <div className="cf-search-wrap">
                      <svg className="cf-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                      <input
                        className="cf-search-input"
                        type="text"
                        placeholder="Buscar cliente..."
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                      />
                    </div>
                    {isSM && (
                      <button className="cf-btn-outline" onClick={() => setShowModal(true)}>+ Adicionar</button>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="cf-loading"><div className="cf-spinner" />Carregando clientes…</div>
                ) : (
                  <div className="cf-clients-grid">
                    {filteredClients.map(c => (
                      <ClientCard key={c.id} client={c} {...clientCardProps} />
                    ))}
                    {filteredClients.length === 0 && (
                      <div className="cf-empty-search">Nenhum cliente encontrado para "{clientSearch}"</div>
                    )}
                    {isSM && !clientSearch && (
                      <button className="cf-add-client-card" onClick={() => setShowModal(true)}>
                        <span className="cf-add-client-icon">+</span>
                        <span>Adicionar<br />Cliente</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Archived clients (collapsible) */}
              {archivedClients.length > 0 && (
                <div className="cf-section cf-archived-section">
                  <details>
                    <summary className="cf-archived-toggle">
                      📁 Clientes arquivados ({archivedClients.length})
                    </summary>
                    <div className="cf-clients-grid cf-clients-grid-archived">
                      {archivedClients.map(c => (
                        <ClientCard key={c.id} client={c} {...clientCardProps} />
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Calendar */}
              <div className="cf-section">
                <div className="cf-section-header">
                  <h3 className="cf-section-title">Calendário</h3>
                </div>
                <div className="cf-calendar-wrap">
                  <WorkspaceCalendar allPosts={allPosts} onPostClick={handlePostClick} />
                </div>
              </div>
            </>
          )}

          {/* ── CLIENTES ── */}
          {activeSection === 'clientes' && (
            <div className="cf-section">
              <div className="cf-section-header">
                <div>
                  <h3 className="cf-section-title">Clientes</h3>
                  <p className="cf-section-sub">{activeClients.length} ativo{activeClients.length !== 1 ? 's' : ''}{archivedClients.length > 0 ? ` · ${archivedClients.length} arquivado${archivedClients.length !== 1 ? 's' : ''}` : ''}</p>
                </div>
                <div className="cf-section-header-right">
                  <div className="cf-search-wrap">
                    <svg className="cf-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <input className="cf-search-input" type="text" placeholder="Buscar cliente..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
                  </div>
                  {isSM && <button className="cf-btn-outline" onClick={() => setShowModal(true)}>+ Adicionar</button>}
                </div>
              </div>
              {loading ? (
                <div className="cf-loading"><div className="cf-spinner" />Carregando…</div>
              ) : (
                <div className="cf-clients-grid">
                  {filteredClients.map(c => <ClientCard key={c.id} client={c} {...clientCardProps} />)}
                  {archivedClients.filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => <ClientCard key={c.id} client={c} {...clientCardProps} />)}
                  {filteredClients.length === 0 && <div className="cf-empty-search">Nenhum cliente encontrado.</div>}
                  {isSM && !clientSearch && <button className="cf-add-client-card" onClick={() => setShowModal(true)}><span className="cf-add-client-icon">+</span><span>Adicionar<br />Cliente</span></button>}
                </div>
              )}
            </div>
          )}

          {/* ── CALENDÁRIO ── */}
          {activeSection === 'calendario' && (
            <div className="cf-section">
              <div className="cf-calendar-wrap">
                <WorkspaceCalendar allPosts={allPosts} onPostClick={handlePostClick} />
              </div>
            </div>
          )}

          {/* Placeholders */}
          {['posts', 'relatorios', 'configuracoes'].includes(activeSection) && (
            <SectionPlaceholder
              icon={activeSection === 'posts' ? '📝' : activeSection === 'relatorios' ? '📊' : '⚙️'}
              title={sectionLabel}
              desc="Essa funcionalidade estará disponível em breve."
            />
          )}

        </div>
      </div>

      {/* ── Modal: Novo Cliente ── */}
      {showModal && (
        <div className="ws-modal-backdrop" onClick={closeModal}>
          <div className="ws-modal" onClick={e => e.stopPropagation()}>
            <div className="ws-modal-header">
              <h3>Novo Cliente</h3>
              <button className="ws-modal-close" onClick={closeModal}>✕</button>
            </div>
            <form className="ws-modal-form" onSubmit={handleAdd}>
              <label className="ws-field"><span>Nome do cliente <span className="ws-req">*</span></span>
                <input type="text" placeholder="Ex: Beauty Studio" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
              </label>
              <label className="ws-field"><span>Perfil Instagram</span>
                <input type="text" placeholder="@perfil" value={form.handle} onChange={e => setForm(f => ({ ...f, handle: e.target.value }))} />
              </label>
              <label className="ws-field"><span>Descrição</span>
                <input type="text" placeholder="Ex: Moda feminina, e-commerce" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </label>
              <label className="ws-field"><span>WhatsApp <span style={{ fontWeight: 400, color: '#9E9E9E', fontSize: 12 }}>(opcional)</span></span>
                <input type="tel" placeholder="5511999999999" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </label>
              <div className="ws-modal-row">
                <label className="ws-field" style={{ flex: 1 }}><span>Ícone</span>
                  <input type="text" placeholder="🏢" value={form.emoji} maxLength={4} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} className="ws-emoji-input" />
                </label>
                <div className="ws-field" style={{ flex: 3 }}><span>Sugestões</span>
                  <div className="ws-emoji-grid">
                    {EMOJI_SUGGESTIONS.map(em => (
                      <button key={em} type="button" className={`ws-emoji-btn ${form.emoji === em ? 'selected' : ''}`} onClick={() => setForm(f => ({ ...f, emoji: em }))}>{em}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="ws-field"><span>Cor de destaque</span>
                <div className="ws-palette">
                  {PALETTE.map(c => (
                    <button key={c} type="button" className={`ws-color-dot ${form.color === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => setForm(f => ({ ...f, color: c }))} />
                  ))}
                </div>
              </div>
              <div className="ws-preview">
                <div className="ws-preview-label">Pré-visualização</div>
                <div className="ws-preview-card" style={{ borderTopColor: form.color }}>
                  <div className="ws-preview-avatar" style={{ background: `${form.color}22` }}>{form.emoji || '🏢'}</div>
                  <div>
                    <div className="ws-preview-name">{form.name.toUpperCase() || 'NOME DO CLIENTE'}</div>
                    <div className="ws-preview-handle">{form.handle || '@perfil'}</div>
                  </div>
                </div>
              </div>
              <div className="ws-modal-actions">
                <button type="button" className="ws-btn-cancel" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="ws-btn-submit" style={{ background: form.color }} disabled={saving || !form.name.trim()}>
                  {saving ? 'Criando…' : '✓ Criar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Post Preview ── */}
      {selectedPreviewPost && (
        <PostPreviewModal
          post={selectedPreviewPost.post}
          client={selectedPreviewPost.client}
          onClose={() => setSelectedPreviewPost(null)}
          onSelectClient={c => { setSelectedPreviewPost(null); onSelectClient(c); }}
        />
      )}

      {/* ── Modal: Link do Cliente ── */}
      {linkModal && (
        <div className="ws-modal-backdrop" onClick={() => setLinkModal(null)}>
          <div className="ws-modal" onClick={e => e.stopPropagation()}>
            <div className="ws-modal-header">
              <h3>🔗 Link — {linkModal.client.name}</h3>
              <button className="ws-modal-close" onClick={() => setLinkModal(null)}>✕</button>
            </div>
            <div className="ws-link-modal-body">
              <div className="ws-link-section">
                <div className="ws-link-label">Link completo</div>
                <div className="ws-link-url-row">
                  <input className="ws-link-url-input" type="text" readOnly value={linkModal.url} onFocus={e => e.target.select()} />
                  <button className="ws-link-copy-btn" onClick={() => navigator.clipboard.writeText(linkModal.url)}>📋 Copiar</button>
                </div>
              </div>
              <div className="ws-link-section">
                <div className="ws-link-label">Senha (token)</div>
                <div className="ws-link-token-row">
                  <code className="ws-link-token">{linkModal.token}</code>
                  <button className="ws-link-copy-btn ws-link-copy-btn--ghost" onClick={() => navigator.clipboard.writeText(linkModal.token)}>📋 Copiar</button>
                </div>
              </div>
              <div className="ws-modal-actions">
                <button className="ws-btn-cancel" onClick={() => setLinkModal(null)}>Fechar</button>
                <button className="ws-btn-submit" style={{ background: '#4F46E5' }} onClick={e => handleGenerateLink(e, linkModal.client, true)} disabled={generating}>
                  {generating ? 'Gerando…' : '🔄 Novo link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section: Placeholder ──────────────────────────────────────────────────────
function SectionPlaceholder({ icon, title, desc }) {
  return (
    <div className="cf-placeholder">
      <div className="cf-placeholder-icon">{icon}</div>
      <div className="cf-placeholder-title">{title}</div>
      <div className="cf-placeholder-desc">{desc}</div>
    </div>
  );
}

// ── Workspace Calendar ────────────────────────────────────────────────────────
const CAL_VIEWS = [{ id:'dia', label:'Dia' }, { id:'3dias', label:'3 dias' }, { id:'semana', label:'Semana' }, { id:'mes', label:'Mês' }];

function dateToStr(d) { return d.toISOString().slice(0, 10); }
function isToday(d) { const t = new Date(); return d.getFullYear()===t.getFullYear() && d.getMonth()===t.getMonth() && d.getDate()===t.getDate(); }

function WorkspaceCalendar({ allPosts, onPostClick }) {
  const [view, setView]       = useState('mes');
  const [calDate, setCalDate] = useState(new Date());

  const navigate = (dir) => setCalDate(prev => {
    const d = new Date(prev);
    if (view==='mes')    d.setMonth(d.getMonth() + dir);
    if (view==='semana') d.setDate(d.getDate() + dir * 7);
    if (view==='3dias')  d.setDate(d.getDate() + dir * 3);
    if (view==='dia')    d.setDate(d.getDate() + dir);
    return d;
  });

  const getDays = () => {
    if (view==='dia')    return [new Date(calDate)];
    if (view==='3dias')  return [0,1,2].map(i => { const d=new Date(calDate); d.setDate(d.getDate()+i); return d; });
    if (view==='semana') { const dow=calDate.getDay(); return Array.from({length:7},(_,i) => { const d=new Date(calDate); d.setDate(d.getDate()-dow+i); return d; }); }
    return null;
  };

  const getLabel = () => {
    if (view==='mes') return calDate.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
    if (view==='dia') return calDate.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
    const days = getDays();
    return `${days[0].toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })} – ${days[days.length-1].toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' })}`;
  };

  const days = view !== 'mes' ? getDays() : null;

  return (
    <div className="ws-cal">
      <div className="ws-cal-nav">
        <button className="ws-cal-nav-btn" onClick={() => navigate(-1)}>‹</button>
        <span className="ws-cal-month-label">{getLabel()}</span>
        <button className="ws-cal-nav-btn" onClick={() => navigate(1)}>›</button>
        <div className="ws-cal-view-tabs">
          {CAL_VIEWS.map(v => <button key={v.id} className={`ws-cal-view-tab${view===v.id?' active':''}`} onClick={() => setView(v.id)}>{v.label}</button>)}
        </div>
      </div>
      {view==='mes'  && <CalMonthView  calDate={calDate} allPosts={allPosts} onPostClick={onPostClick} />}
      {view!=='mes'  && <CalMultiDayView days={days} allPosts={allPosts} onPostClick={onPostClick} view={view} />}
    </div>
  );
}

function CalMonthView({ calDate, allPosts, onPostClick }) {
  const year=calDate.getFullYear(), month=calDate.getMonth();
  const monthStr    = `${year}-${String(month+1).padStart(2,'0')}`;
  const monthPosts  = allPosts.filter(p => p.date?.startsWith(monthStr));
  const postsByDay  = {};
  monthPosts.forEach(p => { const day=p.date?.slice(8,10); if(!day) return; (postsByDay[day]??=[]).push(p); });
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  return (
    <div className="ws-cal-grid ws-cal-month-grid">
      {WEEKDAYS.map(d => <div key={d} className="ws-cal-weekday">{d}</div>)}
      {cells.map((day, i) => {
        if (!day) return <div key={`e${i}`} className="ws-cal-cell ws-cal-empty" />;
        const dayStr = String(day).padStart(2,'0');
        const posts  = postsByDay[dayStr] ?? [];
        const today  = isToday(new Date(year, month, day));
        return (
          <div key={day} className={`ws-cal-cell ws-cal-month-cell${today?' ws-cal-today':''}`}>
            <span className={`ws-cal-day-num${today?' ws-cal-today-num':''}`}>{day}</span>
            <div className="ws-cal-pills">
              {posts.slice(0,3).map((p,idx) => (
                <button key={idx} className="ws-cal-pill" style={{ borderLeftColor: p.clientColor }} onClick={() => onPostClick?.(p)} title={p.title}>
                  <span className="ws-cal-pill-title">{p.title}</span>
                </button>
              ))}
              {posts.length>3 && <span className="ws-cal-pill-more">+{posts.length-3} mais</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalMultiDayView({ days, allPosts, onPostClick, view }) {
  return (
    <div className={`ws-cal-multiday ws-cal-multiday-${view}`}>
      {days.map(day => {
        const dateStr = dateToStr(day);
        const posts   = allPosts.filter(p => p.date === dateStr);
        const today   = isToday(day);
        const dayLabel = day.toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short' });
        return (
          <div key={dateStr} className={`ws-cal-day-col${today?' ws-cal-day-col-today':''}`}>
            <div className="ws-cal-day-col-header"><span className={`ws-cal-day-col-label${today?' today':''}`}>{dayLabel}</span></div>
            <div className="ws-cal-day-col-body">
              {posts.length===0 ? <div className="ws-cal-no-posts">Sem posts</div> : posts.map((p,idx) => (
                <button key={idx} className="ws-cal-post-card" onClick={() => onPostClick?.(p)}>
                  <div className="ws-cal-post-card-bar" style={{ background: p.clientColor }} />
                  <div className="ws-cal-post-card-body">
                    <div className="ws-cal-post-card-client">{p.clientEmoji} {p.clientName}</div>
                    <div className="ws-cal-post-card-title">{p.title}</div>
                    {p.format && <span className="ws-cal-post-card-format">{p.format}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Post Preview Modal ────────────────────────────────────────────────────────
function isImage(att) { return /\.(jpe?g|png|gif|webp|avif|svg|bmp)$/i.test(att.name ?? ''); }

function AttachmentsSection({ attachments }) {
  const images = attachments.filter(isImage);
  const files  = attachments.filter(a => !isImage(a));
  return (
    <div className="ws-att-section">
      <div className="ws-att-header"><span className="ws-att-label">🖼 Mídias</span><span className="ws-att-count">{attachments.length} arquivo{attachments.length!==1?'s':''}</span></div>
      {images.length>0 && <div className="ws-att-grid">{images.map(att => <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="ws-att-thumb-wrap" title={att.name}><img src={att.url} alt={att.name} className="ws-att-thumb" /><div className="ws-att-thumb-overlay">🔍</div></a>)}</div>}
      {files.length>0 && <div className="ws-att-files">{files.map(att => <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="ws-att-file-chip" title={att.name}><span className="ws-att-file-icon">📎</span><span className="ws-att-file-name">{att.name}</span></a>)}</div>}
    </div>
  );
}

const STATUS_STYLES = { 'Planejado':{ bg:'#F3E5F5', color:'#6A1B9A' }, 'Em Produção':{ bg:'#E3F2FD', color:'#1565C0' }, 'Agendado':{ bg:'#E8F5E9', color:'#2E7D32' }, 'Publicado':{ bg:'#E8F5E9', color:'#1B5E20' }, 'Aguardando Aprovação':{ bg:'#FFF3E0', color:'#E65100' }, 'Aprovado':{ bg:'#D4F0C4', color:'#2E7D32' }, 'Alterações':{ bg:'#FFF3E0', color:'#E65100' }, 'Rejeitado':{ bg:'#FFEBEE', color:'#C62828' } };
const REVIEW_LABELS = { aprovado:{ label:'✅ Aprovado pelo cliente', bg:'#E8F5E9', color:'#1B5E20' }, rejeitado:{ label:'❌ Rejeitado pelo cliente', bg:'#FFEBEE', color:'#C62828' }, ajustes:{ label:'✏️ Ajustes solicitados', bg:'#FFF3E0', color:'#E65100' } };

function PostPreviewModal({ post, client, onClose, onSelectClient }) {
  const statusStyle = STATUS_STYLES[post.status] ?? { bg:'#F5F5F5', color:'#616161' };
  const reviewInfo  = REVIEW_LABELS[post.clienteReview];
  const dateLabel   = post.date ? new Date(post.date+'T12:00').toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' }) : null;
  return (
    <div className="ws-modal-backdrop" onClick={onClose}>
      <div className="ws-modal ws-post-preview" onClick={e => e.stopPropagation()}>
        <div className="ws-modal-header">
          {client ? <div className="ws-post-preview-client"><span style={{ fontSize:22 }}>{client.emoji}</span><span style={{ fontWeight:700, color:client.color??'#4F46E5' }}>{client.name}</span></div> : <span style={{ fontWeight:700 }}>Post</span>}
          <button className="ws-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ws-post-preview-body">
          {reviewInfo && <div className="ws-post-review-banner" style={{ background:reviewInfo.bg, color:reviewInfo.color }}>{reviewInfo.label}</div>}
          <h2 className="ws-post-preview-title">{post.title||'(sem título)'}</h2>
          <div className="ws-post-preview-chips">
            {dateLabel && <span className="ws-post-preview-chip ws-post-chip-date">📅 {dateLabel}</span>}
            {post.format && <span className="ws-post-preview-chip">{post.format}</span>}
            {post.status && <span className="ws-post-preview-chip" style={{ background:statusStyle.bg, color:statusStyle.color }}>{post.status}</span>}
          </div>
          {post.tags?.length>0 && <div className="ws-post-preview-tags">{post.tags.map(t => <span key={t} className="ws-post-preview-tag">{t}</span>)}</div>}
          {post.notes && <p className="ws-post-preview-notes">{post.notes}</p>}
          {post.attachments?.length>0 && <AttachmentsSection attachments={post.attachments} />}
        </div>
        <div className="ws-post-preview-footer">
          <button className="ws-btn-cancel" onClick={onClose}>Fechar</button>
          {client && <button className="ws-btn-submit" style={{ background:client.color??'#4F46E5' }} onClick={() => { onClose(); onSelectClient(client); }}>Ir para o painel →</button>}
        </div>
      </div>
    </div>
  );
}
