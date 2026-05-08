import { useState } from 'react';
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { MONTH_NAMES, DAY_NAMES, TODAY_STR, PILLAR_COLORS } from '../constants';

// ── Draggable post pill ───────────────────────────────────────────────────────
function DraggablePost({ post, onPostClick, isDragDisabled }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: post.id,
    disabled: isDragDisabled,
    data: { post },
  });

  const pc = PILLAR_COLORS[post.tags?.[0]] || PILLAR_COLORS['Especial'];

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`post-pill ${pc.cls} cal-draggable-pill`}
      style={{ opacity: isDragging ? 0.3 : 1, position: 'relative', touchAction: 'none' }}
      title={post.title}
      onClick={(e) => { e.stopPropagation(); if (!isDragging) onPostClick(post); }}
    >
      <span className="cal-pill-text">{post.title}</span>
      {post.clienteReview === 'aprovado'  && <CheckCircleOutlined       className="cal-pill-review-icon cal-review-aprovado"  title="Aprovado" />}
      {post.clienteReview === 'ajustes'   && <ExclamationCircleOutlined className="cal-pill-review-icon cal-review-ajustes"   title="Ajustes solicitados" />}
      {post.clienteReview === 'rejeitado' && <CloseCircleOutlined       className="cal-pill-review-icon cal-review-rejeitado" title="Rejeitado" />}
      {post.clienteNotification && (
        <span className="notif-dot" style={{ position: 'absolute', top: '-3px', right: '-3px', width: '8px', height: '8px', border: '1.5px solid #fff' }} title="Notificação do cliente" />
      )}
    </div>
  );
}

// ── Droppable day cell ────────────────────────────────────────────────────────
function DroppableDay({ dateStr, disabled, children, className, onClick, title }) {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr ?? '__disabled__', disabled });

  return (
    <div
      ref={setNodeRef}
      className={`${className}${isOver && !disabled ? ' cal-drop-over' : ''}`}
      onClick={onClick}
      title={title}
      style={isOver && !disabled ? { outline: '2px dashed #6C63FF', outlineOffset: '-2px' } : undefined}
    >
      {children}
    </div>
  );
}

// ── CalendarCard ──────────────────────────────────────────────────────────────
export default function CalendarCard({ currentMonth, calendarDays, onMonthChange, onPostClick, onNewPost, onMovePost }) {
  const [activePost, setActivePost] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragStart = ({ active }) => {
    setActivePost(active.data.current?.post ?? null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActivePost(null);
    if (!over || !onMovePost) return;
    const newDate = over.id;
    if (!newDate || newDate === '__disabled__') return;
    const post = calendarDays.flatMap((d) => d.posts).find((p) => p.id === active.id);
    if (!post || post.date === newDate) return;
    onMovePost(active.id, newDate);
  };

  const isDragDisabled = !onMovePost;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
            <span className="cal-legend-item">
              <span className="cal-legend-dot" style={{ background: '#E8F5E9', border: '2px solid #2D7D3A' }} />
              Hoje
            </span>
            <span className="cal-legend-item">
              <span className="cal-legend-dot" style={{ background: '#F0F0F0', border: '1px solid #E0E0E0' }} />
              Passado
            </span>
            <span className="cal-legend-item">
              <CheckCircleOutlined className="cal-legend-review-icon cal-review-aprovado" />
              Aprovado
            </span>
            <span className="cal-legend-item">
              <ExclamationCircleOutlined className="cal-legend-review-icon cal-review-ajustes" />
              Ajustes
            </span>
            <span className="cal-legend-item">
              <CloseCircleOutlined className="cal-legend-review-icon cal-review-rejeitado" />
              Rejeitado
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
              const isToday       = day.dateStr === TODAY_STR;
              const isPast        = !day.isOtherMonth && day.dateStr && day.dateStr < TODAY_STR;
              const isClickable   = !day.isOtherMonth && day.dateStr;
              const canCreatePost = isClickable && !!onNewPost;
              const droppable     = !day.isOtherMonth && !!day.dateStr;

              const cls = [
                'cal-day',
                day.isOtherMonth ? 'other-month'      : '',
                isToday          ? 'today'             : '',
                isPast           ? 'past'              : '',
                day.posts.length ? 'has-post'          : '',
                canCreatePost    ? 'cal-day-clickable' : '',
              ].join(' ').trim();

              return (
                <DroppableDay
                  key={idx}
                  dateStr={day.dateStr}
                  disabled={!droppable}
                  className={cls}
                  onClick={() => canCreatePost && onNewPost(day.dateStr)}
                  title={canCreatePost ? `Novo post em ${day.num}` : undefined}
                >
                  <div className="day-num">
                    {day.num}
                    {isToday && <span className="today-badge">Hoje</span>}
                  </div>

                  {day.posts.map((post) => (
                    <DraggablePost
                      key={post.id}
                      post={post}
                      onPostClick={onPostClick}
                      isDragDisabled={isDragDisabled}
                    />
                  ))}
                </DroppableDay>
              );
            })}
          </div>
        </div>
      </div>

      {/* Overlay flutuante durante o drag */}
      <DragOverlay dropAnimation={null}>
        {activePost ? (
          <div
            className={`post-pill ${PILLAR_COLORS[activePost.tags?.[0]]?.cls ?? PILLAR_COLORS['Especial'].cls} cal-drag-overlay`}
          >
            <span className="cal-pill-text">{activePost.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
