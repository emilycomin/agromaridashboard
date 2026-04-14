import { useState, useEffect } from 'react';
import { fetchUpcomingEvents, isConfigured, newEventUrl, formatEventTime } from '../services/googleCalendar';

// Dados de exemplo exibidos quando a API não está configurada
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

export default function MeetingsWidget() {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const configured = isConfigured();

  useEffect(() => {
    if (!configured) {
      setEvents(DEMO_EVENTS);
      setLoading(false);
      return;
    }
    fetchUpcomingEvents(5)
      .then((evs) => { setEvents(evs); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  return (
    <div className="card meetings-widget">
      {/* Cabeçalho */}
      <div className="meetings-header">
        <div className="meetings-title">
          <span className="meetings-icon">📅</span>
          <h2>Próximas Reuniões</h2>
          {!configured && (
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

        {/* Aviso de configuração */}
        {!configured && (
          <div className="meetings-setup-tip">
            💡 Para ver suas reuniões reais, configure a Google Calendar API no
            arquivo <code>.env.local</code>.
          </div>
        )}
      </div>
    </div>
  );
}
