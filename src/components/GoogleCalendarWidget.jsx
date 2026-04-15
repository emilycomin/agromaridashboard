import { useState, useEffect } from 'react';
import { fetchUpcomingEvents, newEventUrl, formatEventTime } from '../services/googleCalendar';

const DEMO_EVENTS = [
  {
    id: 'sm-demo-1',
    title: 'Reunião de pauta — Agromari',
    start: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(14, 0); return d; })(),
    end:   (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(15, 0); return d; })(),
    isAllDay: false, htmlLink: '',
  },
  {
    id: 'sm-demo-2',
    title: 'Aprovação de conteúdo',
    start: (() => { const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(10, 0); return d; })(),
    end:   (() => { const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(10, 30); return d; })(),
    isAllDay: false, htmlLink: '',
  },
  {
    id: 'sm-demo-3',
    title: 'Entrega de relatório mensal',
    start: (() => { const d = new Date(); d.setDate(d.getDate() + 5); d.setHours(9, 0); return d; })(),
    end:   (() => { const d = new Date(); d.setDate(d.getDate() + 5); d.setHours(10, 0); return d; })(),
    isAllDay: false, htmlLink: '',
  },
  {
    id: 'sm-demo-4',
    title: 'Sessão de fotos pets',
    start: (() => { const d = new Date(); d.setDate(d.getDate() + 8); d.setHours(13, 0); return d; })(),
    end:   (() => { const d = new Date(); d.setDate(d.getDate() + 8); d.setHours(17, 0); return d; })(),
    isAllDay: false, htmlLink: '',
  },
];

export default function GoogleCalendarWidget({ googleAccessToken = null }) {
  const [events,    setEvents]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!googleAccessToken) {
      setEvents(DEMO_EVENTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchUpcomingEvents(googleAccessToken, 8)
      .then((evs) => { setEvents(evs); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [googleAccessToken]);

  return (
    <div className={`card gcal-widget${collapsed ? ' gcal-widget-collapsed' : ''}`}>
      {/* Cabeçalho */}
      <div className="gcal-header">
        <div className="gcal-title">
          <span className="gcal-icon">🗓</span>
          <h2>Agenda Google Calendar</h2>
          {!googleAccessToken && <span className="meetings-demo-badge">demonstração</span>}
        </div>
        <div className="gcal-header-actions">
          <a
            href={newEventUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-agendar"
          >
            + Agendar Reunião
          </a>
          <button
            className="gcal-collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Expandir' : 'Recolher'}
          >
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {/* Corpo */}
      {!collapsed && (
        <div className="gcal-body">
          {loading && <div className="meetings-empty">Carregando eventos…</div>}
          {error   && <div className="meetings-error">⚠ Erro: {error}</div>}

          {!loading && !error && events.length === 0 && (
            <div className="meetings-empty">Nenhum evento próximo.</div>
          )}

          {!loading && !error && (
            <div className="gcal-events-grid">
              {events.map((ev) => (
                <a
                  key={ev.id}
                  href={ev.htmlLink || newEventUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gcal-event-card"
                >
                  <div className="gcal-event-date">
                    <span className="gcal-event-day">
                      {ev.start?.toLocaleDateString('pt-BR', { day: '2-digit' })}
                    </span>
                    <span className="gcal-event-month">
                      {ev.start?.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                    </span>
                  </div>
                  <div className="gcal-event-info">
                    <span className="gcal-event-title">{ev.title}</span>
                    <span className="gcal-event-time">
                      {ev.isAllDay
                        ? 'Dia inteiro'
                        : `${ev.start?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${ev.end ? ' – ' + ev.end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}`}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}

          {!googleAccessToken && (
            <div className="meetings-setup-tip">
              💡 Faça login com Google para ver sua agenda real.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
