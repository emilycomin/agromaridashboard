import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PILLAR_COLORS } from '../constants';

const TABLE_FILTERS = ['all', 'Reel', 'Carrossel', 'Post', 'Educação', 'Antes/Depois', 'Humanização'];

function reviewRowClass(post) {
  if (post.clienteReview === 'aprovado')                                    return 'row-aprovado';
  if (post.clienteReview === 'rejeitado')                                   return 'row-rejeitado';
  if (post.clienteReview === 'ajustes' && post.clienteNotification)         return 'row-ajustes';
  return '';
}

const STATUS_CLS_MAP = {
  'Planejado':           'status-planejado',
  'Em Produção':         'status-producao',
  'Agendado':            'status-agendado',
  'Publicado':           'status-publicado',
  'Aguardando Aprovação':'status-aguardando',
  'Aprovado':            'status-aprovado-tag',
  'Alterações':          'status-alteracoes',
  'Rejeitado':           'status-rejeitado-tag',
};
function statusCls(post) { return STATUS_CLS_MAP[post.status] ?? ''; }

// ── Sortable row ─────────────────────────────────────────────────────────────
function SortableRow({ post, readOnly, selectedIds, toggleOne, requestDelete, onPostClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.5 : undefined,
    background: isDragging ? 'var(--drag-row-bg, #f0eef8)' : undefined,
    zIndex:     isDragging ? 1 : undefined,
    position:   'relative',
  };

  const d        = new Date(post.date + 'T12:00:00');
  const rowClass = reviewRowClass(post);
  const hasFiles = (post.attachments ?? []).length > 0;

  return (
    <tr ref={setNodeRef} style={style} className={rowClass}>
      {!readOnly && (
        <td className="drag-handle-cell">
          <span
            ref={setActivatorNodeRef}
            {...listeners}
            {...attributes}
            className="drag-handle"
            title="Arrastar para reordenar"
          >
            ⠿
          </span>
        </td>
      )}
      {!readOnly && (
        <td>
          <input
            type="checkbox"
            className="table-checkbox"
            checked={selectedIds.has(post.id)}
            onChange={() => toggleOne(post.id)}
          />
        </td>
      )}
      <td>
        <strong>
          {d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        </strong>
      </td>
      <td className="post-title-cell" onClick={() => onPostClick(post)}>
        {post.clienteNotification && (
          <span className="notif-dot" style={{ marginRight: '6px', verticalAlign: 'middle' }} title="Notificação do cliente" />
        )}
        {post.title}
      </td>
      <td>
        {hasFiles && (
          <span
            className="attach-badge"
            title={`${post.attachments.length} anexo${post.attachments.length > 1 ? 's' : ''}`}
          >
            📎 {post.attachments.length}
          </span>
        )}
      </td>
      <td><span className="format-tag">{post.format}</span></td>
      <td>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {(post.tags ?? []).map((tag) => {
            const pc = PILLAR_COLORS[tag] || PILLAR_COLORS['Especial'];
            return (
              <span key={tag} className={`post-pill ${pc.cls}`}>{tag}</span>
            );
          })}
          {(post.tags ?? []).length === 0 && (
            <span style={{ color: '#9E9E9E', fontSize: '12px', fontStyle: 'italic' }}>—</span>
          )}
        </div>
      </td>
      <td><span className={`status-tag ${statusCls(post)}`}>{post.status}</span></td>
      {!readOnly && (
        <td>
          <button
            className="icon-btn"
            title="Excluir post"
            onClick={() => requestDelete(post)}
          >
            🗑
          </button>
        </td>
      )}
    </tr>
  );
}

// ── PostsTable ───────────────────────────────────────────────────────────────
export default function PostsTable({ posts, tableFilter, onFilterChange, onSort, onReorder, onPostClick, onDeletePost, onAddPost, onBulkSendApproval, readOnly = false }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmPost, setConfirmPost] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Checkbox helpers ────────────────────────────────────────────────────────
  const allChecked  = posts.length > 0 && posts.every((p) => selectedIds.has(p.id));
  const someChecked = posts.some((p) => selectedIds.has(p.id));

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(posts.map((p) => p.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkSendApproval = () => {
    const ids = [...selectedIds];
    onBulkSendApproval(ids);
    clearSelection();
  };

  // ── Delete with confirmation ─────────────────────────────────────────────────
  const requestDelete = (post) => setConfirmPost(post);
  const confirmDelete = () => {
    if (confirmPost) {
      onDeletePost(confirmPost);
      setConfirmPost(null);
    }
  };

  // ── Drag end ─────────────────────────────────────────────────────────────────
  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) {
      onReorder?.(active.id, over.id);
    }
  };

  return (
    <>
      <div className="card grid-full">
        <div className="card-header">
          <h2>📋 Lista de Posts Planejados</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className="badge">{posts.length} posts</span>
            {!readOnly && (
              <button className="btn-add-post" onClick={onAddPost}>+ Novo Post</button>
            )}
          </div>
        </div>
        <div className="card-body">

          {/* ── Bulk action bar ── */}
          {!readOnly && someChecked && (
            <div className="bulk-action-bar">
              <span className="bulk-count">{selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}</span>
              <button className="bulk-send-btn" onClick={handleBulkSendApproval}>
                📤 Enviar para aprovação
              </button>
              <button className="bulk-clear-btn" onClick={clearSelection}>✕ Limpar seleção</button>
            </div>
          )}

          <div className="filter-tabs">
            {TABLE_FILTERS.map((filter) => (
              <button
                key={filter}
                className={`tab-btn ${tableFilter === filter ? 'active' : ''}`}
                onClick={() => onFilterChange(filter)}
              >
                {filter === 'all' ? 'Todos' : filter}
              </button>
            ))}
          </div>

          <div className="table-wrap">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={posts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <table className="posts-table">
                  <thead>
                    <tr>
                      {!readOnly && <th className="drag-handle-cell" style={{ width: '32px' }} />}
                      {!readOnly && (
                        <th style={{ width: '36px' }}>
                          <input
                            type="checkbox"
                            className="table-checkbox"
                            checked={allChecked}
                            ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                            onChange={toggleAll}
                            title="Selecionar todos"
                          />
                        </th>
                      )}
                      <th onClick={() => onSort('date')}>Data ↕</th>
                      <th onClick={() => onSort('title')}>Título / Ideia ↕</th>
                      <th style={{ width: '60px' }}>Anexos</th>
                      <th onClick={() => onSort('format')}>Formato ↕</th>
                      <th onClick={() => onSort('tags')}>Etiquetas ↕</th>
                      <th onClick={() => onSort('status')}>Status ↕</th>
                      {!readOnly && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <SortableRow
                        key={post.id}
                        post={post}
                        readOnly={readOnly}
                        selectedIds={selectedIds}
                        toggleOne={toggleOne}
                        requestDelete={requestDelete}
                        onPostClick={onPostClick}
                      />
                    ))}
                    {posts.length === 0 && (
                      <tr>
                        <td colSpan={readOnly ? 6 : 10} style={{ textAlign: 'center', padding: '24px', color: '#9E9E9E', fontStyle: 'italic' }}>
                          Nenhum post encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>

      {/* ── Delete confirmation dialog ── */}
      {confirmPost && (
        <div className="confirm-overlay" onClick={() => setConfirmPost(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <h3 className="confirm-title">Excluir post?</h3>
            <p className="confirm-msg">
              Tem certeza que deseja excluir <strong>"{confirmPost.title}"</strong>?<br />
              Essa ação não poderá ser desfeita.
            </p>
            <div className="confirm-actions">
              <button className="confirm-btn-cancel" onClick={() => setConfirmPost(null)}>Cancelar</button>
              <button className="confirm-btn-delete" onClick={confirmDelete}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
