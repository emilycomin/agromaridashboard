import { useState, useEffect } from 'react';
import { fetchUpcomingEvents, newEventUrl, formatEventTime } from '../services/googleCalendar';

// Dados de exemplo exibidos quando não há token
const DEMO_EVENTS = [
  {
    id: 'demo-1',
    title: 'Reunião de alinhamento — Agromari',
    start: (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(14, 0); return d; })(),
    end:   (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(15, 0); return d; })(),
    isAllDay: false,
    htmlLink: '',
  },
  {
    id: 'demo-2',
    title: 'Aprovação de posts — Abril',
    start: (() => { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(10, 0); return d; })(),
    end:   (() => { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(10, 30); return d; })(),
    isAllDay: false,
    htmlLink: '',
  },
  {
    id: 'demo-3',
    title: 'Revisão de estratégia mensal',
    start: (() => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(9, 0); return d; })(),
    end:   (() => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(10, 0); return d; })(),
    isAllDay: false,
    htmlLink: '',
  },
];

export default function MeetingsWidget({ googleAccessToken = null }) {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!googleAccessToken) {
      setEvents(DEMO_EVENTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchUpcomingEvents(googleAccessToken, 5)
      .then((evs) => { setEvents(evs); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [googleAccessToken]);

  return (
    <div className="card meetings-widget">
      {/* Cabeçalho */}
      <div className="meetings-header">
        <div className="meetings-title">
          <span className="meetings-icon">📅</span>
          <h2>Próximas Reuniões</h2>
          {!googleAccessToken && (
            <span className="meetings-demo-badge">demonstração</span>
          )}
        </div>
        <a
          href={newEventUrl('Reunião — Agromari Petshop')}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-agendar"
        >
          + Agendar Reunião
        </a>
      </div>

      {/* Corpo */}
      <div className="meetings-body">
        {loading && (
          <div className="meetings-empty">Carregando eventos…</div>
        )}

        {error && (
          <div className="meetings-error">
            ⚠ Erro ao carregar eventos: {error}
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="meetings-empty">Nenhuma reunião agendada.</div>
        )}

        {!loading && !error && events.map((ev) => (
          <a
            key={ev.id}
            href={ev.htmlLink || newEventUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="meeting-item"
          >
            <div className="meeting-dot" />
            <div className="meeting-info">
              <span className="meeting-title">{ev.title}</span>
              <span className="meeting-time">{formatEventTime(ev)}</span>
            </div>
            <span className="meeting-arrow">›</span>
          </a>
        ))}

        {/* Aviso quando não há sessão Google */}
        {!googleAccessToken && (
          <div className="meetings-setup-tip">
            💡 Faça login como Social Media com sua conta Google para ver reuniões reais.
          </div>
        )}
      </div>
    </div>
  );
}
