import { useState, useRef, useEffect } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Link, RichTextEditor } from '@mantine/tiptap';
import { DatePickerInput } from '@mantine/dates';
import { PILLAR_COLORS } from '../constants';
import { uploadAttachment, deleteAttachment } from '../services/storage';
import { getOrCreateClientToken } from '../services/db';
import { useOptions } from '../context/OptionsContext';
import { usePosts } from '../context/PostsContext';
import './PostModal.css';

// YYYY-MM-DD → Date (local noon to avoid timezone shifts)
function strToDate(s) { return s ? new Date(s + 'T12:00:00') : null; }
// Date → YYYY-MM-DD
function dateToStr(d) {
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PostModal({ post, onClose, readOnly = false }) {
  const {
    availableTags, tagColors = {},
    availableFormats,
    availableStatuses,
    addTag, deleteTag,
    addStatus, deleteStatus,
  } = useOptions();

  const {
    handleSavePost: onSave,
    handleDeletePost: onDelete,
    isInApprovalMode = false,
    approvalIdx = 0,
    approvalTotal = 0,
    advanceApprovalQueue: onReviewNext,
    clientMeta = {},
    ownerUid = null,
  } = usePosts();

  const isNew = post?.id === null;

  const [form, setForm]             = useState(() => ({ ...post }));
  const formRef                     = useRef(form);
  const fileInputRef                = useRef(null);
  const [dragOver, setDragOver]     = useState(false);
  const [errors, setErrors]         = useState({});
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [whatsappUrl, setWhatsappUrl] = useState(null);
  const [reviewMode, setReviewMode] = useState(null);
  const [reviewDraft, setReviewDraft] = useState(post?.clienteNotes ?? '');
  const [reviewSent, setReviewSent] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lightbox, setLightbox]       = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');

  // ── TipTap editor for caption ───────────────────────────────────────────────
  const editor = useEditor({
    extensions: [StarterKit, Underline, Link],
    content: post?.notes ?? '',
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      formRef.current = { ...formRef.current, notes: html };
      setForm((p) => ({ ...p, notes: html }));
    },
    onBlur: () => {
      if (formRef.current.id) onSave(formRef.current);
    },
  });

  // Sync review fields from Firestore real-time updates
  useEffect(() => {
    if (!post?.id) return;
    const REVIEW_FIELDS = ['clienteReview', 'clienteNotes', 'clienteNotification', 'enviadoParaAprovacao'];
    const needsSync = REVIEW_FIELDS.some((f) => (formRef.current[f] ?? null) !== (post[f] ?? null));
    if (!needsSync) return;
    const updated = {
      ...formRef.current,
      clienteReview:        post.clienteReview        ?? null,
      clienteNotes:         post.clienteNotes         ?? '',
      clienteNotification:  post.clienteNotification  ?? false,
      enviadoParaAprovacao: post.enviadoParaAprovacao  ?? false,
    };
    formRef.current = updated;
    setForm(updated);
  }, [post?.clienteReview, post?.clienteNotes, post?.clienteNotification, post?.enviadoParaAprovacao]); // eslint-disable-line

  if (!post) return null;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const saveFields = (updates) => {
    const newForm = { ...formRef.current, ...updates };
    formRef.current = newForm;
    setForm(newForm);
    if (newForm.id) onSave(newForm);
  };
  const saveField = (key, value) => saveFields({ [key]: value });

  const toggleTag = (tag) => {
    const current = formRef.current.tags ?? [];
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
    saveField('tags', next);
  };

  const processFiles = async (files) => {
    for (const file of files) {
      const attachId    = Date.now() + Math.random();
      const storagePath = `attachments/${attachId}`;
      const tempAtt = { id: attachId, name: file.name, url: URL.createObjectURL(file), storagePath, uploading: true, error: false };
      saveField('attachments', [...(formRef.current.attachments ?? []), tempAtt]);
      try {
        const permanentUrl = await uploadAttachment(storagePath, file);
        const updated = (formRef.current.attachments ?? []).map((a) =>
          a.id === attachId ? { ...a, url: permanentUrl, uploading: false } : a
        );
        saveField('attachments', updated);
      } catch {
        const updated = (formRef.current.attachments ?? []).map((a) =>
          a.id === attachId ? { ...a, uploading: false, error: true } : a
        );
        saveField('attachments', updated);
      }
    }
  };

  const handleFileAdd  = (e) => { processFiles(Array.from(e.target.files)); e.target.value = ''; };
  const handleFileDrop = (e) => { if (readOnly) return; processFiles(Array.from(e.dataTransfer.files)); };

  const removeAttachment = (id) => {
    const att = (formRef.current.attachments ?? []).find((a) => a.id === id);
    if (att?.storagePath && !att.uploading) deleteAttachment(att.storagePath).catch(console.error);
    const newAtts = formRef.current.attachments.filter((a) => a.id !== id);
    saveFields({ attachments: newAtts, coverId: formRef.current.coverId === id ? null : formRef.current.coverId });
  };

  const goPrev = () => setCarouselIdx((i) => (i - 1 + attachments.length) % attachments.length);
  const goNext = () => setCarouselIdx((i) => (i + 1) % attachments.length);

  const triggerSaveSuccess = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSaveDraft = () => {
    const f = formRef.current;
    if (!f.title?.trim()) { setErrors({ title: true }); return; }
    setErrors({});
    onSave(f);
    triggerSaveSuccess();
    if (isNew) onClose();
  };

  const handleSchedule = () => {
    const f = formRef.current;
    const newErrors = {};
    if (!f.title?.trim()) newErrors.title = true;
    if (!f.date)          newErrors.date  = true;
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    onSave({ ...f, status: 'Agendado' });
    triggerSaveSuccess();
    if (isNew) onClose();
  };

  // ── Review (client) ──────────────────────────────────────────────────────────
  const REVIEW_STATUS = { aprovado: 'Aprovado', ajustes: 'Alterações', rejeitado: 'Rejeitado' };
  const sendReview = (type, notes = '') => {
    const updated = { ...formRef.current, clienteReview: type, clienteNotes: notes, clienteNotification: true, status: REVIEW_STATUS[type] ?? formRef.current.status };
    formRef.current = updated;
    setForm(updated);
    onSave(updated);
    setReviewMode(null);
    setReviewSent(true);
    if (isInApprovalMode && onReviewNext) setTimeout(() => onReviewNext(), 600);
  };

  const handleMarkRead = () => {
    if (formRef.current.clienteReview === 'ajustes') {
      saveFields({ clienteNotification: false, clienteReview: null, clienteNotes: '', enviadoParaAprovacao: false, status: 'Em Produção' });
    } else {
      saveFields({ clienteNotification: false });
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const attachments    = form.attachments ?? [];
  const hasAttachments = attachments.length > 0;
  const safeIdx        = hasAttachments ? Math.min(carouselIdx, attachments.length - 1) : 0;
  const activeAtt      = hasAttachments ? attachments[safeIdx] : null;
const captionLen  = editor ? editor.getText().replace(/\n$/, '').length : (form.notes ?? '').replace(/<[^>]*>/g, '').length;
  const headerTitle = form.title?.trim() || (isNew ? 'Novo Post' : 'Post sem título');

  return (
    <div className="pm-backdrop" onClick={onClose}>
      <div className="pm-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="pm-header">
          <div className="pm-title">{headerTitle}</div>
          <button className="pm-close" onClick={onClose}>✕</button>
        </div>

        {/* ── Body ── */}
        <div className="pm-body">

          {/* ── Left: Form ── */}
          <div className="pm-left">

            {/* Notification banner (social media) */}
            {!readOnly && form.clienteNotification && (
              <div className={`pm-review-banner pm-review-banner--${form.clienteReview}`}>
                <div className="pm-review-banner-content">
                  {form.clienteReview === 'aprovado'  && <><span>✅</span><div><strong>Cliente aprovou!</strong></div></>}
                  {form.clienteReview === 'rejeitado' && <><span>❌</span><div><strong>Cliente rejeitou</strong>{form.clienteNotes && <p>"{form.clienteNotes}"</p>}</div></>}
                  {form.clienteReview === 'ajustes'   && <><span>✏️</span><div><strong>Ajustes solicitados</strong>{form.clienteNotes && <p>"{form.clienteNotes}"</p>}</div></>}
                </div>
                <button className="pm-review-read-btn" onClick={handleMarkRead}>✓ Marcar como lido</button>
              </div>
            )}

            {/* Título */}
            <div className="pm-field">
              <label className="pm-label">Título do Post {!readOnly && <span className="pm-req">*</span>}</label>
              <input
                className={`pm-input${errors.title ? ' pm-input--error' : ''}`}
                type="text"
                placeholder="Ex: Lançamento Coleção Verão 2026"
                value={form.title ?? ''}
                readOnly={readOnly}
                autoFocus={isNew && !readOnly}
                onChange={(e) => {
                  const val = e.target.value;
                  formRef.current = { ...formRef.current, title: val };
                  setForm((p) => ({ ...p, title: val }));
                  if (errors.title) setErrors((p) => { const e2 = { ...p }; delete e2.title; return e2; });
                }}
                onBlur={() => { if (formRef.current.id && formRef.current.title?.trim()) onSave(formRef.current); }}
              />
            </div>

            {/* Data + Horário */}
            <div className="pm-row">
              <div className="pm-field" style={{ flex: 2 }}>
                <label className="pm-label">Data de Publicação {!readOnly && <span className="pm-req">*</span>}</label>
                <DatePickerInput
                  classNames={{
                    input: `pm-input pm-datepicker-input${errors.date ? ' pm-input--error' : ''}`,
                    root: 'pm-datepicker-root',
                  }}
                  valueFormat="DD/MM/YYYY"
                  placeholder="Selecionar data"
                  value={strToDate(form.date)}
                  disabled={readOnly}
                  onChange={(date) => {
                    saveField('date', dateToStr(date));
                    if (errors.date) setErrors((p) => { const e2 = { ...p }; delete e2.date; return e2; });
                  }}
                  clearable
                />
              </div>
              <div className="pm-field" style={{ flex: 1 }}>
                <label className="pm-label">Horário</label>
                <input
                  className="pm-input"
                  type="time"
                  value={form.time ?? '09:00'}
                  disabled={readOnly}
                  onChange={(e) => saveField('time', e.target.value)}
                />
              </div>
            </div>

            {/* Formato */}
            {!readOnly && (
              <div className="pm-field">
                <label className="pm-label">Formato</label>
                <div className="pm-pills">
                  {availableFormats.map((fmt) => (
                    <button
                      key={fmt}
                      className={`pm-pill${form.format === fmt ? ' pm-pill--active' : ''}`}
                      onClick={() => saveField('format', form.format === fmt ? '' : fmt)}
                    >
                      {form.format === fmt && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tipo de Conteúdo (tags) */}
            {!readOnly && (
              <div className="pm-field">
                <div className="pm-label-row">
                  <label className="pm-label">Tipo de Conteúdo</label>
                  {!editingTags
                    ? <button className="pm-edit-toggle" onClick={() => setEditingTags(true)} title="Editar etiquetas">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Editar
                      </button>
                    : <button className="pm-edit-toggle pm-edit-toggle--done" onClick={() => { setEditingTags(false); setNewTagName(''); }}>
                        ✓ Concluir
                      </button>
                  }
                </div>
                {editingTags ? (
                  <div className="pm-edit-list">
                    {availableTags.map((tag) => {
                      const tc = tagColors[tag] ?? PILLAR_COLORS[tag] ?? { bg: '#E8F5E9', color: '#2E7D32' };
                      return (
                        <div key={tag} className="pm-edit-item">
                          <span className="pm-edit-item-dot" style={{ background: tc.color }} />
                          <span className="pm-edit-item-name">{tag}</span>
                          <button className="pm-edit-item-del" onClick={() => deleteTag(tag)} title="Remover">✕</button>
                        </div>
                      );
                    })}
                    <div className="pm-edit-add">
                      <input
                        className="pm-edit-add-input"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="Nova etiqueta..."
                        onKeyDown={(e) => { if (e.key === 'Enter' && newTagName.trim()) { addTag(newTagName.trim()); setNewTagName(''); } }}
                      />
                      <button
                        className="pm-edit-add-btn"
                        disabled={!newTagName.trim()}
                        onClick={() => { if (newTagName.trim()) { addTag(newTagName.trim()); setNewTagName(''); } }}
                      >+ Adicionar</button>
                    </div>
                  </div>
                ) : (
                  <div className="pm-pills">
                    {availableTags.map((tag) => {
                      const isChecked = (form.tags ?? []).includes(tag);
                      const tc = tagColors[tag] ?? PILLAR_COLORS[tag] ?? { bg: '#E8F5E9', color: '#2E7D32' };
                      return (
                        <button
                          key={tag}
                          className={`pm-pill${isChecked ? ' pm-pill--tag' : ''}`}
                          style={isChecked ? { background: tc.bg, color: tc.color, borderColor: tc.color } : {}}
                          onClick={() => toggleTag(tag)}
                        >
                          {isChecked && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Status */}
            {!readOnly && (
              <div className="pm-field">
                <div className="pm-label-row">
                  <label className="pm-label">Status</label>
                  {!editingStatus
                    ? <button className="pm-edit-toggle" onClick={() => setEditingStatus(true)} title="Editar status">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Editar
                      </button>
                    : <button className="pm-edit-toggle pm-edit-toggle--done" onClick={() => { setEditingStatus(false); setNewStatusName(''); }}>
                        ✓ Concluir
                      </button>
                  }
                </div>
                {editingStatus ? (
                  <div className="pm-edit-list">
                    {availableStatuses.map((s) => (
                      <div key={s} className="pm-edit-item">
                        <span className="pm-edit-item-dot pm-edit-item-dot--status" />
                        <span className="pm-edit-item-name">{s}</span>
                        <button className="pm-edit-item-del" onClick={() => deleteStatus(s)} title="Remover">✕</button>
                      </div>
                    ))}
                    <div className="pm-edit-add">
                      <input
                        className="pm-edit-add-input"
                        value={newStatusName}
                        onChange={(e) => setNewStatusName(e.target.value)}
                        placeholder="Novo status..."
                        onKeyDown={(e) => { if (e.key === 'Enter' && newStatusName.trim()) { addStatus(newStatusName.trim()); setNewStatusName(''); } }}
                      />
                      <button
                        className="pm-edit-add-btn"
                        disabled={!newStatusName.trim()}
                        onClick={() => { if (newStatusName.trim()) { addStatus(newStatusName.trim()); setNewStatusName(''); } }}
                      >+ Adicionar</button>
                    </div>
                  </div>
                ) : (
                  <div className="pm-radios">
                    {availableStatuses.slice(0, 8).map((s) => (
                      <label key={s} className="pm-radio-label">
                        <input
                          type="radio"
                          name="pm-status"
                          checked={form.status === s}
                          onChange={() => saveField('status', s)}
                        />
                        <span className={`pm-radio-dot${form.status === s ? ' pm-radio-dot--on' : ''}`} />
                        {s}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Aprovação row (social media) */}
            {!readOnly && (
              <div className="pm-approval-row">
                {form.clienteReview === 'aprovado'  && <span className="pm-chip pm-chip--ok">✅ Aprovado</span>}
                {form.clienteReview === 'rejeitado' && <span className="pm-chip pm-chip--err">❌ Rejeitado</span>}
                {form.clienteReview === 'ajustes'   && <span className="pm-chip pm-chip--warn">✏️ Ajustes pedidos</span>}
                {!form.clienteReview && form.enviadoParaAprovacao && <span className="pm-chip pm-chip--wait">⏳ Aguardando</span>}
                {(() => {
                  const needsResend = form.clienteReview === 'ajustes' || form.clienteReview === 'rejeitado';
                  const canSend = (!form.clienteReview && !form.enviadoParaAprovacao) || needsResend;
                  if (!canSend) return null;
                  return (
                    <button className="pm-send-btn" onClick={async () => {
                      saveFields({ enviadoParaAprovacao: true, status: 'Aguardando Aprovação', clienteReview: null, clienteNotes: '', clienteNotification: false });
                      if (clientMeta?.phone) {
                        const token = await getOrCreateClientToken(clientMeta.id, ownerUid);
                        const approvalUrl = `${window.location.origin}/?token=${token}`;
                        const text = `Olá ${clientMeta.name}! Você tem posts aguardando aprovação. Acesse: ${approvalUrl}`;
                        setWhatsappUrl(`https://wa.me/${clientMeta.phone}?text=${encodeURIComponent(text)}`);
                      }
                    }}>
                      {needsResend ? '🔄 Reenviar' : '📤 Enviar para aprovação'}
                    </button>
                  );
                })()}
                {whatsappUrl && (
                  <a className="pm-whatsapp-btn" href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => setWhatsappUrl(null)}>💬 WhatsApp</a>
                )}
              </div>
            )}

            {/* Info chips (client view) */}
            {readOnly && (
              <div className="pm-client-chips">
                {form.date && <span className="pm-client-chip">📅 {new Date(form.date + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                {form.format && <span className="pm-client-chip">{form.format}</span>}
                {form.status && <span className="pm-client-chip">{form.status}</span>}
                {(form.tags ?? []).map((t) => {
                  const tc = tagColors[t] ?? PILLAR_COLORS[t] ?? { bg: '#EEF2FF', color: '#4338CA' };
                  return <span key={t} className="pm-client-chip" style={{ background: tc.bg, color: tc.color }}>{t}</span>;
                })}
              </div>
            )}

            {/* Descrição / Caption com formatação */}
            <div className="pm-field pm-field--grow">
              <label className="pm-label">Descrição / Caption</label>
              <div className="pm-textarea-wrap">
                <RichTextEditor editor={editor} className="pm-rte">
                  {!readOnly && (
                    <RichTextEditor.Toolbar sticky stickyOffset={0} className="pm-rte-toolbar">
                      <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Bold />
                        <RichTextEditor.Italic />
                        <RichTextEditor.Underline />
                        <RichTextEditor.Strikethrough />
                      </RichTextEditor.ControlsGroup>
                      <RichTextEditor.ControlsGroup>
                        <RichTextEditor.BulletList />
                        <RichTextEditor.OrderedList />
                      </RichTextEditor.ControlsGroup>
                      <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Link />
                        <RichTextEditor.Unlink />
                      </RichTextEditor.ControlsGroup>
                      <RichTextEditor.ControlsGroup>
                        <RichTextEditor.ClearFormatting />
                      </RichTextEditor.ControlsGroup>
                    </RichTextEditor.Toolbar>
                  )}
                  <RichTextEditor.Content className="pm-rte-content" />
                </RichTextEditor>
                <span className="pm-char-count">{captionLen}/2200</span>
              </div>
            </div>
          </div>

          {/* ── Right: Media viewer ── */}
          <div className="pm-right">
            <div className="pm-section-title">Fotos e Vídeos</div>

            {!hasAttachments ? (
              <div
                className={`pm-dropzone${dragOver ? ' pm-dropzone--over' : ''}${readOnly ? ' pm-dropzone--readonly' : ''}`}
                onDragOver={(e) => { if (readOnly) return; e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileDrop(e); }}
                onClick={() => !readOnly && fileInputRef.current?.click()}
              >
                <svg className="pm-dropzone-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#C4C9D4" strokeWidth="1.2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <p className="pm-dropzone-text">
                  Arraste arquivos aqui ou{' '}
                  <strong className="pm-dropzone-link" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>clique para selecionar</strong>
                </p>
                <span className="pm-dropzone-hint">PNG, JPG, MP4 até 100MB</span>
              </div>
            ) : (
              <div className="pm-gallery">
                <div className="pm-gallery-main">
                  {/* Clickable media */}
                  {activeAtt && (
                    activeAtt.name?.match(/\.(mp4|mov|webm|avi)$/i)
                      ? <video src={activeAtt.url} className="pm-gallery-video" controls style={{ opacity: activeAtt.uploading ? 0.5 : 1 }} />
                      : <img
                          src={activeAtt.url}
                          alt={activeAtt.name}
                          className="pm-gallery-img"
                          style={{ opacity: activeAtt.uploading ? 0.5 : 1, cursor: 'zoom-in' }}
                          onClick={() => !activeAtt.uploading && setLightbox(true)}
                        />
                  )}

                  {/* Arrows — only when multiple attachments */}
                  {attachments.length > 1 && (
                    <>
                      <button className="pm-gallery-arrow pm-gallery-arrow--prev" onClick={goPrev}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                      </button>
                      <button className="pm-gallery-arrow pm-gallery-arrow--next" onClick={goNext}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                      <div className="pm-gallery-counter">{safeIdx + 1} / {attachments.length}</div>
                    </>
                  )}

                  {activeAtt?.uploading && <div className="pm-gallery-overlay"><div className="pm-spinner" /> Enviando…</div>}
                  {activeAtt?.error   && <div className="pm-gallery-overlay pm-gallery-error">⚠ Falha no envio</div>}
                  {!readOnly && activeAtt && (
                    <button className="pm-gallery-remove" onClick={() => { removeAttachment(activeAtt.id); setCarouselIdx(0); }}>✕</button>
                  )}
                </div>
                {attachments.length > 1 && (
                  <div className="pm-gallery-thumbs">
                    {attachments.map((att, i) => (
                      <button key={att.id} className={`pm-gallery-thumb${i === safeIdx ? ' active' : ''}`} onClick={() => setCarouselIdx(i)}>
                        <img src={att.url} alt={att.name} />
                      </button>
                    ))}
                  </div>
                )}
                {!readOnly && (
                  <button className="pm-gallery-add" onClick={() => fileInputRef.current?.click()}>+ Adicionar</button>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={handleFileAdd} />
          </div>
        </div>

        {/* ── Lightbox ── */}
        {lightbox && activeAtt && (
          <div className="pm-lightbox" onClick={() => setLightbox(false)}>
            <button className="pm-lightbox-close" onClick={() => setLightbox(false)}>✕</button>
            {attachments.length > 1 && (
              <button className="pm-lightbox-arrow pm-lightbox-arrow--prev" onClick={(e) => { e.stopPropagation(); goPrev(); }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
            )}
            <img
              src={activeAtt.url}
              alt={activeAtt.name}
              className="pm-lightbox-img"
              onClick={(e) => e.stopPropagation()}
            />
            {attachments.length > 1 && (
              <button className="pm-lightbox-arrow pm-lightbox-arrow--next" onClick={(e) => { e.stopPropagation(); goNext(); }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            )}
            {attachments.length > 1 && (
              <div className="pm-lightbox-counter">{safeIdx + 1} / {attachments.length}</div>
            )}
          </div>
        )}

        {/* ── Save success toast ── */}
        {saveSuccess && (
          <div className="pm-save-toast">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Post salvo com sucesso!
          </div>
        )}

        {/* ── Footer Social Media ── */}
        {!readOnly && (
          <div className="pm-footer">
            <button className="pm-btn-cancel" onClick={onClose}>Cancelar</button>
            {!isNew && (
              confirmDel
                ? <div className="pm-del-confirm">
                    <span>Excluir post?</span>
                    <button className="pm-del-yes" onClick={() => { onDelete(post); onClose(); }}>✓ Sim</button>
                    <button className="pm-del-no"  onClick={() => setConfirmDel(false)}>✕ Não</button>
                  </div>
                : <button className="pm-btn-delete" onClick={() => setConfirmDel(true)} title="Excluir post">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
            )}
            <div className="pm-footer-right">
              <span className="pm-footer-count">{captionLen}/2200</span>
              {isNew ? (
                <>
                  <button className="pm-btn-draft" onClick={handleSaveDraft}>Salvar Rascunho</button>
                  <button className="pm-btn-schedule" onClick={handleSchedule}>Agendar Post</button>
                </>
              ) : (
                <>
                  <button className="pm-btn-draft" onClick={() => { setErrors({}); onSave(formRef.current); triggerSaveSuccess(); }}>✓ Salvar</button>
                  <button className="pm-btn-schedule" onClick={handleSchedule}>Agendar</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Footer Client Review ── */}
        {readOnly && (
          <div className="pm-footer-review">
            {isInApprovalMode && (
              <div className="pm-progress-bar">
                <div className="pm-progress-label">Post <strong>{approvalIdx + 1}</strong> de <strong>{approvalTotal}</strong></div>
                <div className="pm-progress-track"><div className="pm-progress-fill" style={{ width: `${((approvalIdx + 1) / approvalTotal) * 100}%` }} /></div>
              </div>
            )}

            {reviewSent && !reviewMode && (
              <div className="pm-review-sent">
                {form.clienteReview === 'aprovado'  && <span className="pm-sent-pill pm-sent-ok">✅ Aprovado!</span>}
                {form.clienteReview === 'rejeitado' && <span className="pm-sent-pill pm-sent-err">❌ Rejeitado</span>}
                {form.clienteReview === 'ajustes'   && <span className="pm-sent-pill pm-sent-warn">✏️ Ajustes enviados</span>}
                {isInApprovalMode && <span className="pm-sent-next">Avançando…</span>}
              </div>
            )}

            {(reviewMode === 'rejeitado' || reviewMode === 'ajustes') && (
              <div className={`pm-review-panel pm-review-panel--${reviewMode}`}>
                <p className="pm-review-panel-label">{reviewMode === 'rejeitado' ? 'Motivo da rejeição:' : 'Descreva os ajustes:'}</p>
                <textarea className="pm-review-textarea" rows={2} autoFocus value={reviewDraft} onChange={(e) => setReviewDraft(e.target.value)} placeholder={reviewMode === 'rejeitado' ? 'Ex.: O texto não representa nossa marca…' : 'Ex.: Mudar o CTA, ajustar a cor…'} />
              </div>
            )}

            {!form.enviadoParaAprovacao && !form.clienteReview && !reviewSent && (
              <div className="pm-review-pending"><span>🛠</span> Esse conteúdo ainda está sendo produzido</div>
            )}

            {!reviewSent && (form.enviadoParaAprovacao || form.clienteReview) && (
              <div className="pm-review-btns">
                {!reviewMode ? (
                  <>
                    <button className="pm-review-btn pm-review-btn--reject"  onClick={() => { setReviewMode('rejeitado'); setReviewDraft(''); }}>✗ Rejeitar</button>
                    <button className="pm-review-btn pm-review-btn--adjust"  onClick={() => { setReviewMode('ajustes'); setReviewDraft(form.clienteNotes ?? ''); }}>✏ Pedir Ajustes</button>
                    <button className="pm-review-btn pm-review-btn--approve" onClick={() => sendReview('aprovado')}>✓ Aprovar</button>
                  </>
                ) : (
                  <>
                    <button className="pm-review-btn pm-review-btn--back"    onClick={() => setReviewMode(null)}>← Voltar</button>
                    <button className={`pm-review-btn pm-review-btn--${reviewMode === 'rejeitado' ? 'reject' : 'adjust'}`} onClick={() => { if (reviewDraft.trim()) sendReview(reviewMode, reviewDraft.trim()); }} disabled={!reviewDraft.trim()}>
                      {reviewMode === 'rejeitado' ? '✗ Confirmar Rejeição' : '✏ Enviar Ajustes'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
