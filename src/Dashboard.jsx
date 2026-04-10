import { useState, useMemo } from 'react';
import { INITIAL_POSTS, CURRENT_YEAR } from './constants';
import DashboardHeader from './components/DashboardHeader';
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
};

export default function Dashboard() {
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [currentMonth, setCurrentMonth] = useState(3); // 3 = Abril
  const [tableFilter, setTableFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });
  const [selectedPost, setSelectedPost] = useState(null);

  // ─── CRUD ──────────────────────────────────────────────────────────────────
  const handleSavePost = (updatedPost) => {
    if (updatedPost.id) {
      // Auto-save: atualiza silenciosamente, mantém modal aberto, não muda sort
      setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
      setSelectedPost(updatedPost);
    } else {
      // Criação: gera ID, reordena por data e reabre modal no post criado
      const saved = { ...updatedPost, id: Date.now() };
      setPosts((prev) => [...prev, saved]);
      setSelectedPost(saved);
      setSortConfig({ key: 'date', direction: 'asc' });
    }
  };

  const handleDeletePost = (post) => {
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    setSelectedPost(null);
  };

  const openNewPost = () => setSelectedPost({ ...NEW_POST_TEMPLATE });

  // ─── CALENDÁRIO ────────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDay = new Date(CURRENT_YEAR, currentMonth, 1).getDay();
    const daysInMonth = new Date(CURRENT_YEAR, currentMonth + 1, 0).getDate();
    const prevDays = new Date(CURRENT_YEAR, currentMonth, 0).getDate();

    const days = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ num: prevDays - i, isOtherMonth: true, dateStr: null, posts: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${CURRENT_YEAR}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        num: d,
        isOtherMonth: false,
        dateStr: ds,
        posts: posts.filter((p) => p.date === ds),
      });
    }

    const total = firstDay + daysInMonth;
    const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let i = 1; i <= remaining; i++) {
      days.push({ num: i, isOtherMonth: true, dateStr: null, posts: [] });
    }

    return days;
  }, [currentMonth, posts]);

  // ─── TABELA ────────────────────────────────────────────────────────────────
  const filteredAndSortedPosts = useMemo(() => {
    let filtered = posts;
    if (tableFilter !== 'all') {
      filtered = filtered.filter(
        (p) => p.format === tableFilter || (p.tags ?? []).includes(tableFilter)
      );
    }
    return [...filtered].sort((a, b) => {
      // tags: ordena pela primeira etiqueta
      const av = sortConfig.key === 'tags' ? (a.tags?.[0] ?? '') : (a[sortConfig.key] ?? '');
      const bv = sortConfig.key === 'tags' ? (b.tags?.[0] ?? '') : (b[sortConfig.key] ?? '');
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [posts, tableFilter, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // ─── GRÁFICOS ──────────────────────────────────────────────────────────────
  const pillarChartData = useMemo(() => {
    const counts = {};
    // cada tag de cada post conta separadamente
    posts.forEach((p) => {
      (p.tags ?? []).forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#BBDEFB', '#A5D6A7', '#FFE082', '#CE93D8', '#F48FB1', '#80DEEA', '#FFCC80'],
        borderWidth: 2,
      }],
    };
  }, [posts]);

  const formatChartData = useMemo(() => {
    const counts = {};
    posts.forEach((p) => { counts[p.format] = (counts[p.format] || 0) + 1; });
    return {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#A5D6A7', '#BBDEFB', '#FFE082', '#CE93D8'],
        borderRadius: 6,
      }],
    };
  }, [posts]);

  return (
    <>
      <DashboardHeader currentMonth={currentMonth} onMonthChange={setCurrentMonth} />

      <div className="main">
        <KpiRow posts={posts} />

        {/* Calendário — largura total */}
        <CalendarCard
          currentMonth={currentMonth}
          calendarDays={calendarDays}
          onMonthChange={setCurrentMonth}
          onPostClick={setSelectedPost}
        />

        {/* Gráficos — dois cards lado a lado */}
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

      {/* key garante remontagem ao criar novo post (id null → id real) */}
      <PostModal
        key={selectedPost?.id ?? 'new'}
        post={selectedPost}
        onSave={handleSavePost}
        onDelete={handleDeletePost}
        onClose={() => setSelectedPost(null)}
      />
    </>
  );
}
