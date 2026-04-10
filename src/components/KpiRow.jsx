import { useMemo } from 'react';
import { CURRENT_YEAR, MONTH_NAMES } from '../constants';

function monthLabel(selectedMonths) {
  if (selectedMonths.length === 0) return '—';
  if (selectedMonths.length === 12) return 'Ano todo';
  if (selectedMonths.length === 1) return MONTH_NAMES[selectedMonths[0]];
  if (selectedMonths.length <= 3)
    return selectedMonths.map((m) => MONTH_NAMES[m].slice(0, 3)).join(', ');
  return `${selectedMonths.length} meses`;
}

export default function KpiRow({ posts, selectedMonths }) {
  const label = monthLabel(selectedMonths);

  const { totalPosts, uniquePillars, reels, carrosseis, avgPerWeek } = useMemo(() => {
    // Total de dias nos meses selecionados → semanas
    const totalDays = selectedMonths.reduce(
      (sum, m) => sum + new Date(CURRENT_YEAR, m + 1, 0).getDate(),
      0
    );
    const weeks = totalDays / 7;

    const tagSet = new Set();
    posts.forEach((p) => (p.tags ?? []).forEach((t) => tagSet.add(t)));

    return {
      totalPosts:    posts.length,
      uniquePillars: tagSet.size,
      reels:         posts.filter((p) => p.format === 'Reel').length,
      carrosseis:    posts.filter((p) => p.format === 'Carrossel').length,
      avgPerWeek:    posts.length > 0 && weeks > 0
        ? (posts.length / weeks).toFixed(1)
        : '0',
    };
  }, [posts, selectedMonths]);

  return (
    <div className="kpi-row">

      <div className="kpi-card">
        <div className="kpi-label">Posts Planejados</div>
        <div className="kpi-value">{totalPosts}</div>
        <div className="kpi-desc">{label}</div>
      </div>

      <div className="kpi-card purple">
        <div className="kpi-label">Pilares Abordados</div>
        <div className="kpi-value">{uniquePillars}</div>
        <div className="kpi-desc">
          {uniquePillars === 1 ? '1 pilar' : `${uniquePillars} pilares`} · {label}
        </div>
      </div>

      <div className="kpi-card pink">
        <div className="kpi-label">Reels</div>
        <div className="kpi-value">{reels}</div>
        <div className="kpi-desc">Programados · {label}</div>
      </div>

      <div className="kpi-card blue">
        <div className="kpi-label">Carrosséis</div>
        <div className="kpi-value">{carrosseis}</div>
        <div className="kpi-desc">Programados · {label}</div>
      </div>

      <div className="kpi-card orange">
        <div className="kpi-label">Média Semanal</div>
        <div className="kpi-value">{avgPerWeek}</div>
        <div className="kpi-desc">Posts / semana · {label}</div>
      </div>

    </div>
  );
}
