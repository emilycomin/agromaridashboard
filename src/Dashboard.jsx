import { useState, useMemo, useEffect, useRef } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { INITIAL_POSTS, CURRENT_YEAR, MONTH_NAMES, FORMATS, STATUSES, PILLAR_COLORS } from './constants';
import { subscribePosts, persistPost, removePost, loadSettings, persistSettings, getOrCreateClientToken, persistClient, removeClient, setClientArchived } from './services/db';
import AppHeader from './components/AppHeader';
import MonthSelector from './components/MonthSelector';
import KpiRow from './components/KpiRow';
import CalendarCard from './components/CalendarCard';
import ChartsSection from './components/ChartsSection';
import PostsTable from './components/PostsTable';
import PostModal from './components/PostModal';
import MeetingsWidget from './components/MeetingsWidget';
import GoogleCalendarWidget from './components/GoogleCalendarWidget';
import CalendarTab from './components/CalendarTab';
// Tabs removido — navegação migrada para sidebar customizado
import { OptionsContext } from './context/OptionsContext';
import { PostsContext } from './context/PostsContext';
import './Dashboard.css';

const NEW_POST_TEMPLATE = {
  id: null,
  title: '',
  date: '',
  format: '',
  tags: [],
  status: '',
  notes: '',
  attachments: [],
  coverId: null,
  approved: false,
  history: [],
};

// ─── HISTÓRICO ─────────────────────────────────────────────────────────────────
const FIELD_LABELS = {
  title:    'Título',
  date:     'Data',
  format:   'Formato',
  status:   'Status',
  approved: 'Aprovado',
};

function buildHistoryEntry(oldPost, newPost) {
  const changes = [];

  for (const field of ['title', 'date', 'format', 'status', 'approved']) {
    if (oldPost[field] !== newPost[field]) {
      const label = FIELD_LABELS[field];
      if (field === 'approved') {
        changes.push(`${label}: ${oldPost[field] ? 'Sim' : 'Não'} → ${newPost[field] ? 'Sim' : 'Não'}`);
      } else {
        changes.push(`${label}: ${oldPost[field] || '—'} → ${newPost[field] || '—'}`);
      }
    }
  }

  const oldTags = (oldPost.tags ?? []).join(', ') || '—';
  const newTags = (newPost.tags ?? []).join(', ') || '—';
  if (oldTags !== newTags) changes.push(`Etiquetas: ${oldTags} → ${newTags}`);

  if ((oldPost.notes ?? '') !== (newPost.notes ?? '')) changes.push('Descrição atualizada');

  if (changes.length === 0) return null;
  return { id: Date.now() + Math.random(), timestamp: new Date().toISOString(), changes };
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
export default function Dashboard({ userRole = 'social-media', clientId = 'agromari', clientMeta = {}, googleAccessToken = null, firebaseUser = null, clients = [], onSelectClient, onLogout, onSwitchAccount, onBack }) {
  const isCliente = userRole === 'cliente';
  const [posts, setPosts]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [dbError, setDbError]           = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(3);   // mês exibido no calendário
  const [selectedMonths, setSelectedMonths] = useState([3]); // meses do filtro (multi)
  const [tableFilter, setTableFilter]   = useState('all');
  const [sortConfig, setSortConfig]     = useState({ key: 'date', direction: 'asc' });
  const [selectedPost, setSelectedPost] = useState(null);
  const [whatsappModal, setWhatsappModal] = useState(null);
  const [activeMenuTab, setActiveMenuTab] = useState('dashboard');

  // ─── SINCRONIZA selectedPost com o listener em tempo real ───────────────────
  // Quando o Firestore atualiza os posts (ex: cliente aprova/rejeita), o modal do
  // Social Media que estiver aberto reflete as mudanças imediatamente.
  useEffect(() => {
    if (!selectedPost?.id) return;
    const fresh = posts.find((p) => p.id === selectedPost.id);
    if (fresh && JSON.stringify(fresh) !== JSON.stringify(selectedPost)) {
      setSelectedPost(fresh);
    }
  }, [posts]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── FILA DE APROVAÇÃO (cliente) ─────────────────────────────────────────────
  const [approvalQueue, setApprovalQueue] = useState(null); // null = inativo | [] = fila
  const [approvalIdx, setApprovalIdx]     = useState(0);

  // ─── HANDLERS DE SELEÇÃO DE MESES ────────────────────────────────────────────
  const toggleMonth = (m) =>
    setSelectedMonths((prev) =>
      prev.includes(m)
        ? prev.length > 1 ? prev.filter((x) => x !== m) : prev   // mínimo 1 mês
        : [...prev, m].sort((a, b) => a - b)
    );
  const selectAllMonths  = () => setSelectedMonths([0,1,2,3,4,5,6,7,8,9,10,11]);
  const clearMonths      = () => setSelectedMonths([calendarMonth]);

  // ─── OPÇÕES DINÂMICAS ────────────────────────────────────────────────────────
  const [availableTags,     setAvailableTags]     = useState(() => Object.keys(PILLAR_COLORS));
  const [availableFormats,  setAvailableFormats]  = useState(FORMATS);
  const [availableStatuses, setAvailableStatuses] = useState(STATUSES);
  const [lastUpdated,       setLastUpdated]       = useState(null);
  const [tagColors,    setTagColors]    = useState(() => {
    const m = {};
    Object.entries(PILLAR_COLORS).forEach(([k, v]) => { m[k] = { bg: v.bg, color: v.color }; });
    return m;
  });
  const [formatColors, setFormatColors] = useState({});
  const [statusColors, setStatusColors] = useState({});

  // Ref para saber se as configurações já foram carregadas do Firestore
  // (evita salvar os valores padrão por cima dos dados em nuvem no primeiro render)
  const settingsReady = useRef(false);

  // ─── LISTENER EM TEMPO REAL DO FIRESTORE ─────────────────────────────────────
  // subscribePosts dispara toda vez que qualquer post é criado/alterado/removido
  // no Firestore — inclusive pelas ações do perfil do Cliente na mesma sessão ou
  // em outro dispositivo. Isso mantém o perfil do Social Media sempre sincronizado.
  useEffect(() => {
    let seeded = false; // evita re-semeadura a cada snapshot

    // 1. Carrega configurações (fetch único — mudam raramente)
    loadSettings(clientId)
      .then((settings) => {
        if (!settings) return;
        if (settings.availableTags?.length)     setAvailableTags(settings.availableTags);
        if (settings.availableFormats?.length)  setAvailableFormats(settings.availableFormats);
        if (settings.availableStatuses?.length) setAvailableStatuses(settings.availableStatuses);
        if (settings.lastUpdated)               setLastUpdated(settings.lastUpdated);
        if (settings.tagColors)                 setTagColors((prev) => ({ ...prev, ...settings.tagColors }));
        if (settings.formatColors)              setFormatColors((prev) => ({ ...prev, ...settings.formatColors }));
        if (settings.statusColors)              setStatusColors((prev) => ({ ...prev, ...settings.statusColors }));
      })
      .catch(console.error);

    // 2. Assina posts em tempo real
    const shouldSeed = clientId === 'agromari'; // semeadura apenas para o cliente legado
    const unsubscribe = subscribePosts(
      clientId,
      async (firestorePosts) => {
        if (firestorePosts.length > 0) {
          // Mescla: semeia apenas os posts do INITIAL_POSTS que ainda não existem
          if (!seeded && shouldSeed) {
            seeded = true;
            const existingIds = new Set(firestorePosts.map((p) => String(p.id)));
            const missing = INITIAL_POSTS.filter((p) => !existingIds.has(String(p.id)));
            if (missing.length > 0) {
              await Promise.all(missing.map((p) => persistPost(clientId, p)));
              return; // o próprio persistPost vai disparar um novo snapshot com os dados completos
            }
          }
          seeded = true;
          setPosts(firestorePosts);
        } else {
          if (!seeded && shouldSeed) {
            // Primeira vez Agromari: semeia com todos os posts iniciais
            seeded = true;
            await Promise.all(INITIAL_POSTS.map((p) => persistPost(clientId, p)));
            // O snapshot seguinte virá automaticamente com os posts semeados
          } else {
            seeded = true;
            setPosts([]);
          }
        }
        setLoading(false);
        requestAnimationFrame(() => { settingsReady.current = true; });
      },
      (err) => {
        console.error('Erro no listener do Firestore:', err);
        setDbError('Não foi possível conectar ao banco de dados. Usando dados locais.');
        setPosts(shouldSeed ? INITIAL_POSTS : []);
        setLoading(false);
        requestAnimationFrame(() => { settingsReady.current = true; });
      },
    );

    return () => unsubscribe();
  }, []);

  // ─── SALVA CONFIGURAÇÕES NO FIRESTORE (quando mudam após carregamento) ────────
  useEffect(() => {
    if (!settingsReady.current) return;
    persistSettings(clientId, { availableTags, availableFormats, availableStatuses, tagColors, formatColors, statusColors }).catch(console.error);
  }, [availableTags, availableFormats, availableStatuses, tagColors, formatColors, statusColors]);

  // ─── HANDLERS DE ETIQUETAS ───────────────────────────────────────────────────
  const addTag = (name, colorObj) => {
    setAvailableTags((prev) => [...prev, name]);
    if (colorObj) setTagColors((prev) => ({ ...prev, [name]: colorObj }));
  };
  const deleteTag = (name) => {
    setAvailableTags((prev) => prev.filter((t) => t !== name));
    setTagColors((prev) => { const m = { ...prev }; delete m[name]; return m; });
    setPosts((prev) => prev.map((p) => ({ ...p, tags: (p.tags ?? []).filter((t) => t !== name) })));
  };
  const renameTag = (oldName, newName) => {
    setAvailableTags((prev) => prev.map((t) => (t === oldName ? newName : t)));
    setTagColors((prev) => {
      if (!prev[oldName]) return prev;
      const m = { ...prev, [newName]: prev[oldName] };
      delete m[oldName];
      return m;
    });
    setPosts((prev) =>
      prev.map((p) => ({ ...p, tags: (p.tags ?? []).map((t) => (t === oldName ? newName : t)) }))
    );
  };

  // ─── HANDLERS DE FORMATOS ────────────────────────────────────────────────────
  const addFormat = (name, colorObj) => {
    setAvailableFormats((prev) => [...prev, name]);
    if (colorObj) setFormatColors((prev) => ({ ...prev, [name]: colorObj }));
  };
  const deleteFormat = (name) => {
    setAvailableFormats((prev) => prev.filter((f) => f !== name));
    setFormatColors((prev) => { const m = { ...prev }; delete m[name]; return m; });
    setPosts((prev) => prev.map((p) => ({ ...p, format: p.format === name ? '' : p.format })));
  };
  const renameFormat = (oldName, newName) => {
    setAvailableFormats((prev) => prev.map((f) => (f === oldName ? newName : f)));
    setFormatColors((prev) => {
      if (!prev[oldName]) return prev;
      const m = { ...prev, [newName]: prev[oldName] };
      delete m[oldName];
      return m;
    });
    setPosts((prev) => prev.map((p) => ({ ...p, format: p.format === oldName ? newName : p.format })));
  };

  // ─── HANDLERS DE STATUS ──────────────────────────────────────────────────────
  const addStatus = (name, colorObj) => {
    setAvailableStatuses((prev) => [...prev, name]);
    if (colorObj) setStatusColors((prev) => ({ ...prev, [name]: colorObj }));
  };
  const deleteStatus = (name) => {
    setAvailableStatuses((prev) => prev.filter((s) => s !== name));
    setStatusColors((prev) => { const m = { ...prev }; delete m[name]; return m; });
    setPosts((prev) => prev.map((p) => ({ ...p, status: p.status === name ? '' : p.status })));
  };
  const renameStatus = (oldName, newName) => {
    setAvailableStatuses((prev) => prev.map((s) => (s === oldName ? newName : s)));
    setStatusColors((prev) => {
      if (!prev[oldName]) return prev;
      const m = { ...prev, [newName]: prev[oldName] };
      delete m[oldName];
      return m;
    });
    setPosts((prev) => prev.map((p) => ({ ...p, status: p.status === oldName ? newName : p.status })));
  };

  // ─── CRUD DE POSTS ───────────────────────────────────────────────────────────
  const stampLastUpdated = () => {
    const ts = new Date().toISOString();
    setLastUpdated(ts);
    persistSettings(clientId, { lastUpdated: ts }).catch(console.error);
  };

  const handleSavePost = (updatedPost) => {
    if (updatedPost.id) {
      // Calcula toSave diretamente (não como side-effect do updater do setPosts,
      // pois em React 19/StrictMode updaters podem ser chamados múltiplas vezes ou
      // de forma deferida, tornando a atribuição via side-effect não confiável).
      const existing = posts.find((p) => p.id === updatedPost.id);
      const entry    = existing ? buildHistoryEntry(existing, updatedPost) : null;
      const newHistory = entry
        ? [...(existing.history ?? []), entry]
        : (existing?.history ?? []);
      const toSave = { ...updatedPost, history: newHistory };

      setPosts((prev) => prev.map((p) => (p.id === toSave.id ? toSave : p)));
      setSelectedPost((prev) => (prev?.id === toSave.id ? toSave : prev));
      persistPost(clientId, toSave).catch(console.error);
      stampLastUpdated();
    } else {
      // Criação: gera ID, semeia o Firestore e abre o modal no post criado
      const saved = { ...updatedPost, id: Date.now() };
      setPosts((prev) => [...prev, saved]);
      setSelectedPost(saved);
      setSortConfig({ key: 'date', direction: 'asc' });
      persistPost(clientId, saved).catch(console.error);
      stampLastUpdated();
    }
  };

  const handleDeletePost = (post) => {
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    setSelectedPost(null);
    removePost(clientId, post.id).catch(console.error);
    stampLastUpdated();
  };

  const openNewPost = (date = '') => setSelectedPost({ ...NEW_POST_TEMPLATE, date });

  // ─── FILA DE APROVAÇÃO ───────────────────────────────────────────────────────
  // Posts enviados para aprovação que ainda não têm review do cliente
  const postsParaAprovar = useMemo(
    () => posts.filter((p) => p.enviadoParaAprovacao && !p.clienteReview),
    [posts]
  );

  const startApprovalQueue = () => {
    const queue = postsParaAprovar.map((p) => p.id);
    setApprovalQueue(queue);
    setApprovalIdx(0);
    if (queue.length > 0) {
      const first = posts.find((p) => p.id === queue[0]);
      if (first) setSelectedPost(first);
    }
  };

  const advanceApprovalQueue = () => {
    setApprovalQueue((prev) => {
      if (!prev) return null;
      const nextIdx = approvalIdx + 1;
      if (nextIdx >= prev.length) {
        // Fila concluída
        setSelectedPost(null);
        setApprovalIdx(0);
        return null;
      }
      setApprovalIdx(nextIdx);
      const nextPost = posts.find((p) => p.id === prev[nextIdx]);
      if (nextPost) setSelectedPost(nextPost);
      return prev;
    });
  };

  const isInApprovalMode = approvalQueue !== null;

  // ─── POSTS DOS MESES SELECIONADOS (base para KPIs, tabela e gráficos) ───────
  const monthPosts = useMemo(() => {
    const prefixes = selectedMonths.map(
      (m) => `${CURRENT_YEAR}-${String(m + 1).padStart(2, '0')}`
    );
    return posts.filter((p) => prefixes.some((pfx) => p.date?.startsWith(pfx)));
  }, [posts, selectedMonths]);

  // ─── CALENDÁRIO ──────────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDay    = new Date(CURRENT_YEAR, calendarMonth, 1).getDay();
    const daysInMonth = new Date(CURRENT_YEAR, calendarMonth + 1, 0).getDate();
    const prevDays    = new Date(CURRENT_YEAR, calendarMonth, 0).getDate();
    const days = [];

    for (let i = firstDay - 1; i >= 0; i--)
      days.push({ num: prevDays - i, isOtherMonth: true, dateStr: null, posts: [] });

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${CURRENT_YEAR}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ num: d, isOtherMonth: false, dateStr: ds, posts: posts.filter((p) => p.date === ds) });
    }

    const remaining = (firstDay + daysInMonth) % 7;
    for (let i = 1; i <= (remaining === 0 ? 0 : 7 - remaining); i++)
      days.push({ num: i, isOtherMonth: true, dateStr: null, posts: [] });

    return days;
  }, [calendarMonth, posts]);

  // ─── TABELA (parte do monthPosts + filtro de formato/tag) ───────────────────
  const filteredAndSortedPosts = useMemo(() => {
    let filtered = tableFilter === 'all'
      ? monthPosts
      : monthPosts.filter((p) => p.format === tableFilter || (p.tags ?? []).includes(tableFilter));

    if (sortConfig.key === 'manual') {
      return [...filtered].sort((a, b) => (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999));
    }

    return [...filtered].sort((a, b) => {
      const av = sortConfig.key === 'tags' ? (a.tags?.[0] ?? '') : (a[sortConfig.key] ?? '');
      const bv = sortConfig.key === 'tags' ? (b.tags?.[0] ?? '') : (b[sortConfig.key] ?? '');
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [monthPosts, tableFilter, sortConfig]);

  const handleSort = (key) => setSortConfig((prev) => ({
    key,
    direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
  }));

  const handleMovePost = (postId, newDate) => {
    const post = posts.find((p) => p.id === postId);
    if (!post || post.date === newDate) return;
    const updated = { ...post, date: newDate };
    setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
    persistPost(clientId, updated).catch(console.error);
    stampLastUpdated();
  };

  const handleReorderPosts = (activeId, overId) => {
    const activeIdx = filteredAndSortedPosts.findIndex((p) => p.id === activeId);
    const overIdx   = filteredAndSortedPosts.findIndex((p) => p.id === overId);
    if (activeIdx === -1 || overIdx === -1) return;

    const reordered = arrayMove(filteredAndSortedPosts, activeIdx, overIdx);
    const updates   = reordered.map((p, i) => ({ ...p, sortOrder: i }));

    setPosts((prev) => {
      const map = new Map(updates.map((p) => [p.id, p]));
      return prev.map((p) => map.has(p.id) ? map.get(p.id) : p);
    });

    setSortConfig({ key: 'manual', direction: 'asc' });
    updates.forEach((p) => persistPost(clientId, p).catch(console.error));
  };

  // ─── GRÁFICOS ────────────────────────────────────────────────────────────────
  const pillarChartData = useMemo(() => {
    const counts = {};
    posts.forEach((p) => (p.tags ?? []).forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1; }));
    return {
      labels: Object.keys(counts),
      datasets: [{ data: Object.values(counts), backgroundColor: ['#BBDEFB','#A5D6A7','#FFE082','#CE93D8','#F48FB1','#80DEEA','#FFCC80'], borderWidth: 2 }],
    };
  }, [posts]);

  const formatChartData = useMemo(() => {
    const counts = {};
    posts.forEach((p) => { if (p.format) counts[p.format] = (counts[p.format] || 0) + 1; });
    return {
      labels: Object.keys(counts),
      datasets: [{ data: Object.values(counts), backgroundColor: ['#A5D6A7','#BBDEFB','#FFE082','#CE93D8'], borderRadius: 6 }],
    };
  }, [posts]);

  // ─── LOADING SCREEN ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="db-loading-screen">
        <div className="db-loading-card">
          <div className="db-spinner" />
          <p className="db-loading-title">Carregando dados…</p>
          <p className="db-loading-sub">Conectando ao banco de dados</p>
        </div>
      </div>
    );
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  const optionsValue = {
    availableTags, addTag, deleteTag, renameTag,
    tagColors,
    availableFormats, addFormat, deleteFormat, renameFormat,
    formatColors,
    availableStatuses, addStatus, deleteStatus, renameStatus,
    statusColors,
  };

  const postsValue = {
    posts,
    selectedPost, setSelectedPost,
    handleSavePost, handleDeletePost, openNewPost,
    isInApprovalMode,
    approvalIdx,
    approvalTotal: approvalQueue?.length ?? 0,
    advanceApprovalQueue,
    clientMeta,
    ownerUid: firebaseUser?.uid ?? null,
  };

  const clientTitle = `${clientMeta.emoji ?? '🐾'} ${clientMeta.name ?? 'AGROMARI PETSHOP'}`;
  const clientSubtitle = clientMeta.handle ?? '@agro.mari';

  return (
    <OptionsContext.Provider value={optionsValue}>
    <PostsContext.Provider value={postsValue}>
    <div style={{ display: 'flex', height: '100vh', width: '100%', flexDirection: 'column', overflow: 'hidden' }}>
      <AppHeader
        title={clientTitle}
        subtitle={clientSubtitle}
        firebaseUser={firebaseUser}
        onLogout={onLogout}
        onSwitchAccount={onSwitchAccount}
        clients={clients}
        onSelectClient={onSelectClient}
        onBack={onBack}
        userRole={userRole}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {!isCliente && (
          <aside className="db-sidebar">
            {/* Marca */}
            <div className="db-sidebar-brand">
              <span style={{ fontSize: 20, fontWeight: 800, color: '#3e3a53' }}>Fl</span>
              <span className="db-sidebar-brand-name">owly</span>
            </div>

            {/* Navegação */}
            <button
              className={`db-nav-item ${activeMenuTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveMenuTab('dashboard')}
            >
              <span className="db-nav-icon">🏠</span>
              <span className="db-nav-label">Dashboard</span>
            </button>
            <button
              className={`db-nav-item ${activeMenuTab === 'calendario' ? 'active' : ''}`}
              onClick={() => setActiveMenuTab('calendario')}
            >
              <span className="db-nav-icon">📅</span>
              <span className="db-nav-label">Calendário</span>
            </button>
            <button
              className={`db-nav-item ${activeMenuTab === 'cliente' ? 'active' : ''}`}
              onClick={() => setActiveMenuTab('cliente')}
            >
              <span className="db-nav-icon">👤</span>
              <span className="db-nav-label">Cliente</span>
            </button>
            <button className="db-nav-item nav-disabled" disabled>
              <span className="db-nav-icon">⚙️</span>
              <span className="db-nav-label">Conta</span>
            </button>

            {/* Rodapé */}
            <div className="db-sidebar-spacer" />
            <div className="db-sidebar-footer">
              <button className="db-nav-item" onClick={onLogout} style={{ color: '#c45a5a' }}>
                <span className="db-nav-icon">🚪</span>
                <span className="db-nav-label">Sair</span>
              </button>
            </div>
          </aside>
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {dbError && (
          <div className="db-error-banner">
            ⚠️ {dbError}
          </div>
        )}

        {!isCliente && activeMenuTab === 'cliente' && (
          <div className="cliente-page">
            <div className="cliente-page-header">
              <h2 className="cliente-page-title">
                <span>{clientMeta.emoji ?? '🐾'}</span> {clientMeta.name ?? 'Cliente'}
              </h2>
              <p className="cliente-page-sub">Gerencie os dados e comunicação deste cliente</p>
            </div>
            <div className="cliente-page-grid">
              {/* ── Coluna: Dados do cliente ── */}
              <div className="cliente-card">
                <div className="cliente-card-header">
                  <span className="cliente-card-icon">📋</span>
                  <div>
                    <div className="cliente-card-title">Dados do Cliente</div>
                    <div className="cliente-card-sub">Nome, Instagram, ícone e cor de destaque</div>
                  </div>
                </div>
                <MenuAlterarInfo client={clientMeta} uid={firebaseUser?.uid} onUpdate={onSelectClient} />
              </div>

              {/* ── Coluna: WhatsApp ── */}
              <div className="cliente-card">
                <div className="cliente-card-header">
                  <span className="cliente-card-icon">💬</span>
                  <div>
                    <div className="cliente-card-title">Notificação por WhatsApp</div>
                    <div className="cliente-card-sub">Envie o link de aprovação diretamente ao cliente</div>
                  </div>
                </div>
                <MenuWhatsAppNotif client={clientMeta} uid={firebaseUser?.uid} onUpdate={onSelectClient} onBack={onBack} />
              </div>
            </div>
          </div>
        )}

        {/* ── DASHBOARD principal ── */}
        {(isCliente || activeMenuTab === 'dashboard') && (
        <div className="main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Barra de aprovação — somente cliente */}
          {isCliente && (
            <div className={`approval-banner ${postsParaAprovar.length === 0 ? 'approval-banner-done' : ''}`}>
              {postsParaAprovar.length > 0 ? (
                <>
                  <div className="approval-banner-text">
                    <span className="approval-banner-count">{postsParaAprovar.length}</span>
                    {postsParaAprovar.length === 1 ? ' post aguardando sua aprovação!' : ' posts aguardando sua aprovação!'}
                  </div>
                  <button className="approval-banner-btn" onClick={startApprovalQueue}>Iniciar revisão ▶</button>
                </>
              ) : (
                <div className="approval-banner-text">✅ Todos os posts foram revisados!</div>
              )}
            </div>
          )}

          {/* Hero card — somente social media */}
          {!isCliente && (
            <div className="dash-hero">
              <div>
                <div className="dash-hero-greeting">
                  Olá, {firebaseUser?.displayName?.split(' ')[0] ?? 'Social Media'} 👋
                </div>
                <div className="dash-hero-title">{clientTitle}</div>
                <div className="dash-hero-sub">
                  {MONTH_NAMES[calendarMonth]} · {CURRENT_YEAR} · {clientSubtitle}
                </div>
              </div>
              <div className="dash-hero-right">
                <div className="dash-hero-stats">
                  <div className="dash-hero-stat">
                    <div className="dash-hero-stat-val">{monthPosts.length}</div>
                    <div className="dash-hero-stat-label">Planejados</div>
                  </div>
                  <div className="dash-hero-stat">
                    <div className="dash-hero-stat-val">
                      {monthPosts.filter((p) => p.status === 'Publicado').length}
                    </div>
                    <div className="dash-hero-stat-label">Publicados</div>
                  </div>
                </div>
                <button className="dash-hero-btn" onClick={() => openNewPost()}>
                  + Novo Post
                </button>
              </div>
            </div>
          )}

          {/* Seletor de meses */}
          <MonthSelector
            selectedMonths={selectedMonths}
            onToggle={toggleMonth}
            onSelectAll={selectAllMonths}
            onClearAll={clearMonths}
          />

          {/* KPI cards */}
          <KpiRow posts={monthPosts} selectedMonths={selectedMonths} onPostClick={setSelectedPost} />

          {/* Google Calendar widget */}
          <GoogleCalendarWidget googleAccessToken={googleAccessToken} />

          {/* Calendário + Posts do mês (dois colunas) */}
          <div className="dash-two-col">
            <CalendarCard
              currentMonth={calendarMonth}
              calendarDays={calendarDays}
              onMonthChange={(m) => {
                setCalendarMonth(m);
                setSelectedMonths((prev) => prev.includes(m) ? prev : [...prev, m].sort((a, b) => a - b));
              }}
              onPostClick={setSelectedPost}
              onNewPost={isCliente ? null : (date) => openNewPost(date)}
              onMovePost={isCliente ? null : handleMovePost}
            />

            {/* Lista de posts do mês */}
            <div className="dash-posts-panel card">
              <div className="card-header">
                <h2>📝 Posts do mês</h2>
                <span className="badge">{filteredAndSortedPosts.length} posts</span>
              </div>
              <div className="dash-posts-list">
                {filteredAndSortedPosts.length === 0 && (
                  <p className="dash-posts-empty">Nenhum post neste período.</p>
                )}
                {filteredAndSortedPosts.slice(0, 10).map((post) => {
                  const d = post.date ? new Date(post.date + 'T12:00:00') : null;
                  const dateLabel = d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';
                  const fmtKey = { 'Reel': 'reel', 'Carrossel': 'carrossel', 'Post': 'post', 'Stories': 'stories' }[post.format] ?? 'post';
                  const stKey  = { 'Planejado': 'planejado', 'Em Produção': 'producao', 'Agendado': 'agendado', 'Publicado': 'publicado', 'Aguardando Aprovação': 'aguardando' }[post.status] ?? 'planejado';
                  return (
                    <div key={post.id} className="dash-post-row" onClick={() => setSelectedPost(post)}>
                      <div className="dash-post-dot" style={{ background: clientMeta?.color ?? '#3e3a53' }} />
                      <div className="dash-post-info">
                        <div className="dash-post-title">{post.title}</div>
                        <div className="dash-post-meta">
                          {dateLabel}
                          {post.format && <span className={`format-tag fmt-${fmtKey}`}>{post.format}</span>}
                        </div>
                      </div>
                      {post.status && <span className={`status-tag status-${stKey}`}>{post.status}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <ChartsSection pillarChartData={pillarChartData} formatChartData={formatChartData} />

          {/* Tabela completa de posts — somente social media */}
          {!isCliente && (
            <PostsTable
              posts={filteredAndSortedPosts}
              tableFilter={tableFilter}
              onFilterChange={setTableFilter}
              onSort={handleSort}
              onReorder={handleReorderPosts}
              onPostClick={setSelectedPost}
              onDeletePost={handleDeletePost}
              onAddPost={openNewPost}
              onBulkSendApproval={async (ids) => {
                setPosts((prev) =>
                  prev.map((p) => ids.includes(p.id)
                    ? { ...p, enviadoParaAprovacao: true, status: 'Aguardando Aprovação' }
                    : p)
                );
                ids.forEach((id) => {
                  const p = posts.find((x) => x.id === id);
                  if (p) persistPost(clientId, { ...p, enviadoParaAprovacao: true, status: 'Aguardando Aprovação' }).catch(console.error);
                });
                if (clientMeta?.phone) {
                  const token = await getOrCreateClientToken(clientId, firebaseUser?.uid);
                  const approvalUrl = `${window.location.origin}/?token=${token}`;
                  const text = `Olá ${clientMeta.name}! Você tem posts aguardando sua aprovação no Flowly. Acesse: ${approvalUrl}`;
                  setWhatsappModal({ url: `https://wa.me/${clientMeta.phone}?text=${encodeURIComponent(text)}` });
                }
              }}
              readOnly={false}
            />
          )}
        </div>
        )}

        {/* ── ABA CALENDÁRIO COMPLETO ── */}
        {!isCliente && activeMenuTab === 'calendario' && (
        <div className="main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <CalendarTab
            posts={posts}
            onPostClick={setSelectedPost}
            onNewPost={(date) => openNewPost(date)}
            onMovePost={handleMovePost}
            currentMonth={calendarMonth}
            googleAccessToken={googleAccessToken}
            onMonthChange={(m) => {
              setCalendarMonth(m);
              setSelectedMonths((prev) => prev.includes(m) ? prev : [...prev, m].sort((a, b) => a - b));
            }}
          />
        </div>
        )}

      {/* Renderiza somente quando há post selecionado — garante remontagem limpa
          a cada abertura e que a data pré-preenchida seja sempre aplicada        */}
      {selectedPost && (
        <PostModal
          key={selectedPost.id ?? `new-${selectedPost.date}`}
          post={selectedPost}
          onClose={() => {
            setSelectedPost(null);
            if (isInApprovalMode) { setApprovalQueue(null); setApprovalIdx(0); }
          }}
          readOnly={isCliente}
        />
      )}
      {whatsappModal && (
        <div className="confirm-overlay" onClick={() => setWhatsappModal(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">💬</div>
            <h3 className="confirm-title">Notificar cliente?</h3>
            <p className="confirm-msg">Posts enviados para aprovação. Deseja avisar o cliente pelo WhatsApp?</p>
            <div className="confirm-actions">
              <button className="confirm-btn-cancel" onClick={() => setWhatsappModal(null)}>Fechar</button>
              <a
                className="confirm-btn-delete"
                style={{ background: '#25D366', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                href={whatsappModal.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setWhatsappModal(null)}
              >
                💬 Abrir WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
    </PostsContext.Provider>
    </OptionsContext.Provider>
  );
}

// ─── Menu: Alterar Informações ──────────────────────────────────────────────
const PALETTE = ['#2E7D32', '#1565C0', '#E65100', '#6A1B9A', '#C2185B', '#00838F', '#F57F17', '#4E342E'];
const EMOJI_SUGGESTIONS = ['🏢','💄','🏠','🍕','🐾','💪','📸','👗','🌿','🎨','🚗','💅'];

function MenuAlterarInfo({ client, uid, onUpdate }) {
  const [form, setForm] = useState({ name: client?.name ?? '', handle: client?.handle ?? '', description: client?.description ?? '', phone: client?.phone ?? '', emoji: client?.emoji ?? '🏢', color: client?.color ?? PALETTE[1] });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const updated = { ...client, name: form.name.trim().toUpperCase(), handle: form.handle.trim(), description: form.description.trim(), phone: form.phone.trim(), emoji: form.emoji.trim() || '🏢', color: form.color };
    await persistClient(updated, uid).catch(console.error);
    onUpdate(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form onSubmit={handleSave} className="dashboard-menu-form">
      <div className="dashboard-form-row">
        <label className="dashboard-field">
          <span>Nome *</span>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </label>
        <label className="dashboard-field">
          <span>Perfil Instagram</span>
          <input type="text" placeholder="@perfil" value={form.handle} onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))} />
        </label>
      </div>
      <label className="dashboard-field">
        <span>Descrição</span>
        <input type="text" placeholder="Ex: Moda feminina, e-commerce" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </label>
      <label className="dashboard-field">
        <span>WhatsApp <span style={{ fontWeight: 400, fontSize: 11, color: '#999' }}>(opcional)</span></span>
        <input type="tel" placeholder="5511999999999" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
      </label>
      <div className="dashboard-form-row">
        <label className="dashboard-field" style={{ flex: '0 0 auto' }}>
          <span>Ícone</span>
          <input type="text" value={form.emoji} maxLength={4} onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))} style={{ width: 64, textAlign: 'center', fontSize: 22 }} />
        </label>
        <div className="dashboard-field" style={{ flex: 1 }}>
          <span>Sugestões</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {EMOJI_SUGGESTIONS.map((em) => (
              <button key={em} type="button" style={{ width: 36, height: 36, border: `1.5px solid ${form.emoji === em ? '#3e3a53' : '#EDE7DC'}`, borderRadius: 8, background: form.emoji === em ? '#F2EDE6' : '#FAFAF8', fontSize: 18, cursor: 'pointer' }} onClick={() => setForm((f) => ({ ...f, emoji: em }))}>
                {em}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="dashboard-field">
        <span>Cor</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {PALETTE.map((c) => (
            <button key={c} type="button" style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? `3px solid ${c}` : '3px solid transparent', cursor: 'pointer' }} onClick={() => setForm((f) => ({ ...f, color: c }))} />
          ))}
        </div>
      </div>
      <button type="submit" style={{ background: form.color, color: '#fff', padding: '10px 28px', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8, opacity: saving || !form.name.trim() ? 0.5 : 1 }} disabled={saving || !form.name.trim()}>
        {saving ? 'Salvando…' : saved ? '✓ Salvo!' : 'Salvar alterações'}
      </button>
    </form>
  );
}

function MenuWhatsAppNotif({ client, uid, onUpdate, onBack }) {
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [editPhone, setEditPhone] = useState(!client?.phone);
  const [savingPhone, setSavingPhone] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const approvalText = `Olá ${client?.name ?? 'cliente'}! Você tem posts aguardando sua aprovação no Flowly. Acesse seu painel para revisar.`;

  const handleSavePhone = async () => {
    if (!phone.trim()) return;
    setSavingPhone(true);
    const updated = { ...client, phone: phone.trim() };
    await persistClient(updated, uid).catch(console.error);
    onUpdate(updated);
    setSavingPhone(false);
    setEditPhone(false);
  };

  const handleSendWhatsApp = async () => {
    if (!phone.trim()) return;
    setSending(true);
    const token = await getOrCreateClientToken(client.id, uid);
    const approvalUrl = `${window.location.origin}/?token=${token}`;
    const text = `${approvalText} Acesse: ${approvalUrl}`;
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    window.open(`https://wa.me/${phone.trim()}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="dashboard-menu-whatsapp">
      <div style={{ background: '#FAFAF8', border: '1.5px solid #EDE7DC', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#3A3A5A', marginBottom: 8 }}>Número do cliente</div>
        {editPhone ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="tel" placeholder="5511999999999" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #E0E0EE', borderRadius: 8, fontSize: 14, fontFamily: "'Inter', sans-serif" }} />
            <button onClick={handleSavePhone} disabled={savingPhone || !phone.trim()} style={{ padding: '8px 18px', background: '#3e3a53', color: '#fffdf5', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: savingPhone || !phone.trim() ? 0.5 : 1 }}>
              {savingPhone ? 'Salvando…' : 'Salvar'}
            </button>
            {client?.phone && (
              <button onClick={() => { setPhone(client.phone); setEditPhone(false); }} style={{ padding: '8px 14px', background: 'none', border: '1.5px solid #E0E0EE', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                Cancelar
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#2D2D3F' }}>+{phone}</span>
            <button onClick={() => setEditPhone(true)} style={{ padding: '5px 12px', background: 'none', border: '1.5px solid #E0E0EE', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
              ✏️ Editar
            </button>
          </div>
        )}
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#3A3A5A', marginBottom: 8 }}>Preview da mensagem</div>
        <div style={{ background: '#E8FFE8', border: '1.5px solid #C8F0C8', borderRadius: '12px 12px 12px 4px', padding: '14px 18px', fontSize: 14, color: '#1A3A1A', lineHeight: 1.5, maxWidth: 420 }}>
          <span>{approvalText}</span> <span style={{ color: '#1565C0', fontStyle: 'italic' }}>[link do painel]</span>
        </div>
      </div>
      <button onClick={handleSendWhatsApp} disabled={!phone.trim() || sending || editPhone} style={{ padding: '12px 28px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif", opacity: !phone.trim() || sending || editPhone ? 0.5 : 1 }}>
        {sending ? 'Abrindo…' : sent ? '✓ WhatsApp aberto!' : '💬 Enviar pelo WhatsApp'}
      </button>
      {!phone.trim() && !editPhone && <p style={{ marginTop: 12, fontSize: 13, color: '#E65100' }}>Nenhum número cadastrado. Adicione o número acima.</p>}

      {/* ── Zona de perigo ── */}
      <div style={{ marginTop: 36, border: '1.5px solid #FFCDD2', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', background: '#FFF5F5', borderBottom: '1px solid #FFCDD2' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#C62828', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Zona de perigo</div>
          <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 2 }}>Ações que afetam o acesso e os dados do cliente.</div>
        </div>

        {/* Arquivar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', borderBottom: '1px solid #F5F5F5' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2D2D3F' }}>{client?.archived ? 'Restaurar cliente' : 'Arquivar cliente'}</div>
            <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 2 }}>{client?.archived ? 'Reativa o cliente na área de trabalho.' : 'Oculta o cliente sem apagar os dados.'}</div>
          </div>
          <button
            onClick={async () => {
              const next = !client?.archived;
              await setClientArchived(client.id, next).catch(console.error);
              onUpdate({ ...client, archived: next });
              onBack?.();
            }}
            style={{ whiteSpace: 'nowrap', padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', border: `1.5px solid ${client?.archived ? '#A5D6A7' : '#D0C9BE'}`, color: client?.archived ? '#2E7D32' : '#6B6B80', transition: 'all 0.15s' }}
          >
            {client?.archived ? '📂 Restaurar' : '📁 Arquivar'}
          </button>
        </div>

        {/* Excluir */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', background: '#FFFAFB' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2D2D3F' }}>Excluir cliente</div>
            <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 2 }}>Remove permanentemente o cliente e todos os dados.</div>
          </div>
          {confirmDel ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#C62828', whiteSpace: 'nowrap' }}>Tem certeza?</span>
              <button
                onClick={async () => {
                  await removeClient(client.id).catch(console.error);
                  onBack?.();
                }}
                style={{ padding: '6px 14px', background: '#C62828', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
              >
                Sim, excluir
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                style={{ padding: '6px 12px', background: 'transparent', border: '1.5px solid #D0C9BE', color: '#6B6B80', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              style={{ whiteSpace: 'nowrap', padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', border: '1.5px solid #EF9A9A', color: '#C62828' }}
            >
              🗑 Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
