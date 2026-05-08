import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { fetchUpcomingEvents, newEventUrl, formatEventTime } from '../services/googleCalendar';
import { MONTH_NAMES, DAY_NAMES, TODAY_STR, CURRENT_YEAR } from '../constants';

// ─── Cores por ID do Google Calendar ─────────────────────────────────────────
const GCAL_COLORS = {
  '1': '#7986CB', '2': '#33B679', '3': '#8E24AA', '4': '#E67C73',
  '5': '#F6BF26', '6': '#F4511E', '7': '#039BE5', '8': '#616161',
  '9': '#3F51B5', '10': '#0B8043', '11': '#D50000',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function buildCalendarDays(year, month) {
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays    = new Date(year, month, 0).getDate();
  const days = [];

  for (let i = firstDay - 1; i >= 0; i--)
    days.push({ num: prevDays - i, isOther: true, date: null });

  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      num: d,
      isOther: false,
      date: new Date(year, month, d),
    });
  }

  const remaining = (firstDay + daysInMonth) % 7;
  for (let i = 1; i <= (remaining === 0 ? 0 : 7 - remaining); i++)
    days.push({ num: i, isOther: true, date: null });

  return days;
}

// ─── Draggable post item ──────────────────────────────────────────────────────
function DraggableTabPost({ post, onPostClick, isDragDisabled }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: post.id,
    disabled: isDragDisabled,
    data: { post },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="cal-tab-item cal-tab-item-post cal-draggable-pill"
      style={{ opacity: isDragging ? 0.3 : 1, touchAction: 'none', cursor: isDragDisabled ? 'default' : 'grab' }}
      title={post.title}
      onClick={(e) => { e.stopPropagation(); if (!isDragging) onPostClick(post); }}
    >
      {post.title}
    </div>
  );
}

// ─── Droppable day cell ───────────────────────────────────────────────────────
function DroppableTabDay({ dateStr, disabled, children, className, onClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr ?? '__disabled__', disabled });

  return (
    <div
      ref={setNodeRef}
      className={`${className}${isOver && !disabled ? ' cal-drop-over' : ''}`}
      onClick={onClick}
      style={isOver && !disabled ? { outline: '2px dashed #6C63FF', outlineOffset: '-2px', background: 'rgba(108,99,255,0.04)' } : undefined}
    >
      {children}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function CalendarTab({ posts = [], onPostClick, onNewPost, onMovePost, currentMonth, onMonthChange, googleAccessToken = null }) {
  const [gcalEvents, setGcalEvents] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [view,       setView]       = useState('month');
  const [syncing,    setSyncing]    = useState(false);
  const [activePost, setActivePost] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const loadEvents = () => {
    setLoading(true);
    setError(null);
    if (!googleAccessToken) {
      const demo = [
        { id:'d1', title:'Reunião de pauta',       start: new Date(CURRENT_YEAR, currentMonth, 3,  14, 0), end: new Date(CURRENT_YEAR, currentMonth, 3,  15, 0),  isAllDay:false, htmlLink:'', colorId:'7' },
        { id:'d2', title:'Aprovação de conteúdo',  start: new Date(CURRENT_YEAR, currentMonth, 7,  10, 0), end: new Date(CURRENT_YEAR, currentMonth, 7,  10, 30), isAllDay:false, htmlLink:'', colorId:'2' },
        { id:'d3', title:'Sessão de fotos',        start: new Date(CURRENT_YEAR, currentMonth, 12,  9, 0), end: new Date(CURRENT_YEAR, currentMonth, 12, 12, 0),  isAllDay:false, htmlLink:'', colorId:'6' },
        { id:'d4', title:'Entrega relatório',      start: new Date(CURRENT_YEAR, currentMonth, 18,  9, 0), end: new Date(CURRENT_YEAR, currentMonth, 18, 10, 0),  isAllDay:false, htmlLink:'', colorId:'4' },
        { id:'d5', title:'Revisão estratégia',     start: new Date(CURRENT_YEAR, currentMonth, 22, 15, 0), end: new Date(CURRENT_YEAR, currentMonth, 22, 16, 0),  isAllDay:false, htmlLink:'', colorId:'3' },
        { id:'d6', title:'Workshop de conteúdo',   start: new Date(CURRENT_YEAR, currentMonth, 25,  9, 0), end: new Date(CURRENT_YEAR, currentMonth, 25, 17, 0),  isAllDay:true,  htmlLink:'', colorId:'5' },
      ];
      setGcalEvents(demo);
      setLoading(false);
      return;
    }
    fetchUpcomingEvents(googleAccessToken, 50)
      .then(evs => { setGcalEvents(evs); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { loadEvents(); }, [currentMonth, googleAccessToken]); // eslint-disable-line

  const handleSync = async () => {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 800));
    loadEvents();
    setSyncing(false);
  };

  const handleDragStart = ({ active }) => {
    setActivePost(active.data.current?.post ?? null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActivePost(null);
    if (!over || !onMovePost) return;
    const newDate = over.id;
    if (!newDate || newDate === '__disabled__') return;
    const post = posts.find((p) => p.id === active.id);
    if (!post || post.date === newDate) return;
    onMovePost(active.id, newDate);
  };

  const isDragDisabled = !onMovePost;

  const calendarDays   = useMemo(() => buildCalendarDays(CURRENT_YEAR, currentMonth), [currentMonth]);
  const gcalThisMonth  = useMemo(() => gcalEvents.filter(ev => ev.start && ev.start.getFullYear() === CURRENT_YEAR && ev.start.getMonth() === currentMonth), [gcalEvents, currentMonth]);
  const postsThisMonth = useMemo(() => posts.filter(p => { if (!p.date) return false; const [y, m] = p.date.split('-').map(Number); return y === CURRENT_YEAR && m - 1 === currentMonth; }), [posts, currentMonth]);
  const upcomingEvents = useMemo(() => { const now = new Date(); return [...gcalEvents].filter(ev => ev.start && ev.start >= now).sort((a, b) => a.start - b.start).slice(0, 20); }, [gcalEvents]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
    <div className="cal-tab">

      {/* ── Barra de controles ── */}
      <div className="cal-tab-toolbar">
        <div className="cal-tab-toolbar-left">
          <button className="cal-tab-nav-btn" onClick={() => onMonthChange(Math.max(0, currentMonth - 1))} disabled={currentMonth === 0}>‹</button>
          <h2 className="cal-tab-month-label">{MONTH_NAMES[currentMonth]} {CURRENT_YEAR}</h2>
          <button className="cal-tab-nav-btn" onClick={() => onMonthChange(Math.min(11, currentMonth + 1))} disabled={currentMonth === 11}>›</button>
        </div>

        <div className="cal-tab-toolbar-center">
          <div className="cal-tab-view-toggle">
            <button className={`cal-tab-view-btn${view === 'month' ? ' active' : ''}`} onClick={() => setView('month')}>📅 Mês</button>
            <button className={`cal-tab-view-btn${view === 'list'  ? ' active' : ''}`} onClick={() => setView('list') }>📋 Lista</button>
          </div>
        </div>

        <div className="cal-tab-toolbar-right">
          <div className={`cal-tab-sync-status ${googleAccessToken ? 'connected' : 'demo'}`}>
            <span className="cal-tab-sync-dot" />
            {googleAccessToken ? 'Google Calendar conectado' : 'Modo demonstração'}
          </div>
          <button className="cal-tab-sync-btn" onClick={handleSync} disabled={syncing || loading} title="Sincronizar com Google Calendar">
            <span className={syncing ? 'cal-tab-spin' : ''}>🔄</span>
            {syncing ? 'Sincronizando…' : 'Sincronizar'}
          </button>
          <a href={newEventUrl()} target="_blank" rel="noopener noreferrer" className="btn-agendar">
            + Agendar
          </a>
        </div>
      </div>

      {/* ── Aviso de configuração ── */}
      {!googleAccessToken && (
        <div className="cal-tab-setup-bar">
          <span>💡</span>
          <span>Faça login como Social Media com sua conta Google para ver sua agenda real aqui.</span>
        </div>
      )}

      {error && <div className="cal-tab-error">⚠ Erro ao carregar: {error}</div>}

      {/* ── Vista Mês ── */}
      {view === 'month' && (
        <div className="cal-tab-month">
          <div className="cal-tab-legend">
            <span className="cal-tab-legend-item"><span className="cal-tab-legend-dot post-dot" />Post planejado</span>
            <span className="cal-tab-legend-item"><span className="cal-tab-legend-dot gcal-dot" />Evento Google Calendar</span>
            {!isDragDisabled && <span className="cal-tab-legend-item" style={{ color: '#9E9E9E', fontSize: 11 }}>↔ Arraste para mudar a data</span>}
          </div>

          <div className="cal-tab-grid">
            {DAY_NAMES.map(d => (
              <div key={d} className="cal-tab-day-header">{d}</div>
            ))}

            {calendarDays.map((day, idx) => {
              if (day.isOther) {
                return <div key={idx} className="cal-tab-day other-month">{day.num}</div>;
              }

              const dateStr  = `${CURRENT_YEAR}-${String(currentMonth + 1).padStart(2,'0')}-${String(day.num).padStart(2,'0')}`;
              const isToday  = dateStr === TODAY_STR;
              const isPast   = dateStr < TODAY_STR;
              const dayPosts  = postsThisMonth.filter(p => p.date === dateStr);
              const dayEvents = gcalThisMonth.filter(ev => ev.start && isSameDay(ev.start, day.date));

              const cls = [
                'cal-tab-day',
                isToday ? 'today' : '',
                isPast  ? 'past'  : '',
                (dayPosts.length || dayEvents.length) ? 'has-items' : '',
                !isPast ? 'clickable' : '',
              ].join(' ').trim();

              return (
                <DroppableTabDay
                  key={idx}
                  dateStr={dateStr}
                  disabled={isPast}
                  className={cls}
                  onClick={() => !isPast && onNewPost && onNewPost(dateStr)}
                >
                  <div className="cal-tab-day-num">
                    {day.num}
                    {isToday && <span className="today-badge">Hoje</span>}
                  </div>

                  {dayPosts.map((post) => (
                    <DraggableTabPost
                      key={post.id}
                      post={post}
                      onPostClick={onPostClick}
                      isDragDisabled={isDragDisabled}
                    />
                  ))}

                  {dayEvents.map((ev, ei) => (
                    <a
                      key={ei}
                      href={ev.htmlLink || newEventUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cal-tab-item cal-tab-item-gcal"
                      style={{ borderLeftColor: GCAL_COLORS[ev.colorId] ?? '#039BE5' }}
                      title={`${ev.title} · ${formatEventTime(ev)}`}
                      onClick={e => e.stopPropagation()}
                    >
                      {!ev.isAllDay && (
                        <span className="cal-tab-item-time">
                          {ev.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {ev.title}
                    </a>
                  ))}
                </DroppableTabDay>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Vista Lista ── */}
      {view === 'list' && (
        <div className="cal-tab-list">
          {loading && <div className="meetings-empty">Carregando…</div>}
          {!loading && upcomingEvents.length === 0 && <div className="meetings-empty">Nenhum evento próximo.</div>}
          {!loading && upcomingEvents.map((ev, i) => {
            const color = GCAL_COLORS[ev.colorId] ?? '#039BE5';
            return (
              <a key={ev.id ?? i} href={ev.htmlLink || newEventUrl()} target="_blank" rel="noopener noreferrer" className="cal-tab-list-item">
                <div className="cal-tab-list-date">
                  <span className="cal-tab-list-day">{ev.start?.toLocaleDateString('pt-BR', { day: '2-digit' })}</span>
                  <span className="cal-tab-list-month">{ev.start?.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                  <span className="cal-tab-list-weekday">{ev.start?.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                </div>
                <div className="cal-tab-list-bar" style={{ background: color }} />
                <div className="cal-tab-list-info">
                  <span className="cal-tab-list-title">{ev.title}</span>
                  <span className="cal-tab-list-time">{formatEventTime(ev)}</span>
                  {ev.location && <span className="cal-tab-list-location">📍 {ev.location}</span>}
                </div>
                <span className="cal-tab-list-arrow">›</span>
              </a>
            );
          })}
        </div>
      )}
    </div>

    {/* Overlay flutuante durante o drag */}
    <DragOverlay dropAnimation={null}>
      {activePost ? (
        <div className="cal-tab-item cal-tab-item-post cal-drag-overlay">
          {activePost.title}
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  );
}
