import { useMemo, useState, lazy, Suspense } from 'react';
import { CURRENT_YEAR, MONTH_NAMES, formatIcon } from '../constants';

// Lazy-load ApexCharts para não bloquear o bundle principal
const Chart = lazy(() => import('react-apexcharts'));

function monthLabel(selectedMonths) {
  if (selectedMonths.length === 0) return '—';
  if (selectedMonths.length === 12) return 'Ano todo';
  if (selectedMonths.length === 1) return MONTH_NAMES[selectedMonths[0]];
  if (selectedMonths.length <= 3)
    return selectedMonths.map((m) => MONTH_NAMES[m].slice(0, 3)).join(', ');
  return `${selectedMonths.length} meses`;
}

// ─── Gráfico de barra circular (radialBar) ────────────────────────────────────
function CircularProgress({ pct }) {
  const options = {
    chart: { type: 'radialBar', sparkline: { enabled: true } },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle:    135,
        track: {
          background: '#EDE7DC',
          strokeWidth: '100%',
        },
        dataLabels: {
          name:  { show: false },
          value: {
            offsetY:   6,
            fontSize:  '22px',
            fontWeight: 800,
            color:     '#4338CA',
            formatter: (v) => `${Math.round(v)}%`,
          },
        },
        hollow: { size: '58%' },
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade:            'light',
        type:             'horizontal',
        shadeIntensity:   0.3,
        gradientToColors: ['#514c72'],
        inverseColors:    false,
        opacityFrom:      1,
        opacityTo:        1,
        stops:            [0, 100],
      },
    },
    stroke: { lineCap: 'round' },
    colors: ['#4338CA'],
  };

  return (
    <div className="circ-progress-wrap">
      <Suspense fallback={<div className="circ-placeholder">{pct}%</div>}>
        <Chart
          type="radialBar"
          series={[pct]}
          options={options}
          height={140}
          width={140}
        />
      </Suspense>
    </div>
  );
}

// ─── Overlay com lista de posts filtrados ─────────────────────────────────────
function KpiPostsOverlay({ posts, title, color, onClose, onPostClick }) {
  return (
    <div className="kpi-overlay-backdrop" onClick={onClose}>
      <div className="kpi-overlay-panel" onClick={(e) => e.stopPropagation()}>
        <div className="kpi-overlay-header" style={{ borderLeftColor: color }}>
          <h3 className="kpi-overlay-title">{title}</h3>
          <span className="kpi-overlay-count">
            {posts.length} post{posts.length !== 1 ? 's' : ''}
          </span>
          <button className="kpi-overlay-close" onClick={onClose}>×</button>
        </div>
        <div className="kpi-overlay-list">
          {posts.length === 0 && (
            <p className="kpi-overlay-empty">Nenhum post encontrado.</p>
          )}
          {posts.map((post) => {
            const d = new Date(post.date + 'T12:00:00');
            return (
              <div
                key={post.id}
                className="kpi-overlay-item"
                onClick={() => { onPostClick(post); onClose(); }}
              >
                <span className="kpi-overlay-date">
                  {d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </span>
                <span className="kpi-overlay-icon">{formatIcon(post.format)}</span>
                <span className="kpi-overlay-name">{post.title}</span>
                {post.clienteNotes && (
                  <span className="kpi-overlay-note" title={post.clienteNotes}>💬</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── KpiRow ───────────────────────────────────────────────────────────────────
export default function KpiRow({ posts, selectedMonths, onPostClick }) {
  const label = monthLabel(selectedMonths);
  const [activeFilter, setActiveFilter] = useState(null);

  const {
    totalPosts, uniquePillars, reels, carrosseis, avgPerWeek,
    postsRejeitados, postsAjustes,
    prontosPct, prontosCount,
  } = useMemo(() => {
    const totalDays = selectedMonths.reduce(
      (sum, m) => sum + new Date(CURRENT_YEAR, m + 1, 0).getDate(), 0
    );
    const weeks  = totalDays / 7;
    const tagSet = new Set();
    posts.forEach((p) => (p.tags ?? []).forEach((t) => tagSet.add(t)));

    // "Prontos" = Agendado + Publicado + Aprovado (pelo cliente)
    const prontos = posts.filter(
      (p) => p.status === 'Agendado' || p.status === 'Publicado' || p.clienteReview === 'aprovado'
    );
    const pct = posts.length > 0 ? Math.round((prontos.length / posts.length) * 100) : 0;

    return {
      totalPosts:     posts.length,
      uniquePillars:  tagSet.size,
      reels:          posts.filter((p) => p.format === 'Reel').length,
      carrosseis:     posts.filter((p) => p.format === 'Carrossel').length,
      avgPerWeek:     posts.length > 0 && weeks > 0
        ? (posts.length / weeks).toFixed(1) : '0',
      postsRejeitados: posts.filter((p) => p.clienteReview === 'rejeitado'),
      postsAjustes:    posts.filter((p) => p.clienteReview === 'ajustes'),
      prontosPct:      pct,
      prontosCount:    prontos.length,
    };
  }, [posts, selectedMonths]);

  const toggleFilter = (key) =>
    setActiveFilter((prev) => (prev === key ? null : key));

  const overlayConfig = {
    rejeitado: { title: '❌ Posts Rejeitados',   color: '#E53935', posts: postsRejeitados },
    ajustes:   { title: '✏️ Posts com Ajustes', color: '#FBC02D', posts: postsAjustes    },
  };

  return (
    <>
      <div className="kpi-row">

        {/* Posts Planejados */}
        <div className="kpi-card">
          <div className="kpi-label">Posts Planejados</div>
          <div className="kpi-value">{totalPosts}</div>
          <div className="kpi-desc">{label}</div>
        </div>

        {/* Posts Prontos — gráfico radial */}
        <div className="kpi-card kpi-card-chart kpi-aprovado">
          <div className="kpi-label">Posts Prontos</div>
          <CircularProgress pct={prontosPct} />
        </div>

        {/* Rejeitados */}
        <div
          className={`kpi-card kpi-rejeitado kpi-clickable ${activeFilter === 'rejeitado' ? 'kpi-active' : ''}`}
          onClick={() => toggleFilter('rejeitado')}
          title="Ver posts rejeitados"
        >
          <div className="kpi-label">Rejeitados</div>
          <div className="kpi-value">{postsRejeitados.length}</div>
          <div className="kpi-desc">Pelo cliente · {label}</div>
          <span className="kpi-click-hint">ver posts →</span>
        </div>

        {/* Ajustes */}
        <div
          className={`kpi-card kpi-ajustes kpi-clickable ${activeFilter === 'ajustes' ? 'kpi-active' : ''}`}
          onClick={() => toggleFilter('ajustes')}
          title="Ver posts com ajustes"
        >
          <div className="kpi-label">Ajustes</div>
          <div className="kpi-value">{postsAjustes.length}</div>
          <div className="kpi-desc">Solicitados · {label}</div>
          <span className="kpi-click-hint">ver posts →</span>
        </div>

        {/* Pilares */}
        <div className="kpi-card purple">
          <div className="kpi-label">Pilares Abordados</div>
          <div className="kpi-value">{uniquePillars}</div>
          <div className="kpi-desc">
            {uniquePillars === 1 ? '1 pilar' : `${uniquePillars} pilares`} · {label}
          </div>
        </div>

        {/* Reels */}
        <div className="kpi-card pink">
          <div className="kpi-label">Reels</div>
          <div className="kpi-value">{reels}</div>
          <div className="kpi-desc">Programados · {label}</div>
        </div>

        {/* Carrosséis */}
        <div className="kpi-card blue">
          <div className="kpi-label">Carrosséis</div>
          <div className="kpi-value">{carrosseis}</div>
          <div className="kpi-desc">Programados · {label}</div>
        </div>

        {/* Média Semanal */}
        <div className="kpi-card orange">
          <div className="kpi-label">Média Semanal</div>
          <div className="kpi-value">{avgPerWeek}</div>
          <div className="kpi-desc">Posts / semana · {label}</div>
        </div>

      </div>

      {activeFilter && overlayConfig[activeFilter] && (
        <KpiPostsOverlay
          {...overlayConfig[activeFilter]}
          onClose={() => setActiveFilter(null)}
          onPostClick={onPostClick}
        />
      )}
    </>
  );
}
