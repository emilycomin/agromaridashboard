import { useState, useEffect, useMemo } from 'react';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { uploadAttachment } from '../services/storage';
import { auth as fbAuth } from '../firebase';
import {
  loadClients, persistClient, getOrCreateClientToken,
  removeClient, setClientArchived, getClientPostsOnce,
  subscribeTasks, persistTask, removeTask,
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
  { id: 'tarefas',       label: 'Tarefas'        },
  { id: 'relatorios',    label: 'Relatórios'     },
  { id: 'configuracoes', label: 'Configurações'  },
];

const NAV_ICONS = {
  dashboard:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  clientes:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  tarefas:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
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
  const [tasks,           setTasks]           = useState([]);

  const isSM  = userRole === 'social-media';
  const uid   = firebaseUser?.uid;
  const email = firebaseUser?.email;

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    loadClients(uid, email).then(setClients).catch(console.error).finally(() => setLoading(false));
  }, [uid, email]);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeTasks(uid, setTasks, console.error);
    return () => unsub();
  }, [uid]);

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
                  <WorkspaceCalendar key="dashboard-cal" allPosts={allPosts} tasks={tasks} onPostClick={handlePostClick} />
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

          {/* ── TAREFAS ── */}
          {activeSection === 'tarefas' && (
            <TasksPage uid={uid} clients={clients} tasks={tasks} />
          )}

          {/* Placeholders */}
          {activeSection === 'relatorios' && (
            <SectionPlaceholder icon="📊" title="Relatórios" desc="Essa funcionalidade estará disponível em breve." />
          )}

          {/* ── CONFIGURAÇÕES ── */}
          {activeSection === 'configuracoes' && (
            <AccountSettingsSection firebaseUser={firebaseUser} onSwitchAccount={onSwitchAccount} />
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

// ── Tasks Page ────────────────────────────────────────────────────────────────
const PRIORITY_OPTS = [
  { value: 'alta',  label: 'Alta',  color: '#DC2626', bg: '#FEF2F2' },
  { value: 'media', label: 'Média', color: '#D97706', bg: '#FFFBEB' },
  { value: 'baixa', label: 'Baixa', color: '#2563EB', bg: '#EFF6FF' },
];
const STATUS_OPTS = [
  { value: 'pendente',     label: 'Pendente'     },
  { value: 'em-andamento', label: 'Em andamento' },
  { value: 'concluida',    label: 'Concluída'    },
];
const FILTER_TABS = [
  { value: 'todas',        label: 'Todas'        },
  { value: 'pendente',     label: 'Pendentes'    },
  { value: 'em-andamento', label: 'Em andamento' },
  { value: 'concluida',    label: 'Concluídas'   },
];
const EMPTY_TASK = { title: '', description: '', dueDate: '', clientName: '', priority: 'media', status: 'pendente' };

function priorityMeta(val) { return PRIORITY_OPTS.find(p => p.value === val) ?? PRIORITY_OPTS[1]; }

function KanbanView({ tasks, uid }) {
  const [dragging, setDragging] = useState(null);
  const cols = [
    { status: 'pendente',     label: 'Pendente',     color: '#D97706', bg: '#FFFBEB' },
    { status: 'em-andamento', label: 'Em andamento', color: '#2563EB', bg: '#EFF6FF' },
    { status: 'concluida',    label: 'Concluída',    color: '#16A34A', bg: '#F0FDF4' },
  ];
  const today = new Date().toISOString().slice(0, 10);

  const handleDrop = async (status) => {
    if (!dragging || dragging.status === status) return;
    await persistTask(uid, { ...dragging, status, updatedAt: new Date().toISOString() }).catch(console.error);
    setDragging(null);
  };

  return (
    <div className="tk-kanban">
      {cols.map(col => {
        const colTasks = tasks.filter(t => t.status === col.status);
        return (
          <div key={col.status} className="tk-kanban-col"
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(col.status)}
          >
            <div className="tk-kanban-col-header" style={{ borderTopColor: col.color }}>
              <span className="tk-kanban-col-title" style={{ color: col.color }}>{col.label}</span>
              <span className="tk-kanban-col-count">{colTasks.length}</span>
            </div>
            <div className="tk-kanban-col-body">
              {colTasks.map(task => {
                const pm      = priorityMeta(task.priority);
                const overdue = task.status !== 'concluida' && task.dueDate && task.dueDate < today;
                return (
                  <div key={task.id}
                    className={`tk-kanban-card${overdue ? ' tk-kanban-card--overdue' : ''}`}
                    draggable
                    onDragStart={() => setDragging(task)}
                    onDragEnd={() => setDragging(null)}
                  >
                    <div className="tk-kanban-card-title">{task.title}</div>
                    {task.description && <div className="tk-kanban-card-desc">{task.description}</div>}
                    <div className="tk-kanban-card-footer">
                      <span className="tk-badge-priority" style={{ color: pm.color, background: pm.bg }}>{pm.label}</span>
                      {task.dueDate && (
                        <span className={`tk-meta-item${overdue ? ' tk-meta-overdue' : ''}`} style={{ fontSize: 11 }}>
                          📅 {new Date(task.dueDate + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                    {task.clientName && <div className="tk-kanban-card-client">🏢 {task.clientName}</div>}
                  </div>
                );
              })}
              {colTasks.length === 0 && <div className="tk-kanban-empty">Sem tarefas</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TasksPage({ uid, clients, tasks = [] }) {
  const [view,        setView]        = useState('lista');
  const [filter,      setFilter]      = useState('todas');
  const [search,      setSearch]      = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [editTask,    setEditTask]    = useState(null);
  const [form,        setForm]        = useState(EMPTY_TASK);
  const [saving,      setSaving]      = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(null);

  const openNew  = ()     => { setEditTask(null); setForm(EMPTY_TASK); setShowModal(true); };
  const openEdit = (task) => { setEditTask(task); setForm({ ...task }); setShowModal(true); };
  const closeModal = ()   => { setShowModal(false); setEditTask(null); setForm(EMPTY_TASK); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !uid) return;
    setSaving(true);
    const now = new Date().toISOString();
    const task = editTask
      ? { ...editTask, ...form, title: form.title.trim(), updatedAt: now }
      : { ...form, title: form.title.trim(), id: `task_${Date.now()}`, createdAt: now };
    await persistTask(uid, task).catch(console.error);
    closeModal();
    setSaving(false);
  };

  const toggleStatus = async (task) => {
    const next = task.status === 'concluida' ? 'pendente' : 'concluida';
    await persistTask(uid, { ...task, status: next, updatedAt: new Date().toISOString() }).catch(console.error);
  };

  const handleDelete = async (taskId) => {
    await removeTask(uid, taskId).catch(console.error);
    setConfirmDel(null);
  };

  const today = new Date().toISOString().slice(0, 10);

  const filtered = tasks.filter(t => {
    if (filter !== 'todas' && t.status !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !(t.description ?? '').toLowerCase().includes(search.toLowerCase()) &&
        !(t.clientName ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // KPIs
  const total     = tasks.length;
  const pendentes = tasks.filter(t => t.status === 'pendente').length;
  const andamento = tasks.filter(t => t.status === 'em-andamento').length;
  const concluidas = tasks.filter(t => t.status === 'concluida').length;
  const vencidas  = tasks.filter(t => t.status !== 'concluida' && t.dueDate && t.dueDate < today).length;

  return (
    <div className="tk-page">

      {/* ── Header ── */}
      <div className="tk-header">
        <div>
          <h2 className="tk-title">Tarefas</h2>
          <p className="tk-sub">{total} tarefa{total !== 1 ? 's' : ''} no total</p>
        </div>
        <div className="tk-header-actions">
          <div className="tk-view-toggle">
            <button className={`tk-view-btn${view === 'lista'  ? ' active' : ''}`} onClick={() => setView('lista')}  title="Lista">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              Lista
            </button>
            <button className={`tk-view-btn${view === 'kanban' ? ' active' : ''}`} onClick={() => setView('kanban')} title="Kanban">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="15" rx="1"/></svg>
              Kanban
            </button>
          </div>
          <button className="tk-btn-new" onClick={openNew}>+ Nova Tarefa</button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="tk-kpis">
        {[
          { label: 'Pendentes',    value: pendentes,  color: '#D97706', bg: '#FFFBEB' },
          { label: 'Em andamento', value: andamento,  color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Concluídas',   value: concluidas, color: '#16A34A', bg: '#F0FDF4' },
          { label: 'Vencidas',     value: vencidas,   color: '#DC2626', bg: '#FEF2F2' },
        ].map(k => (
          <div className="tk-kpi" key={k.label} style={{ borderTopColor: k.color }}>
            <span className="tk-kpi-value" style={{ color: k.color }}>{k.value}</span>
            <span className="tk-kpi-label">{k.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="tk-filters">
        <div className="tk-filter-tabs">
          {FILTER_TABS.map(f => (
            <button key={f.value} className={`tk-filter-tab${filter === f.value ? ' active' : ''}`} onClick={() => setFilter(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="cf-search-wrap">
          <svg className="cf-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input className="cf-search-input" type="text" placeholder="Buscar tarefa…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* ── Kanban ── */}
      {view === 'kanban' && <KanbanView tasks={tasks} uid={uid} />}

      {/* ── Lista ── */}
      {view === 'lista' && (filtered.length === 0 ? (
        <div className="tk-empty">
          <div className="tk-empty-icon">✅</div>
          <div className="tk-empty-title">{search || filter !== 'todas' ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa ainda'}</div>
          <div className="tk-empty-sub">{!search && filter === 'todas' && 'Crie sua primeira tarefa clicando em "+ Nova Tarefa"'}</div>
        </div>
      ) : (
        <div className="tk-list">
          {filtered.map(task => {
            const pm      = priorityMeta(task.priority);
            const overdue = task.status !== 'concluida' && task.dueDate && task.dueDate < today;
            const done    = task.status === 'concluida';
            return (
              <div key={task.id} className={`tk-card${done ? ' tk-card--done' : ''}${overdue ? ' tk-card--overdue' : ''}`}>
                {/* Checkbox */}
                <button className={`tk-check${done ? ' tk-check--done' : ''}`} onClick={() => toggleStatus(task)} title={done ? 'Marcar como pendente' : 'Marcar como concluída'}>
                  {done && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>

                {/* Conteúdo */}
                <div className="tk-card-body">
                  <div className="tk-card-top">
                    <span className={`tk-card-title${done ? ' tk-card-title--done' : ''}`}>{task.title}</span>
                    <div className="tk-card-badges">
                      <span className="tk-badge-priority" style={{ color: pm.color, background: pm.bg }}>{pm.label}</span>
                      {task.status === 'em-andamento' && <span className="tk-badge-status tk-badge-andamento">Em andamento</span>}
                    </div>
                  </div>
                  {task.description && <p className="tk-card-desc">{task.description}</p>}
                  <div className="tk-card-meta">
                    {task.clientName && <span className="tk-meta-item">🏢 {task.clientName}</span>}
                    {task.dueDate && (
                      <span className={`tk-meta-item${overdue ? ' tk-meta-overdue' : ''}`}>
                        📅 {new Date(task.dueDate + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        {overdue && ' — Vencida'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="tk-card-actions">
                  <button className="tk-action-btn" onClick={() => openEdit(task)} title="Editar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  {confirmDel === task.id ? (
                    <div className="tk-confirm-del">
                      <button className="tk-confirm-yes" onClick={() => handleDelete(task.id)}>✓</button>
                      <button className="tk-confirm-no"  onClick={() => setConfirmDel(null)}>✕</button>
                    </div>
                  ) : (
                    <button className="tk-action-btn tk-action-del" onClick={() => setConfirmDel(task.id)} title="Excluir">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* ── Modal ── */}
      {showModal && (
        <div className="ws-modal-backdrop" onClick={closeModal}>
          <div className="ws-modal tk-modal" onClick={e => e.stopPropagation()}>
            <div className="ws-modal-header">
              <h3>{editTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
              <button className="ws-modal-close" onClick={closeModal}>✕</button>
            </div>
            <form className="ws-modal-form" onSubmit={handleSave}>
              <label className="ws-field">
                <span>Título <span className="ws-req">*</span></span>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="O que precisa ser feito?" autoFocus required />
              </label>
              <label className="ws-field">
                <span>Descrição</span>
                <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detalhes adicionais…" style={{ resize: 'vertical' }} />
              </label>
              <div className="ws-modal-row">
                <label className="ws-field" style={{ flex: 1 }}>
                  <span>Prioridade</span>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="tk-select">
                    {PRIORITY_OPTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </label>
                <label className="ws-field" style={{ flex: 1 }}>
                  <span>Status</span>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="tk-select">
                    {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="ws-modal-row">
                <label className="ws-field" style={{ flex: 1 }}>
                  <span>Vencimento</span>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </label>
                <label className="ws-field" style={{ flex: 1 }}>
                  <span>Cliente <span style={{ fontWeight: 400, fontSize: 12, color: '#9E9E9E' }}>(opcional)</span></span>
                  {clients.length > 0
                    ? <select value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} className="tk-select">
                        <option value="">— Sem cliente —</option>
                        {clients.map(c => <option key={c.id} value={c.name}>{c.emoji ?? ''} {c.name}</option>)}
                      </select>
                    : <input type="text" value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Nome do cliente" />
                  }
                </label>
              </div>
              <div className="ws-modal-actions">
                <button type="button" className="ws-btn-cancel" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="ws-btn-submit" disabled={saving || !form.title.trim()}>
                  {saving ? 'Salvando…' : editTask ? '✓ Salvar alterações' : '✓ Criar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Account Settings Section ──────────────────────────────────────────────────
function AccountSettingsSection({ firebaseUser }) {
  // ── foto ──────────────────────────────────────────────────────────────────
  const [photoURL,       setPhotoURL]       = useState(firebaseUser?.photoURL ?? '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError,     setPhotoError]     = useState('');
  const [photoSaved,     setPhotoSaved]     = useState(false);
  const photoInputRef = useState(() => ({ current: null }))[0];

  // ── nome ──────────────────────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState(firebaseUser?.displayName ?? '');
  const [savingName,  setSavingName]  = useState(false);
  const [nameSaved,   setNameSaved]   = useState(false);
  const [nameError,   setNameError]   = useState('');

  // ── senha ─────────────────────────────────────────────────────────────────
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent,    setResetSent]    = useState(false);
  const [resetError,   setResetError]   = useState('');

  const initials = (firebaseUser?.displayName ?? 'U')
    .split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

  // ── handlers ──────────────────────────────────────────────────────────────
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Foto deve ter menos de 5 MB.'); return; }
    setUploadingPhoto(true);
    setPhotoError('');
    setPhotoSaved(false);
    try {
      const url = await uploadAttachment(`avatars/${firebaseUser.uid}`, file);
      await updateProfile(firebaseUser, { photoURL: url });
      setPhotoURL(url);
      setPhotoSaved(true);
      setTimeout(() => setPhotoSaved(false), 3000);
    } catch {
      setPhotoError('Erro ao enviar foto. Tente novamente.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!firebaseUser) return;
    setUploadingPhoto(true);
    setPhotoError('');
    try {
      await updateProfile(firebaseUser, { photoURL: '' });
      setPhotoURL('');
    } catch {
      setPhotoError('Erro ao remover foto.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim() || !firebaseUser) return;
    setSavingName(true);
    setNameError('');
    try {
      await updateProfile(firebaseUser, { displayName: nameInput.trim() });
      setNameSaved(true);
      setEditingName(false);
      setTimeout(() => setNameSaved(false), 2500);
    } catch {
      setNameError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSavingName(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!firebaseUser?.email) return;
    setSendingReset(true);
    setResetError('');
    setResetSent(false);
    try {
      await sendPasswordResetEmail(fbAuth, firebaseUser.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 6000);
    } catch {
      setResetError('Não foi possível enviar o e-mail. Tente novamente.');
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="cf-acc-page">

      {/* ── Cabeçalho ── */}
      <div className="cf-acc-page-header">
        <h3 className="cf-acc-page-title">Configurações da Conta</h3>
        <p className="cf-acc-page-sub">Gerencie suas informações pessoais e segurança</p>
      </div>

      {/* ── CARD: Foto de Perfil ── */}
      <div className="cf-acc-card">
        <div className="cf-acc-card-title">Foto de Perfil</div>
        <div className="cf-acc-photo-section">
          <div className="cf-acc-photo-wrap">
            {photoURL
              ? <img src={photoURL} alt="Foto de perfil" className="cf-acc-photo-img" />
              : <div className="cf-acc-photo-initials">{initials}</div>
            }
            {uploadingPhoto && (
              <div className="cf-acc-photo-overlay">
                <div className="cf-acc-photo-spinner" />
              </div>
            )}
          </div>
          <div className="cf-acc-photo-actions">
            <p className="cf-acc-photo-hint">
              JPG, PNG ou WebP · máx. 5 MB
            </p>
            <div className="cf-acc-photo-btns">
              <button
                className="cf-acc-btn-primary"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? 'Enviando…' : 'Alterar foto'}
              </button>
              {photoURL && (
                <button
                  className="cf-acc-btn-ghost"
                  onClick={handleRemovePhoto}
                  disabled={uploadingPhoto}
                >
                  Remover
                </button>
              )}
            </div>
            {photoSaved && <span className="cf-acc-feedback cf-acc-ok">✓ Foto atualizada</span>}
            {photoError && <span className="cf-acc-feedback cf-acc-err">{photoError}</span>}
            <input
              ref={r => { photoInputRef.current = r; }}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
          </div>
        </div>
      </div>

      {/* ── CARD: Informações Pessoais ── */}
      <div className="cf-acc-card">
        <div className="cf-acc-card-title">Informações Pessoais</div>
        <div className="cf-acc-fields">

          {/* Nome */}
          <div className="cf-acc-field">
            <span className="cf-acc-label">Nome completo</span>
            {editingName ? (
              <div className="cf-acc-edit-row">
                <input
                  className="cf-acc-input"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  autoFocus
                  placeholder="Seu nome completo"
                />
                <button className="cf-acc-btn-save" onClick={handleSaveName} disabled={savingName || !nameInput.trim()}>
                  {savingName ? '…' : 'Salvar'}
                </button>
                <button className="cf-acc-btn-cancel" onClick={() => { setEditingName(false); setNameInput(firebaseUser?.displayName ?? ''); setNameError(''); }}>
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="cf-acc-value-row">
                <span className="cf-acc-value">{firebaseUser?.displayName || <span className="cf-acc-empty">Não definido</span>}</span>
                <button className="cf-acc-btn-edit" onClick={() => { setEditingName(true); setNameSaved(false); }}>Editar</button>
              </div>
            )}
            {nameSaved && <span className="cf-acc-feedback cf-acc-ok">✓ Nome atualizado com sucesso</span>}
            {nameError && <span className="cf-acc-feedback cf-acc-err">{nameError}</span>}
          </div>

          {/* E-mail */}
          <div className="cf-acc-field">
            <span className="cf-acc-label">E-mail</span>
            <div className="cf-acc-value-row">
              <span className="cf-acc-value">{firebaseUser?.email ?? '—'}</span>
              <span className="cf-acc-badge-green">Verificado</span>
            </div>
            <span className="cf-acc-hint-text">O e-mail é usado para login e não pode ser alterado aqui.</span>
          </div>

          {/* ID da conta */}
          <div className="cf-acc-field">
            <span className="cf-acc-label">ID da conta</span>
            <span className="cf-acc-value cf-acc-mono">{firebaseUser?.uid ?? '—'}</span>
          </div>

        </div>
      </div>

      {/* ── CARD: Segurança ── */}
      <div className="cf-acc-card">
        <div className="cf-acc-card-title">Segurança</div>
        <div className="cf-acc-fields">
          <div className="cf-acc-field">
            <span className="cf-acc-label">Senha</span>
            <div className="cf-acc-security-row">
              <div>
                <p className="cf-acc-value">••••••••••••</p>
                <p className="cf-acc-hint-text">Enviaremos um link de redefinição para {firebaseUser?.email}</p>
              </div>
              <button
                className="cf-acc-btn-outline"
                onClick={handlePasswordReset}
                disabled={sendingReset}
              >
                {sendingReset ? 'Enviando…' : 'Redefinir senha'}
              </button>
            </div>
            {resetSent  && <span className="cf-acc-feedback cf-acc-ok">✓ E-mail de redefinição enviado! Verifique sua caixa de entrada.</span>}
            {resetError && <span className="cf-acc-feedback cf-acc-err">{resetError}</span>}
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Workspace Calendar ────────────────────────────────────────────────────────
const CAL_VIEWS = [{ id:'dia', label:'Dia' }, { id:'3dias', label:'3 dias' }, { id:'semana', label:'Semana' }, { id:'mes', label:'Mês' }];

function dateToStr(d) { return d.toISOString().slice(0, 10); }
function isToday(d) { const t = new Date(); return d.getFullYear()===t.getFullYear() && d.getMonth()===t.getMonth() && d.getDate()===t.getDate(); }

function WorkspaceCalendar({ allPosts, tasks = [], onPostClick }) {
  const [view, setView]       = useState('mes');
  const [calDate, setCalDate] = useState(new Date());

  const goToToday = () => setCalDate(new Date());

  const isCurrentPeriod = () => {
    const today = new Date();
    if (view === 'mes') return calDate.getFullYear() === today.getFullYear() && calDate.getMonth() === today.getMonth();
    return dateToStr(calDate) === dateToStr(today);
  };

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
        {!isCurrentPeriod() && (
          <button className="ws-cal-today-btn" onClick={goToToday}>Hoje</button>
        )}
        <div className="ws-cal-view-tabs">
          {CAL_VIEWS.map(v => <button key={v.id} className={`ws-cal-view-tab${view===v.id?' active':''}`} onClick={() => setView(v.id)}>{v.label}</button>)}
        </div>
      </div>
      {view==='mes'  && <CalMonthView  calDate={calDate} allPosts={allPosts} tasks={tasks} onPostClick={onPostClick} />}
      {view!=='mes'  && <CalMultiDayView days={days} allPosts={allPosts} tasks={tasks} onPostClick={onPostClick} view={view} />}
    </div>
  );
}

function CalMonthView({ calDate, allPosts, tasks = [], onPostClick }) {
  const year=calDate.getFullYear(), month=calDate.getMonth();
  const monthStr    = `${year}-${String(month+1).padStart(2,'0')}`;
  const monthPosts  = allPosts.filter(p => p.date?.startsWith(monthStr));
  const postsByDay  = {};
  monthPosts.forEach(p => { const day=p.date?.slice(8,10); if(!day) return; (postsByDay[day]??=[]).push(p); });
  const tasksByDay  = {};
  tasks.filter(t => t.dueDate?.startsWith(monthStr)).forEach(t => {
    const day = t.dueDate?.slice(8,10); if(!day) return; (tasksByDay[day]??=[]).push(t);
  });
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells = [...Array(firstDow).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  return (
    <div className="ws-cal-grid ws-cal-month-grid">
      {WEEKDAYS.map(d => <div key={d} className="ws-cal-weekday">{d}</div>)}
      {cells.map((day, i) => {
        if (!day) return <div key={`e${i}`} className="ws-cal-cell ws-cal-empty" />;
        const dayStr  = String(day).padStart(2,'0');
        const posts   = postsByDay[dayStr] ?? [];
        const dayTasks = tasksByDay[dayStr] ?? [];
        const today   = isToday(new Date(year, month, day));
        const todayStr = new Date().toISOString().slice(0,10);
        const cellDate = `${year}-${String(month+1).padStart(2,'0')}-${dayStr}`;
        return (
          <div key={day} className={`ws-cal-cell ws-cal-month-cell${today?' ws-cal-today':''}`}>
            <span className={`ws-cal-day-num${today?' ws-cal-today-num':''}`}>{day}</span>
            <div className="ws-cal-pills">
              {posts.slice(0,2).map((p,idx) => (
                <button key={idx} className="ws-cal-pill" style={{ borderLeftColor: p.clientColor }} onClick={() => onPostClick?.(p)} title={p.title}>
                  <span className="ws-cal-pill-title">{p.title}</span>
                </button>
              ))}
              {dayTasks.slice(0, 2).map((t, idx) => {
                const overdue = t.status !== 'concluida' && cellDate < todayStr;
                const done    = t.status === 'concluida';
                return (
                  <div key={`t${idx}`} className={`ws-cal-task-pill${done?' ws-cal-task-done':overdue?' ws-cal-task-overdue':''}`} title={t.title}>
                    <span className="ws-cal-task-pill-icon">{done ? '✓' : '○'}</span>
                    <span className="ws-cal-pill-title">{t.title}</span>
                  </div>
                );
              })}
              {(posts.length + dayTasks.length) > 4 && <span className="ws-cal-pill-more">+{posts.length + dayTasks.length - 4} mais</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalMultiDayView({ days, allPosts, tasks = [], onPostClick, view }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return (
    <div className={`ws-cal-multiday ws-cal-multiday-${view}`}>
      {days.map(day => {
        const dateStr  = dateToStr(day);
        const posts    = allPosts.filter(p => p.date === dateStr);
        const dayTasks = tasks.filter(t => t.dueDate === dateStr);
        const today    = isToday(day);
        const dayLabel = day.toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short' });
        return (
          <div key={dateStr} className={`ws-cal-day-col${today?' ws-cal-day-col-today':''}`}>
            <div className="ws-cal-day-col-header"><span className={`ws-cal-day-col-label${today?' today':''}`}>{dayLabel}</span></div>
            <div className="ws-cal-day-col-body">
              {posts.length===0 && dayTasks.length===0 && <div className="ws-cal-no-posts">Sem posts</div>}
              {posts.map((p,idx) => (
                <button key={idx} className="ws-cal-post-card" onClick={() => onPostClick?.(p)}>
                  <div className="ws-cal-post-card-bar" style={{ background: p.clientColor }} />
                  <div className="ws-cal-post-card-body">
                    <div className="ws-cal-post-card-client">{p.clientEmoji} {p.clientName}</div>
                    <div className="ws-cal-post-card-title">{p.title}</div>
                    {p.format && <span className="ws-cal-post-card-format">{p.format}</span>}
                  </div>
                </button>
              ))}
              {dayTasks.map((t, idx) => {
                const overdue = t.status !== 'concluida' && dateStr < todayStr;
                const done    = t.status === 'concluida';
                return (
                  <div key={`t${idx}`} className={`ws-cal-task-card${done?' ws-cal-task-done':overdue?' ws-cal-task-overdue':''}`}>
                    <span className="ws-cal-task-card-icon">{done ? '✓' : '○'}</span>
                    <div className="ws-cal-task-card-body">
                      <div className="ws-cal-task-card-title">{t.title}</div>
                      {t.clientName && <div className="ws-cal-task-card-client">🏢 {t.clientName}</div>}
                    </div>
                  </div>
                );
              })}
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
