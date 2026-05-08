import { useState, useRef, useEffect } from 'react';
import { TextInput, Textarea } from '@mantine/core';
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { DatePicker, Splitter, Carousel, Image, Modal, Tag, ConfigProvider } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { PILLAR_COLORS } from '../constants';
import { uploadAttachment, deleteAttachment } from '../services/storage';
import { getOrCreateClientToken } from '../services/db';
import { useOptions } from '../context/OptionsContext';
import { usePosts } from '../context/PostsContext';

dayjs.locale('pt-br');

const FORMAT_COLORS = {
  'Reel':     { bg: '#FFD6E8', color: '#B52060' },
  'Carrossel':{ bg: '#C8E4FF', color: '#1565C0' },
  'Post':     { bg: '#D8D6FF', color: '#3D3999' },
  'Stories':  { bg: '#D4F0C4', color: '#2E7D32' },
};

const STATUS_COLORS = {
  'Planejado':            { bg: '#EBEBF0', color: '#4A4A6A' },
  'Em Produção':          { bg: '#C8E4FF', color: '#1565C0' },
  'Agendado':             { bg: '#D4F0C4', color: '#2E7D32' },
  'Publicado':            { bg: '#E9EDC9', color: '#5A6B2A' },
  'Aguardando Aprovação': { bg: '#FFF3B0', color: '#A07800' },
  'Aprovado':             { bg: '#D4F0C4', color: '#2E7D32' },
  'Alterações':           { bg: '#FFD9C2', color: '#C45000' },
  'Rejeitado':            { bg: '#FFD9C2', color: '#C45000' },
};

const PRESET_TAG_COLORS = [
  { bg: '#E3F2FD', color: '#1565C0' },
  { bg: '#E8F5E9', color: '#1B5E20' },
  { bg: '#FFF8E1', color: '#E65100' },
  { bg: '#F3E5F5', color: '#6A1B9A' },
  { bg: '#FCE4EC', color: '#C2185B' },
  { bg: '#E0F7FA', color: '#006064' },
  { bg: '#FFF3E0', color: '#BF360C' },
  { bg: '#EDE7F6', color: '#4527A0' },
  { bg: '#F1F8E9', color: '#33691E' },
  { bg: '#FBE9E7', color: '#BF360C' },
  { bg: '#E8EAF6', color: '#283593' },
  { bg: '#FFEEFF', color: '#880E4F' },
];

// ─── ManageGroup ─────────────────────────────────────────────────────────────
function ManageGroup({ items, onAdd, onDelete, onRename, tagColors, showColorPicker }) {
  const [newName,  setNewName]  = useState('');
  const [newColor, setNewColor] = useState(PRESET_TAG_COLORS[0]);
  const [renamingIndex, setRenamingIndex] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = (idx) => {
    setRenamingIndex(idx);
    setRenameValue(items[idx]);
  };

  const commitRename = (idx) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== items[idx]) onRename(items[idx], trimmed);
    setRenamingIndex(null);
  };

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed, showColorPicker ? newColor : undefined);
      setNewName('');
    }
  };

  return (
    <div className="group-manager">
      {items.map((item, idx) => {
        const tc = tagColors?.[item];
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
                className="manager-item-label"
                style={tc ? { background: tc.bg, color: tc.color } : {}}
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
      {showColorPicker && (
        <div className="manager-color-picker">
          <span className="manager-color-label">Cor da etiqueta:</span>
          <div className="manager-color-dots">
            {PRESET_TAG_COLORS.map((c, i) => (
              <button
                key={i}
                className={`manager-color-dot${newColor === c ? ' selected' : ''}`}
                style={{ background: c.bg, border: `2.5px solid ${c.color}` }}
                onClick={() => setNewColor(c)}
                title={c.color}
              />
            ))}
          </div>
          {newName && (
            <span
              className="manager-color-preview"
              style={{ background: newColor.bg, color: newColor.color }}
            >
              {newName}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Chip inline para formato/status (single-select) ─────────────────────────
function ChipGroup({ items, value, onChange, colorMap, error }) {
  return (
    <div className={`chip-group${error ? ' chip-group-error' : ''}`}>
      {items.map((item) => {
        const c = colorMap?.[item];
        const isSelected = value === item;
        return (
          <button
            key={item}
            className={`inline-chip${isSelected ? ' inline-chip-selected' : ''}`}
            style={isSelected && c
              ? { background: c.bg, color: c.color, borderColor: c.color }
              : { background: 'transparent', color: '#6B6B80', borderColor: '#D0C9BE' }
            }
            onClick={() => onChange(isSelected ? '' : item)}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

// ─── PostModal ────────────────────────────────────────────────────────────────
export default function PostModal({ post, onClose, readOnly = false }) {
  const {
    availableTags, addTag: onAddTag, deleteTag: onDeleteTag, renameTag: onRenameTag,
    tagColors = {},
    availableFormats, addFormat: onAddFormat, deleteFormat: onDeleteFormat, renameFormat: onRenameFormat,
    formatColors = {},
    availableStatuses, addStatus: onAddStatus, deleteStatus: onDeleteStatus, renameStatus: onRenameStatus,
    statusColors = {},
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

  const [form, setForm] = useState(() => post ?? {});
  const formRef = useRef(form);

  const editor = useEditor({
    extensions: [StarterKit, Underline, Link],
    content: post?.notes ?? '',
    editable: !readOnly,
    onBlur: ({ editor: ed }) => {
      if (readOnly) return;
      const html = ed.getHTML();
      const newForm = { ...formRef.current, notes: html };
      formRef.current = newForm;
      setForm(newForm);
      if (newForm.id) onSave(newForm);
    },
  });

  const [managingTags, setManagingTags] = useState(false);
  const [managingFormats, setManagingFormats] = useState(false);
  const [managingStatuses, setManagingStatuses] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState(null);

  const [errors, setErrors] = useState({});
  const fileInputRef  = useRef(null);
  const carouselRef   = useRef(null);

  const [reviewMode, setReviewMode]   = useState(null);
  const [reviewDraft, setReviewDraft] = useState(post?.clienteNotes ?? '');
  const [reviewSent, setReviewSent]   = useState(false);

  const [carouselIdx, setCarouselIdx] = useState(0);

  useEffect(() => {
    if (!post?.id) return;
    const REVIEW_FIELDS = ['clienteReview', 'clienteNotes', 'clienteNotification', 'enviadoParaAprovacao'];
    const needsSync = REVIEW_FIELDS.some(
      (f) => (formRef.current[f] ?? null) !== (post[f] ?? null)
    );
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
  }, [post?.clienteReview, post?.clienteNotes, post?.clienteNotification, post?.enviadoParaAprovacao]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const incoming = post?.notes ?? '';
    const current  = editor.getHTML();
    if (incoming !== current) editor.commands.setContent(incoming, false);
  }, [post?.notes]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!post) return null;

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

  const saveFields = (updates) => {
    const newForm = { ...formRef.current, ...updates };
    formRef.current = newForm;
    setForm(newForm);
    if (newForm.id) onSave(newForm);
  };

  const saveField = (key, value) => saveFields({ [key]: value });

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

  const toggleTag = (tag) => {
    const current = formRef.current.tags ?? [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    saveField('tags', next);
  };

  const toggleApproved = () => saveField('approved', !formRef.current.approved);

  const handleFileAdd = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = '';

    for (const file of files) {
      const attachId    = Date.now() + Math.random();
      const storagePath = `attachments/${attachId}`;

      const tempAtt = {
        id: attachId,
        name: file.name,
        url: URL.createObjectURL(file),
        storagePath,
        uploading: true,
        error: false,
      };
      saveField('attachments', [...(formRef.current.attachments ?? []), tempAtt]);

      try {
        const permanentUrl = await uploadAttachment(storagePath, file);
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
    if (att?.storagePath && !att.uploading) {
      deleteAttachment(att.storagePath).catch(console.error);
    }
    const newAttachments = formRef.current.attachments.filter((a) => a.id !== id);
    saveFields({
      attachments: newAttachments,
      coverId: formRef.current.coverId === id ? null : formRef.current.coverId,
    });
  };

  const toggleCover = (attachId) => {
    saveField('coverId', formRef.current.coverId === attachId ? null : attachId);
  };

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

  const REVIEW_STATUS = {
    aprovado:  'Aprovado',
    ajustes:   'Alterações',
    rejeitado: 'Rejeitado',
  };

  const sendReview = (type, notes = '') => {
    const updated = {
      ...formRef.current,
      clienteReview: type,
      clienteNotes: notes,
      clienteNotification: true,
      status: REVIEW_STATUS[type] ?? formRef.current.status,
    };
    formRef.current = updated;
    setForm(updated);
    onSave(updated);
    setReviewMode(null);
    setReviewSent(true);
    if (isInApprovalMode && onReviewNext) {
      setTimeout(() => onReviewNext(), 600);
    }
  };

  const handleAprovar = () => sendReview('aprovado');

  const handleConfirmReview = () => {
    if (!reviewDraft.trim()) return;
    sendReview(reviewMode, reviewDraft.trim());
  };

  const handleMarkRead = () => {
    if (formRef.current.clienteReview === 'ajustes') {
      saveFields({
        clienteNotification: false,
        clienteReview: null,
        clienteNotes: '',
        enviadoParaAprovacao: false,
        status: 'Em Produção',
      });
    } else {
      saveFields({ clienteNotification: false });
    }
  };

  const coverAttachment = (form.attachments ?? []).find((a) => a.id === form.coverId);
  const hasErrors = Object.keys(errors).length > 0;

  const attachments    = form.attachments ?? [];
  const hasAttachments = attachments.length > 0;
  const safeIdx        = hasAttachments ? Math.min(carouselIdx, attachments.length - 1) : 0;
  const activeAtt      = hasAttachments ? attachments[safeIdx] : null;

  return (
    <ConfigProvider locale={ptBR}>
    <Modal
      open={true}
      onCancel={onClose}
      maskClosable={true}
      width="min(1100px, 95vw)"
      footer={null}
      title={null}
      closeIcon={null}
      styles={{
        mask: { backdropFilter: 'blur(10px)', background: 'rgba(26,24,40,0.5)' },
        body: { padding: 0 },
        content: { padding: 0, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' },
      }}
      className="post-modal-antd"
    >

      {/* ── CABEÇALHO ── */}
      <div className="popup-header">
        <TextInput
          value={form.title ?? ''}
          onChange={readOnly ? undefined : handleTitleChange}
          onBlur={readOnly ? undefined : handleTitleBlur}
          placeholder="Título do post *"
          autoFocus={isNew && !readOnly}
          readOnly={readOnly}
          error={errors.title ? 'Título obrigatório' : null}
          variant="unstyled"
          classNames={{ input: `popup-title-input${errors.title ? ' input-error' : ''}` }}
          style={{ flex: 1, minWidth: 0 }}
        />
        <button className="popup-close" onClick={onClose} title="Fechar">×</button>
      </div>

      {/* ── CORPO: Splitter esquerda / direita ── */}
      <Splitter className="popup-splitter-body" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
      <Splitter.Panel defaultSize="55%" min="38%" className="popup-splitter-left">
      <div className="popup-main-left">

        {/* ── BANNER DE NOTIFICAÇÃO (Social Media) ── */}
        {!readOnly && form.clienteNotification && (
          <div className={`review-notification-banner review-banner-${form.clienteReview}`}>
            <div className="review-banner-content">
              {form.clienteReview === 'aprovado' && (
                <>
                  <span className="review-banner-icon">✅</span>
                  <div>
                    <strong>O cliente aprovou este post!</strong>
                    <p>Conteúdo aprovado pelo cliente.</p>
                  </div>
                </>
              )}
              {form.clienteReview === 'rejeitado' && (
                <>
                  <span className="review-banner-icon">❌</span>
                  <div>
                    <strong>O cliente rejeitou este post</strong>
                    {form.clienteNotes && <p className="review-banner-reason">"{form.clienteNotes}"</p>}
                  </div>
                </>
              )}
              {form.clienteReview === 'ajustes' && (
                <>
                  <span className="review-banner-icon">✏️</span>
                  <div>
                    <strong>O cliente pediu ajustes</strong>
                    {form.clienteNotes && <p className="review-banner-reason">"{form.clienteNotes}"</p>}
                  </div>
                </>
              )}
            </div>
            <button className="review-banner-read-btn" onClick={handleMarkRead}>
              ✓ Marcar como lido
            </button>
          </div>
        )}

        <div className="popup-content">

          {/* Data + Aprovação (Social Media) */}
          {!readOnly && (
            <div className="popup-section">
              <div className="field-label">
                Data {errors.date && <span className="error-inline">⚠ obrigatório</span>}
              </div>
              <div className="date-approved-row">
                <DatePicker
                  value={form.date ? dayjs(form.date) : null}
                  onChange={(date) => {
                    const val = date ? date.format('YYYY-MM-DD') : '';
                    saveField('date', val);
                    if (errors.date) setErrors((prev) => { const e = { ...prev }; delete e.date; return e; });
                  }}
                  format="DD/MM/YYYY"
                  placeholder="Selecionar data *"
                  status={errors.date ? 'error' : ''}
                  style={{ flex: 'none' }}
                  popupClassName="date-picker-popup"
                />

                {form.clienteReview === 'aprovado' && (
                  <span className="send-approval-status send-approval-aprovado">✅ Aprovado pelo cliente</span>
                )}
                {form.clienteReview === 'rejeitado' && (
                  <span className="send-approval-status send-approval-rejeitado">❌ Rejeitado pelo cliente</span>
                )}
                {form.clienteReview === 'ajustes' && (
                  <span className="send-approval-status send-approval-ajustes">✏️ Ajustes solicitados</span>
                )}
                {!form.clienteReview && form.enviadoParaAprovacao && (
                  <span className="send-approval-status send-approval-aguardando">⏳ Aguardando aprovação</span>
                )}
                {(() => {
                  const needsResend = form.clienteReview === 'ajustes' || form.clienteReview === 'rejeitado';
                  const canSend = (!form.clienteReview && !form.enviadoParaAprovacao) || needsResend;
                  if (!canSend) return null;
                  return (
                    <button
                      className="btn-send-approval"
                      onClick={async () => {
                        saveFields({
                          enviadoParaAprovacao: true,
                          status: 'Aguardando Aprovação',
                          clienteReview: null,
                          clienteNotes: '',
                          clienteNotification: false,
                        });
                        if (clientMeta?.phone) {
                          const token = await getOrCreateClientToken(clientMeta.id, ownerUid);
                          const approvalUrl = `${window.location.origin}/?token=${token}`;
                          const text = `Olá ${clientMeta.name}! Você tem posts aguardando sua aprovação no ContentFlow. Acesse: ${approvalUrl}`;
                          setWhatsappUrl(`https://wa.me/${clientMeta.phone}?text=${encodeURIComponent(text)}`);
                        }
                      }}
                    >
                      {needsResend ? '🔄 Reenviar para aprovação' : '📤 Mandar para aprovação'}
                    </button>
                  );
                })()}
                {whatsappUrl && (
                  <a
                    className="btn-send-approval"
                    style={{ background: '#25D366', color: '#fff', textDecoration: 'none',
                             display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6 }}
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setWhatsappUrl(null)}
                  >
                    💬 Notificar via WhatsApp
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ── INFO ROW (cliente) ── */}
          {readOnly ? (
            <div className="popup-section client-info-mantine">
              {form.date && (
                <div className="client-info-chip">
                  <span className="client-info-chip-label">Data</span>
                  <DatePicker
                    value={form.date ? dayjs(form.date) : null}
                    format="DD/MM/YYYY"
                    disabled
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              {form.format && (
                <div className="client-info-chip">
                  <span className="client-info-chip-label">Formato</span>
                  <div className="chip-group">
                    {(() => { const c = { ...FORMAT_COLORS, ...formatColors }[form.format]; return (
                      <span className="inline-chip inline-chip-selected"
                        style={c ? { background: c.bg, color: c.color, borderColor: c.color } : {}}>
                        {form.format}
                      </span>
                    ); })()}
                  </div>
                </div>
              )}

              {form.status && (
                <div className="client-info-chip">
                  <span className="client-info-chip-label">Status</span>
                  <div className="chip-group">
                    {(() => { const c = { ...STATUS_COLORS, ...statusColors }[form.status]; return (
                      <span className="inline-chip inline-chip-selected"
                        style={c ? { background: c.bg, color: c.color, borderColor: c.color } : {}}>
                        {form.status}
                      </span>
                    ); })()}
                  </div>
                </div>
              )}

              {(form.tags ?? []).length > 0 && (
                <div className="client-info-chip">
                  <span className="client-info-chip-label">Etiquetas</span>
                  <div className="chip-group">
                    {(form.tags ?? []).map((tag) => {
                      const tc = tagColors[tag] ?? PILLAR_COLORS[tag] ?? { bg: '#EDE7DC', color: '#4338CA' };
                      return (
                        <span
                          key={tag}
                          className="inline-chip inline-chip-selected"
                          style={{ background: tc.bg, color: tc.color, borderColor: tc.color }}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Formato (Social Media) */}
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
                    tagColors={{ ...FORMAT_COLORS, ...formatColors }}
                    showColorPicker
                  />
                ) : (
                  <ChipGroup
                    items={availableFormats}
                    value={form.format ?? ''}
                    onChange={(val) => {
                      saveField('format', val);
                      if (errors.format) setErrors((prev) => { const e = { ...prev }; delete e.format; return e; });
                    }}
                    colorMap={{ ...FORMAT_COLORS, ...formatColors }}
                    error={errors.format && !form.format}
                  />
                )}
              </div>

              {/* Status (Social Media) */}
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
                    tagColors={{ ...STATUS_COLORS, ...statusColors }}
                    showColorPicker
                  />
                ) : (
                  <ChipGroup
                    items={availableStatuses}
                    value={form.status ?? ''}
                    onChange={(val) => {
                      saveField('status', val);
                      if (errors.status) setErrors((prev) => { const e = { ...prev }; delete e.status; return e; });
                    }}
                    colorMap={{ ...STATUS_COLORS, ...statusColors }}
                    error={errors.status && !form.status}
                  />
                )}
              </div>

              {/* Etiquetas (Social Media) — Tag.CheckableTag */}
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
                    tagColors={tagColors}
                    showColorPicker
                  />
                ) : (
                  <div className="chip-group chip-group-tags">
                    {availableTags.map((tag) => {
                      const tc = tagColors[tag] ?? PILLAR_COLORS[tag] ?? { bg: '#EDE7DC', color: '#4338CA' };
                      const isChecked = (form.tags ?? []).includes(tag);
                      return (
                        <Tag.CheckableTag
                          key={tag}
                          checked={isChecked}
                          onChange={() => toggleTag(tag)}
                          style={isChecked
                            ? { background: tc.bg, color: tc.color, borderColor: tc.color, fontWeight: 600, fontSize: 12 }
                            : { background: 'transparent', color: '#8b7e6e', borderColor: '#D0C9BE', fontWeight: 500, fontSize: 12 }
                          }
                        >
                          {tag}
                        </Tag.CheckableTag>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Descrição / Legenda — Rich Text Editor */}
          <div className="popup-section">
            <div className="popup-section-label">Descrição do Post / Legenda</div>
            <RichTextEditor editor={editor} className={`notes-rte${readOnly ? ' notes-rte-readonly' : ''}`}>
              {!readOnly && (
                <RichTextEditor.Toolbar sticky stickyOffset={0}>
                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Bold />
                    <RichTextEditor.Italic />
                    <RichTextEditor.Underline />
                    <RichTextEditor.Strikethrough />
                    <RichTextEditor.ClearFormatting />
                  </RichTextEditor.ControlsGroup>
                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.BulletList />
                    <RichTextEditor.OrderedList />
                  </RichTextEditor.ControlsGroup>
                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Link />
                    <RichTextEditor.Unlink />
                  </RichTextEditor.ControlsGroup>
                </RichTextEditor.Toolbar>
              )}
              <RichTextEditor.Content />
            </RichTextEditor>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileAdd}
          />
        </div>

        {/* ── HISTÓRICO (Social Media) ── */}
        {!readOnly && showHistory && (
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
                    <div className="history-entry-time">🕐 {fmtTimestamp(entry.timestamp)}</div>
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

      </div>
      </Splitter.Panel>

      {/* ── PAINEL DIREITO: Mídias ── */}
      <Splitter.Panel defaultSize="45%" min="30%" className="popup-splitter-right">
        <div className="carousel-panel">

          <div className="carousel-panel-header">
            <span className="carousel-panel-title">
              🖼 Mídias{attachments.length > 0 ? ` (${attachments.length})` : ''}
            </span>
            {!readOnly && (
              <button className="attach-btn" onClick={() => fileInputRef.current.click()}>
                + Adicionar
              </button>
            )}
          </div>

          {!hasAttachments && (
            <div className="carousel-empty">
              <div className="carousel-empty-icon">📷</div>
              <p>{readOnly ? 'Nenhuma imagem adicionada.' : 'Nenhuma imagem ainda.'}</p>
              {!readOnly && (
                <button className="attach-btn-lg" onClick={() => fileInputRef.current.click()}>
                  + Adicionar imagem
                </button>
              )}
            </div>
          )}

          {hasAttachments && (
            <>
              <div className="carousel-main-wrap">
                <Image.PreviewGroup>
                  <Carousel
                    ref={carouselRef}
                    afterChange={setCarouselIdx}
                    arrows
                    dots={false}
                    infinite={attachments.length > 1}
                    className="antd-carousel"
                  >
                    {attachments.map((att) => (
                      <div key={att.id} className="carousel-slide-inner">
                        <Image
                          src={att.url}
                          alt={att.name}
                          className="carousel-main-img"
                          style={{ opacity: att.uploading ? 0.5 : 1 }}
                          preview={!att.uploading && !att.error}
                          wrapperClassName="carousel-img-wrapper"
                        />
                        {att.uploading && (
                          <div className="att-status-overlay">
                            <span className="att-spinner" /> Enviando…
                          </div>
                        )}
                        {att.error && (
                          <div className="att-status-overlay att-error-overlay">⚠ Falha no envio</div>
                        )}
                      </div>
                    ))}
                  </Carousel>
                </Image.PreviewGroup>

                {!readOnly && activeAtt && (
                  <div className="carousel-main-actions">
                    <button
                      className={`carousel-cover-btn${activeAtt.id === form.coverId ? ' carousel-cover-btn-active' : ''}`}
                      onClick={() => !activeAtt.uploading && toggleCover(activeAtt.id)}
                      disabled={activeAtt.uploading}
                    >
                      {activeAtt.id === form.coverId ? '🖼 Capa' : 'Definir capa'}
                    </button>
                    <button
                      className="carousel-remove-btn"
                      onClick={() => {
                        removeAttachment(activeAtt.id);
                        carouselRef.current?.goTo(0);
                        setCarouselIdx(0);
                      }}
                      disabled={activeAtt.uploading}
                    >× Remover</button>
                  </div>
                )}
              </div>

              <div className="carousel-counter">
                <span>{safeIdx + 1} / {attachments.length}</span>
                {activeAtt && <span className="carousel-filename">{activeAtt.name}</span>}
              </div>

              {attachments.length > 1 && (
                <div className="carousel-thumbs">
                  {attachments.map((att, i) => (
                    <button
                      key={att.id}
                      className={[
                        'carousel-thumb',
                        i === safeIdx           ? 'carousel-thumb-active'  : '',
                        att.id === form.coverId ? 'carousel-thumb-cover'   : '',
                        att.uploading           ? 'carousel-thumb-loading' : '',
                      ].join(' ').trim()}
                      onClick={() => { carouselRef.current?.goTo(i); setCarouselIdx(i); }}
                      title={att.name}
                    >
                      <img src={att.url} alt={att.name} />
                      {att.id === form.coverId && <span className="carousel-thumb-badge">Capa</span>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </Splitter.Panel>
      </Splitter>

      {/* ── RODAPÉ CLIENTE ── */}
      {readOnly && (
        <div className="popup-footer-review">

          {isInApprovalMode && (
            <div className="review-progress-bar">
              <div className="review-progress-label">
                Revisando post <strong>{approvalIdx + 1}</strong> de <strong>{approvalTotal}</strong>
              </div>
              <div className="review-progress-track">
                <div
                  className="review-progress-fill"
                  style={{ width: `${((approvalIdx + 1) / approvalTotal) * 100}%` }}
                />
              </div>
            </div>
          )}

          {reviewSent && !reviewMode && (
            <div className="review-sent-feedback">
              {form.clienteReview === 'aprovado'  && <span className="review-sent-pill review-sent-aprovado">✅ Aprovado!</span>}
              {form.clienteReview === 'rejeitado' && <span className="review-sent-pill review-sent-rejeitado">❌ Rejeitado</span>}
              {form.clienteReview === 'ajustes'   && <span className="review-sent-pill review-sent-ajustes">✏️ Ajustes enviados</span>}
              {isInApprovalMode && <span className="review-sent-next">Avançando…</span>}
            </div>
          )}

          {reviewMode === 'rejeitado' && (
            <div className="review-footer-panel review-footer-rejeitar">
              <p className="review-footer-panel-label">Motivo da rejeição:</p>
              <Textarea
                value={reviewDraft}
                onChange={(e) => setReviewDraft(e.target.value)}
                placeholder="Ex.: O texto não representa nossa marca..."
                minRows={2}
                autosize
                autoFocus
              />
            </div>
          )}

          {reviewMode === 'ajustes' && (
            <div className="review-footer-panel review-footer-ajustes">
              <p className="review-footer-panel-label">Descreva os ajustes ou considerações:</p>
              <Textarea
                value={reviewDraft}
                onChange={(e) => setReviewDraft(e.target.value)}
                placeholder="Ex.: Mudar a cor, alterar o texto do CTA..."
                minRows={2}
                autosize
                autoFocus
              />
            </div>
          )}

          {!form.enviadoParaAprovacao && !form.clienteReview && !reviewSent && (
            <div className="review-not-sent-msg">
              <span className="review-not-sent-icon">🛠</span>
              Esse conteúdo ainda está sendo produzido
            </div>
          )}

          {!reviewSent && (form.enviadoParaAprovacao || form.clienteReview) && (
            <div className="review-footer-btns">
              {!reviewMode ? (
                <>
                  <button className="review-footer-btn review-footer-btn-rejeitar"
                    onClick={() => { setReviewMode('rejeitado'); setReviewDraft(''); }}>
                    ✗ Rejeitar
                  </button>
                  <button className="review-footer-btn review-footer-btn-ajustes"
                    onClick={() => { setReviewMode('ajustes'); setReviewDraft(form.clienteNotes ?? ''); }}>
                    ✏ Pedir Ajustes
                  </button>
                  <button className="review-footer-btn review-footer-btn-aprovar"
                    onClick={handleAprovar}>
                    ✓ Aprovar
                  </button>
                </>
              ) : (
                <>
                  <button className="review-footer-btn review-footer-btn-cancel"
                    onClick={() => setReviewMode(null)}>
                    ← Voltar
                  </button>
                  <button
                    className={`review-footer-btn ${reviewMode === 'rejeitado' ? 'review-footer-btn-rejeitar' : 'review-footer-btn-ajustes'}`}
                    onClick={handleConfirmReview}
                    disabled={!reviewDraft.trim()}
                  >
                    {reviewMode === 'rejeitado' ? '✗ Confirmar Rejeição' : '✏ Enviar Ajustes'}
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      )}

      {/* ── RODAPÉ SOCIAL MEDIA ── */}
      {!readOnly && (
        <div className="popup-footer">
          {!isNew && (
            <button className="btn-danger" onClick={() => onDelete(post)}>🗑 Excluir</button>
          )}
          <div style={{ flex: 1 }} />
          <button
            className={`btn-history ${showHistory ? 'btn-history-active' : ''}`}
            onClick={() => setShowHistory((v) => !v)}
          >
            📋 Histórico{(form.history ?? []).length > 0 && ` (${form.history.length})`}
          </button>
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
      )}

    </Modal>
    </ConfigProvider>
  );
}
