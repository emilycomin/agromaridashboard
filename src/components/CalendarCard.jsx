import { MONTH_NAMES, DAY_NAMES, TODAY_STR, PILLAR_COLORS, formatIcon } from '../constants';

export default function CalendarCard({ currentMonth, calendarDays, onMonthChange, onPostClick, onNewPost }) {
  return (
    <div className="card cal-card">

      {/* ── Cabeçalho ── */}
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
          {/* Indicadores de estado do dia */}
          <span className="cal-legend-item">
            <span className="cal-legend-dot" style={{ background: '#E8F5E9', border: '2px solid #2D7D3A' }} />
            Hoje
          </span>
          <span className="cal-legend-item">
            <span className="cal-legend-dot" style={{ background: '#F0F0F0', border: '1px solid #E0E0E0' }} />
            Passado
          </span>
        </div>
      </div>

      <div className="card-body">
        {/* Navegação */}
        <div className="cal-nav">
          <button onClick={() => currentMonth > 0 && onMonthChange(currentMonth - 1)}>
            ‹ Anterior
          </button>
          <h3>{MONTH_NAMES[currentMonth]} 2026</h3>
          <button onClick={() => currentMonth < 11 && onMonthChange(currentMonth + 1)}>
            Próximo ›
          </button>
        </div>

        {/* Grade */}
        <div className="calendar-grid">
          {DAY_NAMES.map((d) => (
            <div key={d} className="cal-day-header">{d}</div>
          ))}

          {calendarDays.map((day, idx) => {
            const isToday     = day.dateStr === TODAY_STR;
            const isPast      = !day.isOtherMonth && day.dateStr && day.dateStr < TODAY_STR;
            const isClickable = !day.isOtherMonth && day.dateStr;

            return (
              <div
                key={idx}
                className={[
                  'cal-day',
                  day.isOtherMonth ? 'other-month'    : '',
                  isToday          ? 'today'           : '',
                  isPast           ? 'past'            : '',
                  day.posts.length ? 'has-post'        : '',
                  isClickable      ? 'cal-day-clickable' : '',
                ].join(' ').trim()}
                onClick={() => isClickable && onNewPost(day.dateStr)}
                title={isClickable ? `Novo post em ${day.num}` : undefined}
              >
                {/* Número do dia + badge "Hoje" */}
                <div className="day-num">
                  {day.num}
                  {isToday && <span className="today-badge">Hoje</span>}
                </div>

                {/* Posts do dia */}
                {day.posts.map((post, pIdx) => {
                  const pc = PILLAR_COLORS[post.tags?.[0]] || PILLAR_COLORS['Especial'];
                  return (
                    <div
                      key={pIdx}
                      className={`post-pill ${pc.cls}`}
                      title={post.title}
                      onClick={(e) => { e.stopPropagation(); onPostClick(post); }}
                    >
                      {formatIcon(post.format)} {post.title}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
