import { useState, useMemo, useEffect, useRef } from 'react';
import { INITIAL_POSTS, CURRENT_YEAR, FORMATS, STATUSES, PILLAR_COLORS } from './constants';
import { subscribePosts, persistPost, removePost, loadSettings, persistSettings } from './services/db';
import DashboardHeader from './components/DashboardHeader';
import MonthSelector from './components/MonthSelector';
import KpiRow from './components/KpiRow';
import CalendarCard from './components/CalendarCard';
import ChartsSection from './components/ChartsSection';
import PostsTable from './components/PostsTable';
import PostModal from './components/PostModal';
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
export default function Dashboard({ userRole = 'social-media', onLogout }) {
  const isCliente = userRole === 'cliente';
  const [posts, setPosts]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [dbError, setDbError]           = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(3);   // mês exibido no calendário
  const [selectedMonths, setSelectedMonths] = useState([3]); // meses do filtro (multi)
  const [tableFilter, setTableFilter]   = useState('all');
  const [sortConfig, setSortConfig]     = useState({ key: 'date', direction: 'asc' });
  const [selectedPost, setSelectedPost] = useState(null);

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
    loadSettings()
      .then((settings) => {
        if (!settings) return;
        if (settings.availableTags?.length)     setAvailableTags(settings.availableTags);
        if (settings.availableFormats?.length)  setAvailableFormats(settings.availableFormats);
        if (settings.availableStatuses?.length) setAvailableStatuses(settings.availableStatuses);
      })
      .catch(console.error);

    // 2. Assina posts em tempo real
    const unsubscribe = subscribePosts(
      async (firestorePosts) => {
        if (firestorePosts.length > 0) {
          // Mescla: semeia apenas os posts do INITIAL_POSTS que ainda não existem
          if (!seeded) {
            seeded = true;
            const existingIds = new Set(firestorePosts.map((p) => String(p.id)));
            const missing = INITIAL_POSTS.filter((p) => !existingIds.has(String(p.id)));
            if (missing.length > 0) {
              await Promise.all(missing.map((p) => persistPost(p)));
              return; // o próprio persistPost vai disparar um novo snapshot com os dados completos
            }
          }
          setPosts(firestorePosts);
        } else {
          // Primeira vez: semeia com todos os posts iniciais
          if (!seeded) {
            seeded = true;
            await Promise.all(INITIAL_POSTS.map((p) => persistPost(p)));
            // O snapshot seguinte virá automaticamente com os posts semeados
          }
        }
        setLoading(false);
        requestAnimationFrame(() => { settingsReady.current = true; });
      },
      (err) => {
        console.error('Erro no listener do Firestore:', err);
        setDbError('Não foi possível conectar ao banco de dados. Usando dados locais.');
        setPosts(INITIAL_POSTS);
        setLoading(false);
        requestAnimationFrame(() => { settingsReady.current = true; });
      },
    );

    return () => unsubscribe();
  }, []);

  // ─── SALVA CONFIGURAÇÕES NO FIRESTORE (quando mudam após carregamento) ────────
  useEffect(() => {
    if (!settingsReady.current) return;
    persistSettings({ availableTags, availableFormats, availableStatuses }).catch(console.error);
  }, [availableTags, availableFormats, availableStatuses]);

  // ─── HANDLERS DE ETIQUETAS ───────────────────────────────────────────────────
  const addTag = (name) => setAvailableTags((prev) => [...prev, name]);
  const deleteTag = (name) => {
    setAvailableTags((prev) => prev.filter((t) => t !== name));
    setPosts((prev) => prev.map((p) => ({ ...p, tags: p.tags.filter((t) => t !== name) })));
  };
  const renameTag = (oldName, newName) => {
    setAvailableTags((prev) => prev.map((t) => (t === oldName ? newName : t)));
    setPosts((prev) =>
      prev.map((p) => ({ ...p, tags: p.tags.map((t) => (t === oldName ? newName : t)) }))
    );
  };

  // ─── HANDLERS DE FORMATOS ────────────────────────────────────────────────────
  const addFormat = (name) => setAvailableFormats((prev) => [...prev, name]);
  const deleteFormat = (name) => {
    setAvailableFormats((prev) => prev.filter((f) => f !== name));
    setPosts((prev) => prev.map((p) => ({ ...p, format: p.format === name ? '' : p.format })));
  };
  const renameFormat = (oldName, newName) => {
    setAvailableFormats((prev) => prev.map((f) => (f === oldName ? newName : f)));
    setPosts((prev) => prev.map((p) => ({ ...p, format: p.format === oldName ? newName : p.format })));
  };

  // ─── HANDLERS DE STATUS ──────────────────────────────────────────────────────
  const addStatus = (name) => setAvailableStatuses((prev) => [...prev, name]);
  const deleteStatus = (name) => {
    setAvailableStatuses((prev) => prev.filter((s) => s !== name));
    setPosts((prev) => prev.map((p) => ({ ...p, status: p.status === name ? '' : p.status })));
  };
  const renameStatus = (oldName, newName) => {
    setAvailableStatuses((prev) => prev.map((s) => (s === oldName ? newName : s)));
    setPosts((prev) => prev.map((p) => ({ ...p, status: p.status === oldName ? newName : p.status })));
  };

  // ─── CRUD DE POSTS ───────────────────────────────────────────────────────────
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
      persistPost(toSave).catch(console.error);
    } else {
      // Criação: gera ID, semeia o Firestore e abre o modal no post criado
      const saved = { ...updatedPost, id: Date.now() };
      setPosts((prev) => [...prev, saved]);
      setSelectedPost(saved);
      setSortConfig({ key: 'date', direction: 'asc' });
      persistPost(saved).catch(console.error);
    }
  };

  const handleDeletePost = (post) => {
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    setSelectedPost(null);
    removePost(post.id).catch(console.error);
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
  return (
    <>
      <DashboardHeader
        currentMonth={calendarMonth}
        onMonthChange={setCalendarMonth}
        userRole={userRole}
        onLogout={onLogout}
      />

      {dbError && (
        <div className="db-error-banner">
          ⚠️ {dbError}
        </div>
      )}

      <div className="main">
        {/* ── BARRA DE APROVAÇÃO (somente cliente) ── */}
        {isCliente && (
          <div className={`approval-banner ${postsParaAprovar.length === 0 ? 'approval-banner-done' : ''}`}>
            {postsParaAprovar.length > 0 ? (
              <>
                <div className="approval-banner-text">
                  <span className="approval-banner-count">{postsParaAprovar.length}</span>
                  {postsParaAprovar.length === 1
                    ? ' post aguardando sua aprovação!'
                    : ' posts aguardando sua aprovação!'}
                </div>
                <button className="approval-banner-btn" onClick={startApprovalQueue}>
                  Iniciar revisão ▶
                </button>
              </>
            ) : (
              <div className="approval-banner-text">
                ✅ Todos os posts foram revisados!
              </div>
            )}
          </div>
        )}

        <MonthSelector
          selectedMonths={selectedMonths}
          onToggle={toggleMonth}
          onSelectAll={selectAllMonths}
          onClearAll={clearMonths}
        />

        <KpiRow posts={monthPosts} selectedMonths={selectedMonths} onPostClick={setSelectedPost} />

        <CalendarCard
          currentMonth={calendarMonth}
          calendarDays={calendarDays}
          onMonthChange={(m) => {
            setCalendarMonth(m);
            setSelectedMonths((prev) =>
              prev.includes(m) ? prev : [...prev, m].sort((a, b) => a - b)
            );
          }}
          onPostClick={setSelectedPost}
          onNewPost={isCliente ? null : (date) => openNewPost(date)}
        />

        <ChartsSection pillarChartData={pillarChartData} formatChartData={formatChartData} />

        {!isCliente && (
          <PostsTable
            posts={filteredAndSortedPosts}
            tableFilter={tableFilter}
            onFilterChange={setTableFilter}
            onSort={handleSort}
            onPostClick={setSelectedPost}
            onDeletePost={handleDeletePost}
            onAddPost={openNewPost}
            onBulkSendApproval={(ids) => {
              setPosts((prev) =>
                prev.map((p) => ids.includes(p.id)
                  ? { ...p, enviadoParaAprovacao: true, status: 'Aguardando Aprovação' }
                  : p)
              );
              ids.forEach((id) => {
                const p = posts.find((x) => x.id === id);
                if (p) persistPost({ ...p, enviadoParaAprovacao: true, status: 'Aguardando Aprovação' }).catch(console.error);
              });
            }}
            readOnly={false}
          />
        )}
      </div>

      {/* Renderiza somente quando há post selecionado — garante remontagem limpa
          a cada abertura e que a data pré-preenchida seja sempre aplicada        */}
      {selectedPost && (
        <PostModal
          key={selectedPost.id ?? `new-${selectedPost.date}`}
          post={selectedPost}
          onSave={handleSavePost}
          onDelete={handleDeletePost}
          onClose={() => {
            setSelectedPost(null);
            if (isInApprovalMode) { setApprovalQueue(null); setApprovalIdx(0); }
          }}
          availableTags={availableTags}
          onAddTag={addTag}
          onDeleteTag={deleteTag}
          onRenameTag={renameTag}
          availableFormats={availableFormats}
          onAddFormat={addFormat}
          onDeleteFormat={deleteFormat}
          onRenameFormat={renameFormat}
          availableStatuses={availableStatuses}
          onAddStatus={addStatus}
          onDeleteStatus={deleteStatus}
          onRenameStatus={renameStatus}
          readOnly={isCliente}
          isInApprovalMode={isInApprovalMode}
          approvalIdx={approvalIdx}
          approvalTotal={approvalQueue?.length ?? 0}
          onReviewNext={advanceApprovalQueue}
        />
      )}
    </>
  );
}
