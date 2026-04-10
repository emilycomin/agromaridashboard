import { MONTH_NAMES, DAY_NAMES, TODAY_STR, PILLAR_COLORS, formatIcon } from '../constants';

export default function CalendarCard({ currentMonth, calendarDays, onMonthChange, onPostClick }) {
  return (
    <div className="card cal-card">

      {/* ── Cabeçalho: título + badge + navegação + legenda ── */}
      <div className="card-header cal-card-header">
        <div className="cal-header-top">
          <h2>📅 Calendário Editorial</h2>
          <span className="badge">{MONTH_NAMES[currentMonth]} 2026</span>
        </div>

        {/* Legenda de cores */}
        <div className="cal-legend">
          {Object.entries(PILLAR_COLORS).map(([name, { bg, color }]) => (
            <span key={name} className="cal-legend-item">
              <span className="cal-legend-dot" style={{ background: bg, border: `1.5px solid ${color}` }} />
              {name}
            </span>
          ))}
        </div>
      </div>

      <div className="card-body">
        {/* Navegação de meses */}
        <div className="cal-nav">
          <button onClick={() => currentMonth > 0 && onMonthChange(currentMonth - 1)}>
            ‹ Anterior
          </button>
          <h3>{MONTH_NAMES[currentMonth]} 2026</h3>
          <button onClick={() => currentMonth < 11 && onMonthChange(currentMonth + 1)}>
            Próximo ›
          </button>
        </div>

        {/* Grade do calendário */}
        <div className="calendar-grid">
          {DAY_NAMES.map((d) => (
            <div key={d} className="cal-day-header">{d}</div>
          ))}
          {calendarDays.map((day, idx) => (
            <div
              key={idx}
              className={[
                'cal-day',
                day.isOtherMonth ? 'other-month' : '',
                day.dateStr === TODAY_STR ? 'today' : '',
                day.posts.length ? 'has-post' : '',
              ].join(' ').trim()}
            >
              <div className="day-num">{day.num}</div>
              {day.posts.map((post, pIdx) => {
                const primaryTag = post.tags?.[0];
                const pc = PILLAR_COLORS[primaryTag] || PILLAR_COLORS['Especial'];
                return (
                  <div
                    key={pIdx}
                    className={`post-pill ${pc.cls}`}
                    title={post.title}
                    onClick={() => onPostClick(post)}
                  >
                    {formatIcon(post.format)} {post.title}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
