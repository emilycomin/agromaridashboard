import { useState, useRef } from 'react';
import { PILLAR_COLORS } from '../constants';
import { uploadAttachment, deleteAttachment } from '../services/storage';

// Mapa de classes de cor para pills de formato e status
const FORMAT_CLS = {
  'Reel':     'fmt-reel',
  'Carrossel':'fmt-carrossel',
  'Post':     'fmt-post',
  'Stories':  'fmt-stories',
};
const STATUS_CLS = {
  'Planejado':   'status-planejado',
  'Em Produção': 'status-producao',
  'Pronto':      'status-pronto',
  'Publicado':   'status-publicado',
};

// ─── ManageGroup ─────────────────────────────────────────────────────────────
// Inline sub-component para gerenciar uma lista de opções (renomear, excluir, adicionar)
function ManageGroup({ items, onAdd, onDelete, onRename, colorMap }) {
  const [newName, setNewName] = useState('');
  const [renamingIndex, setRenamingIndex] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = (idx) => {
    setRenamingIndex(idx);
    setRenameValue(items[idx]);
  };

  const commitRename = (idx) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== items[idx]) {
      onRename(items[idx], trimmed);
    }
    setRenamingIndex(null);
  };

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed);
      setNewName('');
    }
  };

  return (
    <div className="group-manager">
      {items.map((item, idx) => {
        const pc = colorMap?.[item];
        return (
          <div key={item} className="manager-row">
            {renamingIndex === idx ? (
              <input
                className="manager-rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => commitRename(idx)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitRename(idx); if (e.key === 'Escape') setRenamingIndex(null); }}
                autoFocus
              />
            ) : (
              <span
                className={`manager-item-label ${pc ? pc.cls : ''}`}
                onClick={() => startRename(idx)}
                title="Clique para renomear"
              >
                {item}
              </span>
            )}
            <button className="manager-delete" onClick={() => onDelete(item)} title="Excluir">×</button>
          </div>
        );
      })}
      <div className="manager-add-row">
        <input
          className="manager-add-input"
          placeholder="Nova opção..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
        />
        <button className="manager-add-btn" onClick={handleAdd}>+ Adicionar</button>
      </div>
    </div>
  );
}

// ─── PostModal ────────────────────────────────────────────────────────────────
export default function PostModal({
  post, onSave, onDelete, onClose,
  availableTags, onAddTag, onDeleteTag, onRenameTag,
  availableFormats, onAddFormat, onDeleteFormat, onRenameFormat,
  availableStatuses, onAddStatus, onDeleteStatus, onRenameStatus,
}) {
  const isNew = post?.id === null;

  const [form, setForm] = useState(() => post ?? {});
  const formRef = useRef(form);

  const [notesEditing, setNotesEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState(post?.notes ?? '');

  const [managingTags, setManagingTags] = useState(false);
  const [managingFormats, setManagingFormats] = useState(false);
  const [managingStatuses, setManagingStatuses] = useState(false);

  const [showHistory, setShowHistory] = useState(false);

  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  if (!post) return null;

  // ─── FORMATAÇÃO DE DATA/HORA ────────────────────────────────────────────────
  const fmtTimestamp = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  // ─── HELPER DE SAVE ────────────────────────────────────────────────────────
  const saveFields = (updates) => {
    const newForm = { ...formRef.current, ...updates };
    formRef.current = newForm;
    setForm(newForm);
    if (newForm.id) onSave(newForm);
  };

  const saveField = (key, value) => saveFields({ [key]: value });

  // ─── TÍTULO ───────────────────────────────────────────────────────────────
  const handleTitleChange = (e) => {
    const val = e.target.value;
    formRef.current = { ...formRef.current, title: val };
    setForm((prev) => ({ ...prev, title: val }));
  };

  const handleTitleBlur = () => {
    const title = formRef.current.title ?? '';
    if (title.trim()) {
      if (errors.title) setErrors((prev) => { const e = { ...prev }; delete e.title; return e; });
      if (formRef.current.id) onSave(formRef.current);
    } else if (!isNew) {
      setErrors((prev) => ({ ...prev, title: true }));
    }
  };

  // ─── ETIQUETAS (toggle múltiplo) ──────────────────────────────────────────
  const toggleTag = (tag) => {
    const current = formRef.current.tags ?? [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    saveField('tags', next);
  };

  // ─── APROVADO ─────────────────────────────────────────────────────────────
  const toggleApproved = () => saveField('approved', !formRef.current.approved);

  // ─── NOTAS (textarea com save no blur) ────────────────────────────────────
  const openNotes = () => {
    setNotesDraft(formRef.current.notes ?? '');
    setNotesEditing(true);
  };

  const handleNotesBlur = () => {
    saveFields({ notes: notesDraft });
    setNotesEditing(false);
  };

  // ─── ANEXOS + FIREBASE STORAGE ───────────────────────────────────────────
  const handleFileAdd = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = '';

    for (const file of files) {
      const attachId    = Date.now() + Math.random();
      const storagePath = `attachments/${attachId}`;

      // 1. Exibe imediatamente com blob URL (preview instantâneo)
      const tempAtt = {
        id: attachId,
        name: file.name,
        url: URL.createObjectURL(file),
        storagePath,
        uploading: true,
        error: false,
      };
      saveField('attachments', [...(formRef.current.attachments ?? []), tempAtt]);

      // 2. Faz upload para o Firebase Storage em segundo plano
      try {
        const permanentUrl = await uploadAttachment(storagePath, file);
        // Substitui o blob URL pelo URL permanente
        const updated = (formRef.current.attachments ?? []).map((a) =>
          a.id === attachId ? { ...a, url: permanentUrl, uploading: false } : a
        );
        saveField('attachments', updated);
      } catch (err) {
        console.error('Erro no upload da imagem:', err);
        const updated = (formRef.current.attachments ?? []).map((a) =>
          a.id === attachId ? { ...a, uploading: false, error: true } : a
        );
        saveField('attachments', updated);
      }
    }
  };

  const removeAttachment = (id) => {
    const att = (formRef.current.attachments ?? []).find((a) => a.id === id);
    // Remove do Firebase Storage (não bloqueia a UI)
    if (att?.storagePath && !att.uploading) {
      deleteAttachment(att.storagePath).catch(console.error);
    }
    const newAttachments = formRef.current.attachments.filter((a) => a.id !== id);
    saveFields({
      attachments: newAttachments,
      coverId: formRef.current.coverId === id ? null : formRef.current.coverId,
    });
  };

  // ─── CAPA ─────────────────────────────────────────────────────────────────
  const toggleCover = (attachId) => {
    saveField('coverId', formRef.current.coverId === attachId ? null : attachId);
  };

  // ─── CRIAR POST (somente para posts novos) ────────────────────────────────
  const handleCreate = () => {
    const f = formRef.current;
    const newErrors = {};
    if (!f.title?.trim()) newErrors.title  = true;
    if (!f.date)          newErrors.date   = true;
    if (!f.format)        newErrors.format = true;
    if (!f.status)        newErrors.status = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    onSave(f);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const coverAttachment = (form.attachments ?? []).find((a) => a.id === form.coverId);
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="popup-overlay visible" onClick={handleOverlayClick}>
      <div className="popup popup-large">

        {/* ── CABEÇALHO ── */}
        <div className="popup-header">
          <input
            className={`popup-title-input ${errors.title ? 'input-error' : ''}`}
            value={form.title ?? ''}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            placeholder="Título do post *"
            autoFocus={isNew}
          />
          <button className="popup-close" onClick={onClose} title="Fechar">×</button>
        </div>

        {/* ── IMAGEM DE CAPA (se definida) ── */}
        {coverAttachment && (
          <div className="popup-cover-wrap">
            <img src={coverAttachment.url} alt="Capa" className="popup-cover-img" />
            <button className="cover-remove-btn" onClick={() => saveField('coverId', null)}>
              × Remover capa
            </button>
          </div>
        )}

        {/* ── CONTEÚDO ── */}
        <div className="popup-content">

          {/* Data + Aprovado */}
          <div className="popup-section">
            <div className="field-label">
              Data {errors.date && <span className="error-inline">⚠ obrigatório</span>}
            </div>
            <div className="date-approved-row">
              <input
                type="date"
                className={`form-input date-input ${errors.date ? 'input-error' : ''}`}
                value={form.date ?? ''}
                onChange={(e) => {
                  saveField('date', e.target.value);
                  if (errors.date) setErrors((prev) => { const e = { ...prev }; delete e.date; return e; });
                }}
              />
              <button
                className={`btn-approved ${form.approved ? 'btn-approved-active' : ''}`}
                onClick={toggleApproved}
                title={form.approved ? 'Clique para desaprovar' : 'Clique para aprovar'}
              >
                {form.approved ? '✓ Aprovado' : 'Aprovar'}
              </button>
            </div>
          </div>

          {/* Formato — pills */}
          <div className="popup-section">
            <div className="popup-section-label">
              Formato {errors.format && <span className="error-inline">⚠ obrigatório</span>}
              <button className="manage-btn" onClick={() => setManagingFormats((v) => !v)}>
                {managingFormats ? 'Fechar' : '⚙ Gerenciar'}
              </button>
            </div>
            {managingFormats ? (
              <ManageGroup
                items={availableFormats}
                onAdd={onAddFormat}
                onDelete={onDeleteFormat}
                onRename={onRenameFormat}
              />
            ) : (
              <div className={`pill-selector ${errors.format && !form.format ? 'pill-group-error' : ''}`}>
                {availableFormats.map((f) => {
                  const isSelected = form.format === f;
                  return (
                    <button
                      key={f}
                      className={`modal-pill ${FORMAT_CLS[f] ?? 'fmt-post'} ${isSelected ? 'pill-selected' : 'pill-unselected'}`}
                      onClick={() => {
                        saveField('format', f);
                        if (errors.format) setErrors((prev) => { const e = { ...prev }; delete e.format; return e; });
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status — pills */}
          <div className="popup-section">
            <div className="popup-section-label">
              Status {errors.status && <span className="error-inline">⚠ obrigatório</span>}
              <button className="manage-btn" onClick={() => setManagingStatuses((v) => !v)}>
                {managingStatuses ? 'Fechar' : '⚙ Gerenciar'}
              </button>
            </div>
            {managingStatuses ? (
              <ManageGroup
                items={availableStatuses}
                onAdd={onAddStatus}
                onDelete={onDeleteStatus}
                onRename={onRenameStatus}
              />
            ) : (
              <div className={`pill-selector ${errors.status && !form.status ? 'pill-group-error' : ''}`}>
                {availableStatuses.map((s) => {
                  const isSelected = form.status === s;
                  return (
                    <button
                      key={s}
                      className={`modal-pill ${STATUS_CLS[s] ?? 'status-planejado'} ${isSelected ? 'pill-selected' : 'pill-unselected'}`}
                      onClick={() => {
                        saveField('status', s);
                        if (errors.status) setErrors((prev) => { const e = { ...prev }; delete e.status; return e; });
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Etiquetas */}
          <div className="popup-section">
            <div className="popup-section-label">
              Etiquetas
              <button className="manage-btn" onClick={() => setManagingTags((v) => !v)}>
                {managingTags ? 'Fechar' : '⚙ Gerenciar'}
              </button>
            </div>
            {managingTags ? (
              <ManageGroup
                items={availableTags}
                onAdd={onAddTag}
                onDelete={onDeleteTag}
                onRename={onRenameTag}
                colorMap={PILLAR_COLORS}
              />
            ) : (
              <div className="pill-selector">
                {availableTags.map((tag) => {
                  const pColor = PILLAR_COLORS[tag] ?? { cls: 'pill-especial' };
                  const isSelected = (form.tags ?? []).includes(tag);
                  return (
                    <button
                      key={tag}
                      className={`post-pill modal-pill ${pColor.cls} ${isSelected ? 'pill-selected' : 'pill-unselected'}`}
                      onClick={() => toggleTag(tag)}
                      title={isSelected ? `Remover "${tag}"` : `Adicionar "${tag}"`}
                    >
                      {isSelected && '✓ '}{tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Descrição — único campo com toggle edit/save */}
          <div className="popup-section">
            <div className="popup-section-label">
              Descrição / Notas
              {!notesEditing && (
                <button className="notes-edit-btn" onClick={openNotes}>✏️ Editar</button>
              )}
            </div>
            {notesEditing ? (
              <textarea
                className="form-textarea notes-textarea"
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Descreva o conteúdo, roteiro, referências..."
                rows={4}
                autoFocus
              />
            ) : (
              <div className="popup-body notes-view">
                {form.notes
                  ? form.notes
                  : <em style={{ color: '#9E9E9E' }}>Sem descrição. Clique em ✏️ Editar para adicionar.</em>
                }
              </div>
            )}
          </div>

          {/* Anexos + Capa */}
          <div className="popup-section">
            <div className="popup-section-label">
              Anexos
              <button className="attach-btn" onClick={() => fileInputRef.current.click()}>
                + Adicionar imagem
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileAdd}
              />
            </div>

            {(form.attachments ?? []).length > 0 ? (
              <>
                <p className="popup-empty" style={{ marginBottom: '8px' }}>
                  Clique em uma imagem para definí-la como capa do modal.
                </p>
                <div className="attachment-grid">
                  {form.attachments.map((att) => {
                    const isCover = form.coverId === att.id;
                    return (
                      <div key={att.id} className={`attachment-thumb ${isCover ? 'attachment-is-cover' : ''} ${att.uploading ? 'attachment-uploading' : ''} ${att.error ? 'attachment-error' : ''}`}>
                        <img
                          src={att.url}
                          alt={att.name}
                          onClick={() => !att.uploading && toggleCover(att.id)}
                          title={
                            att.uploading ? 'Enviando imagem…'
                            : att.error    ? 'Falha no envio'
                            : isCover      ? 'Clique para remover como capa'
                            :                'Clique para definir como capa'
                          }
                          style={{ opacity: att.uploading ? 0.5 : 1 }}
                        />
                        {/* Indicador de status sobre a imagem */}
                        {att.uploading && (
                          <div className="att-status-overlay">
                            <span className="att-spinner" /> Enviando…
                          </div>
                        )}
                        {att.error && (
                          <div className="att-status-overlay att-error-overlay">
                            ⚠ Falha
                          </div>
                        )}
                        {isCover && !att.uploading && <div className="cover-badge">🖼 Capa</div>}
                        <button
                          className="attachment-remove"
                          onClick={() => removeAttachment(att.id)}
                          disabled={att.uploading}
                        >×</button>
                        <div className="attachment-name">{att.name}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="popup-empty">
                Nenhum anexo adicionado. Após adicionar imagens, clique para definir a capa.
              </p>
            )}
          </div>
        </div>

        {/* ── HISTÓRICO DE ALTERAÇÕES (colapsável) ── */}
        {showHistory && (
          <div className="history-panel">
            <div className="history-panel-header">
              📋 Histórico de Alterações
              <span className="history-count">{(form.history ?? []).length} registro(s)</span>
            </div>
            {(form.history ?? []).length === 0 ? (
              <p className="history-empty">Nenhuma alteração registrada ainda.</p>
            ) : (
              <div className="history-list">
                {[...(form.history ?? [])].reverse().map((entry) => (
                  <div key={entry.id} className="history-entry">
                    <div className="history-entry-time">
                      🕐 {fmtTimestamp(entry.timestamp)}
                    </div>
                    <ul className="history-changes">
                      {entry.changes.map((change, i) => (
                        <li key={i}>{change}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RODAPÉ ── */}
        <div className="popup-footer">
          {/* Excluir — só para posts existentes */}
          {!isNew && (
            <button className="btn-danger" onClick={() => onDelete(post)}>🗑 Excluir</button>
          )}

          {/* Spacer empurra histórico e ações para a direita */}
          <div style={{ flex: 1 }} />

          {/* Histórico — sempre visível */}
          <button
            className={`btn-history ${showHistory ? 'btn-history-active' : ''}`}
            onClick={() => setShowHistory((v) => !v)}
            title="Ver histórico de alterações"
          >
            📋 Histórico{(form.history ?? []).length > 0 && ` (${form.history.length})`}
          </button>

          {/* Criar Post — só para posts novos */}
          {isNew && (
            <>
              {hasErrors && (
                <span className="error-msg" style={{ margin: 0 }}>
                  ⚠ Preencha os campos obrigatórios.
                </span>
              )}
              <button className="btn-primary" onClick={handleCreate}>
                ✓ Criar Post
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
