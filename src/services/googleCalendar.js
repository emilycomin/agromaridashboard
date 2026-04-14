// ─── Google Calendar API Integration ─────────────────────────────────────────
// Configuração: adicione as variáveis no arquivo .env.local na raiz do projeto:
//   VITE_GCAL_API_KEY=sua_api_key
//   VITE_GCAL_CALENDAR_ID=seu_email@gmail.com

const API_KEY     = import.meta.env.VITE_GCAL_API_KEY     ?? '';
const CALENDAR_ID = import.meta.env.VITE_GCAL_CALENDAR_ID ?? '';

export const isConfigured = () => !!API_KEY && !!CALENDAR_ID;

/**
 * Busca os próximos eventos do Google Calendar.
 * @param {number} maxResults - Número máximo de eventos (default 10)
 * @returns {Promise<Array>} Lista de eventos formatados
 */
export async function fetchUpcomingEvents(maxResults = 10) {
  if (!isConfigured()) return [];

  const timeMin = new Date().toISOString();
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`
  );
  url.searchParams.set('key',          API_KEY);
  url.searchParams.set('timeMin',      timeMin);
  url.searchParams.set('maxResults',   String(maxResults));
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy',      'startTime');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Google Calendar API error: ${res.status}`);

  const data = await res.json();
  return (data.items ?? []).map(formatEvent);
}

/**
 * Normaliza um evento da API para o formato usado nos componentes.
 */
function formatEvent(item) {
  const isAllDay = !!item.start?.date;
  const startRaw = item.start?.dateTime ?? item.start?.date ?? '';
  const endRaw   = item.end?.dateTime   ?? item.end?.date   ?? '';

  const start = startRaw ? new Date(startRaw) : null;
  const end   = endRaw   ? new Date(endRaw)   : null;

  return {
    id:          item.id,
    title:       item.summary ?? '(sem título)',
    description: item.description ?? '',
    location:    item.location ?? '',
    isAllDay,
    start,
    end,
    htmlLink:    item.htmlLink ?? '',
    colorId:     item.colorId ?? null,
  };
}

/**
 * Monta a URL para criar um novo evento no Google Calendar.
 * @param {string} title - Título pré-preenchido (opcional)
 */
export function newEventUrl(title = '') {
  const base = 'https://calendar.google.com/calendar/r/eventedit';
  return title ? `${base}?text=${encodeURIComponent(title)}` : base;
}

/**
 * Formata data/hora de um evento para exibição em pt-BR.
 */
export function formatEventTime(event) {
  if (!event.start) return '';
  if (event.isAllDay) {
    return event.start.toLocaleDateString('pt-BR', {
      weekday: 'short', day: '2-digit', month: '2-digit',
    });
  }
  const date = event.start.toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit',
  });
  const timeStart = event.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const timeEnd   = event.end
    ? event.end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';
  return `${date} · ${timeStart}${timeEnd ? ` – ${timeEnd}` : ''}`;
}
