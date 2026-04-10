import { useState, useMemo, useEffect, useRef } from 'react';
import { INITIAL_POSTS, CURRENT_YEAR, FORMATS, STATUSES, PILLAR_COLORS } from './constants';
import { loadPosts, persistPost, removePost, loadSettings, persistSettings } from './services/db';
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
export default function Dashboard() {
  const [posts, setPosts]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [dbError, setDbError]           = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(3);   // mês exibido no calendário
  const [selectedMonths, setSelectedMonths] = useState([3]); // meses do filtro (multi)
  const [tableFilter, setTableFilter]   = useState('all');
  const [sortConfig, setSortConfig]     = useState({ key: 'date', direction: 'asc' });
  const [selectedPost, setSelectedPost] = useState(null);

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

  // ─── CARREGAMENTO INICIAL DO FIRESTORE ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        // Carrega configurações
        const settings = await loadSettings();
        if (!cancelled && settings) {
          if (settings.availableTags?.length)     setAvailableTags(settings.availableTags);
          if (settings.availableFormats?.length)  setAvailableFormats(settings.availableFormats);
          if (settings.availableStatuses?.length) setAvailableStatuses(settings.availableStatuses);
        }

        // Carrega posts
        const firestorePosts = await loadPosts();
        if (cancelled) return;

        if (firestorePosts.length > 0) {
          // Mescla: adiciona ao Firestore apenas os posts do INITIAL_POSTS que ainda não existem
          const existingIds = new Set(firestorePosts.map((p) => String(p.id)));
          const missing = INITIAL_POSTS.filter((p) => !existingIds.has(String(p.id)));
          if (missing.length > 0) {
            await Promise.all(missing.map((p) => persistPost(p)));
          }
          const allPosts = [...firestorePosts, ...missing]
            .sort((a, b) => (a.date < b.date ? -1 : 1));
          setPosts(allPosts);
        } else {
          // Primeira vez: semeia com todos os posts
          await Promise.all(INITIAL_POSTS.map((p) => persistPost(p)));
          setPosts(INITIAL_POSTS);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do Firestore:', err);
        if (!cancelled) {
          setDbError('Não foi possível conectar ao banco de dados. Usando dados locais.');
          setPosts(INITIAL_POSTS);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          // Libera o save automático de configurações apenas após o carregamento
          requestAnimationFrame(() => { settingsReady.current = true; });
        }
      }
    }

    bootstrap();
    return () => { cancelled = true; };
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
      // Auto-save: adiciona entrada no histórico e persiste no Firestore
      let toSave;
      setPosts((prev) => prev.map((p) => {
        if (p.id !== updatedPost.id) return p;
        const entry = buildHistoryEntry(p, updatedPost);
        const newHistory = entry ? [...(p.history ?? []), entry] : (p.history ?? []);
        toSave = { ...updatedPost, history: newHistory };
        return toSave;
      }));
      setSelectedPost((prev) => {
        if (!prev) return prev;
        const entry = buildHistoryEntry(prev, updatedPost);
        const newHistory = entry ? [...(prev.history ?? []), entry] : (prev.history ?? []);
        return { ...updatedPost, history: newHistory };
      });
      // toSave é definido sincronamente dentro do updater do setPosts
      if (toSave) persistPost(toSave).catch(console.error);
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
      <DashboardHeader currentMonth={calendarMonth} onMonthChange={setCalendarMonth} />

      {dbError && (
        <div className="db-error-banner">
          ⚠️ {dbError}
        </div>
      )}

      <div className="main">
        <MonthSelector
          selectedMonths={selectedMonths}
          onToggle={toggleMonth}
          onSelectAll={selectAllMonths}
          onClearAll={clearMonths}
        />

        <KpiRow posts={monthPosts} selectedMonths={selectedMonths} />

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
          onNewPost={(date) => openNewPost(date)}
        />

        <ChartsSection pillarChartData={pillarChartData} formatChartData={formatChartData} />

        <PostsTable
          posts={filteredAndSortedPosts}
          tableFilter={tableFilter}
          onFilterChange={setTableFilter}
          onSort={handleSort}
          onPostClick={setSelectedPost}
          onDeletePost={handleDeletePost}
          onAddPost={openNewPost}
        />
      </div>

      {/* Renderiza somente quando há post selecionado — garante remontagem limpa
          a cada abertura e que a data pré-preenchida seja sempre aplicada        */}
      {selectedPost && (
        <PostModal
          key={selectedPost.id ?? `new-${selectedPost.date}`}
          post={selectedPost}
          onSave={handleSavePost}
          onDelete={handleDeletePost}
          onClose={() => setSelectedPost(null)}
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
        />
      )}
    </>
  );
}
