import React, { useState, useMemo } from 'react';
import Chart from 'chart.js/auto';
import { Doughnut, Bar } from 'react-chartjs-2';
import './Dashboard.css'; // Importe o seu CSS original aqui

// ─── DADOS E CONSTANTES ──────────────────────────────────────────────────────
const PILLAR_COLORS = {
  'Educação': { bg: '#E3F2FD', color: '#1565C0', cls: 'pill-educacao' },
  'Antes/Depois': { bg: '#E8F5E9', color: '#1B5E20', cls: 'pill-antes-depois' },
  'Humanização': { bg: '#FFF8E1', color: '#E65100', cls: 'pill-humanizacao' },
  'Prova Social': { bg: '#F3E5F5', color: '#6A1B9A', cls: 'pill-prova-social' },
  'Produtos': { bg: '#FCE4EC', color: '#C2185B', cls: 'pill-produtos' },
  'Entretenimento': { bg: '#E0F7FA', color: '#006064', cls: 'pill-entretenimento' },
  'Especial': { bg: '#FFF3E0', color: '#BF360C', cls: 'pill-especial' },
};

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const TODAY_STR = '2026-04-09';
const CURRENT_YEAR = 2026;

// Substitua por seus dados completos
const INITIAL_POSTS = [
  { date: '2026-04-11', title: 'Antes e Depois: Banho do Bolinha', format: 'Reel', pillar: 'Antes/Depois', status: 'Planejado', notes: 'Nomear o pet, mostrar processo + resultado.' },
  { date: '2026-04-14', title: 'Como escolher a ração certa para seu cão', format: 'Carrossel', pillar: 'Educação', status: 'Planejado', notes: '6-8 slides. Dica sobre porte, raça.' },
  { date: '2026-04-16', title: 'Um dia na Agromari com o Ivonir', format: 'Reel', pillar: 'Humanização', status: 'Planejado', notes: 'Bastidores: chegada, atendimento.' },
  // ... adicione o restante dos posts do array original aqui
];

export default function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(3); // 3 = Abril
  const [tableFilter, setTableFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });
  const [selectedPost, setSelectedPost] = useState(null);

  const formatIcon = (f) => (f === 'Reel' ? '📹' : f === 'Carrossel' ? '📖' : f === 'Stories' ? '📲' : '🖼');

  // ─── LÓGICA DO CALENDÁRIO ───────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDay = new Date(CURRENT_YEAR, currentMonth, 1).getDay();
    const daysInMonth = new Date(CURRENT_YEAR, currentMonth + 1, 0).getDate();
    const prevDays = new Date(CURRENT_YEAR, currentMonth, 0).getDate();
    
    const days = [];
    
    // Dias do mês anterior
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ num: prevDays - i, isOtherMonth: true, dateStr: null, posts: [] });
    }
    
    // Dias do mês atual
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${CURRENT_YEAR}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        num: d,
        isOtherMonth: false,
        dateStr: ds,
        posts: INITIAL_POSTS.filter(p => p.date === ds)
      });
    }
    
    // Dias do próximo mês
    const total = firstDay + daysInMonth;
    const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let i = 1; i <= remaining; i++) {
      days.push({ num: i, isOtherMonth: true, dateStr: null, posts: [] });
    }
    
    return days;
  }, [currentMonth]);

  // ─── LÓGICA DA TABELA ───────────────────────────────────────────────────────
  const filteredAndSortedPosts = useMemo(() => {
    let filterData = INITIAL_POSTS;
    if (tableFilter !== 'all') {
      filterData = filterData.filter(p => p.format === tableFilter || p.pillar === tableFilter);
    }
    
    return filterData.sort((a, b) => {
      const av = a[sortConfig.key];
      const bv = b[sortConfig.key];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [tableFilter, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // ─── DADOS DOS GRÁFICOS ─────────────────────────────────────────────────────
  const pillarChartData = useMemo(() => {
    const counts = {};
    INITIAL_POSTS.forEach(p => { counts[p.pillar] = (counts[p.pillar] || 0) + 1; });
    return {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#BBDEFB','#A5D6A7','#FFE082','#CE93D8','#F48FB1','#80DEEA','#FFCC80'],
        borderWidth: 2
      }]
    };
  }, []);

  const formatChartData = useMemo(() => {
    const counts = {};
    INITIAL_POSTS.forEach(p => { counts[p.format] = (counts[p.format] || 0) + 1; });
    return {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#A5D6A7','#BBDEFB','#FFE082','#CE93D8'],
        borderRadius: 6
      }]
    };
  }, []);

  return (
    <>
      <div className="header">
        <div className="header-left">
          <div className="logo-circle">🐾</div>
          <div>
            <div className="header h1" style={{ fontSize: '20px', fontWeight: 700 }}>AGROMARI PETSHOP</div>
            <div className="header-sub">Dashboard de Conteúdo Instagram · @agro.mari</div>
          </div>
        </div>
        <div className="header-filters">
          <div className="filter-chip">
            📅
            <select value={currentMonth} onChange={(e) => setCurrentMonth(Number(e.target.value))}>
              <option value={3}>Abril 2026</option>
              <option value={4}>Maio 2026</option>
            </select>
          </div>
        </div>
      </div>

      <div className="main">
        {/* KPI ROW */}
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="kpi-label">Posts Planejados</div>
            <div className="kpi-value">{INITIAL_POSTS.length}</div>
            <div className="kpi-desc">Abr + Mai 2026</div>
          </div>
          <div className="kpi-card pink">
            <div className="kpi-label">Reels Planejados</div>
            <div className="kpi-value">{INITIAL_POSTS.filter(p => p.format === 'Reel').length}</div>
            <div className="kpi-desc">Alto alcance orgânico</div>
          </div>
          {/* Outros KPIs omitidos para brevidade, adicione conforme o original */}
        </div>

        <div className="grid-2">
          {/* CALENDÁRIO */}
          <div className="card">
            <div className="card-header">
              <h2>📅 Calendário Editorial</h2>
              <span className="badge">{MONTH_NAMES[currentMonth]} 2026</span>
            </div>
            <div className="card-body">
              <div className="cal-nav">
                <button onClick={() => currentMonth > 3 && setCurrentMonth(m => m - 1)}>‹ Anterior</button>
                <h3>{MONTH_NAMES[currentMonth]} 2026</h3>
                <button onClick={() => currentMonth < 4 && setCurrentMonth(m => m + 1)}>Próximo ›</button>
              </div>
              <div className="calendar-grid">
                {DAY_NAMES.map(d => <div key={d} className="cal-day-header">{d}</div>)}
                {calendarDays.map((day, idx) => (
                  <div key={idx} className={`cal-day ${day.isOtherMonth ? 'other-month' : ''} ${day.dateStr === TODAY_STR ? 'today' : ''} ${day.posts.length ? 'has-post' : ''}`}>
                    <div className="day-num">{day.num}</div>
                    {day.posts.map((post, pIdx) => {
                      const pc = PILLAR_COLORS[post.pillar] || PILLAR_COLORS['Especial'];
                      return (
                        <div key={pIdx} className={`post-pill ${pc.cls}`} title={post.title} onClick={() => setSelectedPost(post)}>
                          {formatIcon(post.format)} {post.title}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* GRÁFICOS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="card">
              <div className="card-header"><h2>🎯 Posts por Pilar</h2></div>
              <div className="card-body">
                <div className="chart-wrap">
                  <Doughnut data={pillarChartData} options={{ maintainAspectRatio: false, cutout: '58%', plugins: { legend: { position: 'right' } } }} />
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h2>📊 Formatos Planejados</h2></div>
              <div className="card-body">
                <div className="chart-wrap" style={{ height: '160px' }}>
                  <Bar data={formatChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABELA DE POSTS */}
        <div className="card grid-full">
          <div className="card-header">
            <h2>📋 Lista de Posts Planejados</h2>
            <span className="badge">{filteredAndSortedPosts.length} posts</span>
          </div>
          <div className="card-body">
            <div className="filter-tabs">
              {['all', 'Reel', 'Carrossel', 'Post', 'Educação', 'Antes/Depois', 'Humanização'].map(filter => (
                <button key={filter} className={`tab-btn ${tableFilter === filter ? 'active' : ''}`} onClick={() => setTableFilter(filter)}>
                  {filter === 'all' ? 'Todos' : filter}
                </button>
              ))}
            </div>
            <div className="table-wrap">
              <table className="posts-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('date')}>Data ↕</th>
                    <th onClick={() => handleSort('title')}>Título / Ideia ↕</th>
                    <th onClick={() => handleSort('format')}>Formato ↕</th>
                    <th onClick={() => handleSort('pillar')}>Pilar ↕</th>
                    <th onClick={() => handleSort('status')}>Status ↕</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedPosts.map((post, idx) => {
                    const pc = PILLAR_COLORS[post.pillar] || PILLAR_COLORS['Especial'];
                    const d = new Date(post.date + 'T12:00:00');
                    return (
                      <tr key={idx}>
                        <td><strong>{d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</strong></td>
                        <td style={{ cursor: 'pointer', color: '#1565C0' }} onClick={() => setSelectedPost(post)}>
                          {formatIcon(post.format)} {post.title}
                        </td>
                        <td><span className="format-tag">{post.format}</span></td>
                        <td><span className={`post-pill ${pc.cls}`}>{post.pillar}</span></td>
                        <td><span className="status-tag">{post.status}</span></td>
                        <td>{post.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP (MODAL) */}
      {selectedPost && (
        <div className="popup-overlay visible" onClick={(e) => e.target.className.includes('popup-overlay') && setSelectedPost(null)}>
          <div className="popup">
            <button className="popup-close" onClick={() => setSelectedPost(null)}>×</button>
            <h3 style={{marginTop: '15px'}}>{selectedPost.title}</h3>
            <div className="popup-date">
              {new Date(selectedPost.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="popup-body">{selectedPost.notes}</div>
          </div>
        </div>
      )}
    </>
  );
}