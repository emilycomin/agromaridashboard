import { useState, useRef } from 'react';
import { PILLAR_COLORS, PILLARS, FORMATS, STATUSES, formatIcon } from '../constants';

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

export default function PostModal({ post, onSave, onDelete, onClose }) {
  const isNew = post?.id === null;

  // formRef garante que callbacks de blur/click sempre acessem o estado mais recente
  const [form, setForm] = useState(() => post ?? {});
  const formRef = useRef(form);

  const [notesEditing, setNotesEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState(post?.notes ?? '');

  // Erros de validação (só usados no modo "Criar Post")
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  if (!post) return null;

  // ─── HELPER DE SAVE ────────────────────────────────────────────────────────
  // Atualiza um ou mais campos e dispara auto-save para posts existentes
  const saveFields = (updates) => {
    const newForm = { ...formRef.current, ...updates };
    formRef.current = newForm;
    setForm(newForm);
    if (newForm.id) onSave(newForm); // auto-save: apenas posts existentes
  };

  const saveField = (key, value) => saveFields({ [key]: value });

  // ─── TÍTULO ───────────────────────────────────────────────────────────────
  // onChange: atualiza estado local sem auto-save (evita salvar a cada tecla)
  // onBlur:   auto-salva quando o usuário sai do campo
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

  // ─── NOTAS (textarea com save no blur) ────────────────────────────────────
  const openNotes = () => {
    setNotesDraft(formRef.current.notes ?? '');
    setNotesEditing(true);
  };

  const handleNotesBlur = () => {
    // notesDraft vem do closure da última renderização (sempre atualizado pelo onChange)
    saveFields({ notes: notesDraft });
    setNotesEditing(false);
  };

  // ─── ANEXOS ───────────────────────────────────────────────────────────────
  const handleFileAdd = (e) => {
    const newAttachments = Array.from(e.target.files).map((file) => ({
      id: Date.now() + Math.random(),
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    saveField('attachments', [...(formRef.current.attachments ?? []), ...newAttachments]);
    e.target.value = '';
  };

  const removeAttachment = (id) => {
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

          {/* Data */}
          <div className="popup-section">
            <div className="field-label">
              Data {errors.date && <span className="error-inline">⚠ obrigatório</span>}
            </div>
            <input
              type="date"
              className={`form-input date-input ${errors.date ? 'input-error' : ''}`}
              value={form.date ?? ''}
              onChange={(e) => {
                saveField('date', e.target.value);
                if (errors.date) setErrors((prev) => { const e = { ...prev }; delete e.date; return e; });
              }}
            />
          </div>

          {/* Formato — pills */}
          <div className="popup-section">
            <div className="popup-section-label">
              Formato {errors.format && <span className="error-inline">⚠ obrigatório</span>}
            </div>
            <div className={`pill-selector ${errors.format && !form.format ? 'pill-group-error' : ''}`}>
              {FORMATS.map((f) => {
                const isSelected = form.format === f;
                return (
                  <button
                    key={f}
                    className={`modal-pill ${FORMAT_CLS[f] ?? ''} ${isSelected ? 'pill-selected' : 'pill-unselected'}`}
                    onClick={() => {
                      saveField('format', f);
                      if (errors.format) setErrors((prev) => { const e = { ...prev }; delete e.format; return e; });
                    }}
                  >
                    {formatIcon(f)} {f}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status — pills */}
          <div className="popup-section">
            <div className="popup-section-label">
              Status {errors.status && <span className="error-inline">⚠ obrigatório</span>}
            </div>
            <div className={`pill-selector ${errors.status && !form.status ? 'pill-group-error' : ''}`}>
              {STATUSES.map((s) => {
                const isSelected = form.status === s;
                return (
                  <button
                    key={s}
                    className={`modal-pill ${STATUS_CLS[s] ?? ''} ${isSelected ? 'pill-selected' : 'pill-unselected'}`}
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
          </div>

          {/* Etiquetas */}
          <div className="popup-section">
            <div className="popup-section-label">Etiquetas</div>
            <div className="pill-selector">
              {PILLARS.map((tag) => {
                const pColor = PILLAR_COLORS[tag];
                const isSelected = (form.tags ?? []).includes(tag);
                return (
                  <button
                    key={tag}
                    className={`post-pill ${pColor.cls} ${isSelected ? 'pill-selected' : 'pill-unselected'}`}
                    onClick={() => toggleTag(tag)}
                    title={isSelected ? `Remover "${tag}"` : `Adicionar "${tag}"`}
                  >
                    {isSelected && '✓ '}{tag}
                  </button>
                );
              })}
            </div>
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
                className="form-textarea"
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
                      <div key={att.id} className={`attachment-thumb ${isCover ? 'attachment-is-cover' : ''}`}>
                        <img
                          src={att.url}
                          alt={att.name}
                          onClick={() => toggleCover(att.id)}
                          title={isCover ? 'Clique para remover como capa' : 'Clique para definir como capa'}
                        />
                        {isCover && <div className="cover-badge">🖼 Capa</div>}
                        <button className="attachment-remove" onClick={() => removeAttachment(att.id)}>×</button>
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

        {/* ── RODAPÉ ── */}
        <div className="popup-footer">
          {!isNew && (
            <button className="btn-danger" onClick={() => onDelete(post)}>🗑 Excluir</button>
          )}
          {isNew && (
            <div className="popup-footer-actions" style={{ width: '100%' }}>
              {hasErrors && (
                <span className="error-msg" style={{ margin: 0 }}>
                  ⚠ Preencha os campos obrigatórios.
                </span>
              )}
              <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={handleCreate}>
                ✓ Criar Post
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
