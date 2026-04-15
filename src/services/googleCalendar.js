// ─── Google Calendar API Integration ─────────────────────────────────────────
// Autenticação via OAuth 2.0 (token obtido no login com Google).
// O token é passado como parâmetro — não é armazenado aqui.

/**
 * Busca os próximos eventos do Google Calendar usando um token OAuth.
 * @param {string} accessToken  - Token OAuth do usuário autenticado
 * @param {number} maxResults   - Número máximo de eventos (default 10)
 * @returns {Promise<Array>}
 */
export async function fetchUpcomingEvents(accessToken, maxResults = 10) {
  if (!accessToken) return [];

  const timeMin = new Date().toISOString();
  const url = new URL(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events'
  );
  url.searchParams.set('timeMin',      timeMin);
  url.searchParams.set('maxResults',   String(maxResults));
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy',      'startTime');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) throw new Error('Token expirado. Faça login novamente.');
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
