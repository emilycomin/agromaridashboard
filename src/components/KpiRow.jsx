export default function KpiRow({ posts }) {
  const reelsCount = posts.filter((p) => p.format === 'Reel').length;

  return (
    <div className="kpi-row">
      <div className="kpi-card">
        <div className="kpi-label">Posts Planejados</div>
        <div className="kpi-value">{posts.length}</div>
        <div className="kpi-desc">Abr + Mai 2026</div>
      </div>
      <div className="kpi-card pink">
        <div className="kpi-label">Reels Planejados</div>
        <div className="kpi-value">{reelsCount}</div>
        <div className="kpi-desc">Alto alcance orgânico</div>
      </div>
    </div>
  );
}
