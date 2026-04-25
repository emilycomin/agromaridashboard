import { useState, useRef, useEffect } from 'react';
import { TextInput, Textarea, Select, Popover } from '@mantine/core';
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { DatePicker, Splitter, Carousel, Image } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import { ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { PILLAR_COLORS } from '../constants';
import { uploadAttachment, deleteAttachment } from '../services/storage';
import { getOrCreateClientToken } from '../services/db';
import { useOptions } from '../context/OptionsContext';
import { usePosts } from '../context/PostsContext';

dayjs.locale('pt-br');

// Mapa de classes de cor para pills de formato e status
const FORMAT_CLS = {
  'Reel':     'fmt-reel',
  'Carrossel':'fmt-carrossel',
  'Post':     'fmt-post',
  'Stories':  'fmt-stories',
};
const STATUS_CLS = {
  'Planejado':            'status-planejado',
  'Em Produção':          'status-producao',
  'Agendado':             'status-agendado',
  'Publicado':            'status-publicado',
  'Aguardando Aprovação': 'status-aguardando',
  'Aprovado':             'status-aprovado-tag',
  'Alterações':           'status-alteracoes',
  'Rejeitado':            'status-rejeitado-tag',
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
export default function PostModal({ post, onClose, readOnly = false }) {
  const {
    availableTags, addTag: onAddTag, deleteTag: onDeleteTag, renameTag: onRenameTag,
    availableFormats, addFormat: onAddFormat, deleteFormat: onDeleteFormat, renameFormat: onRenameFormat,
    availableStatuses, addStatus: onAddStatus, deleteStatus: onDeleteStatus, renameStatus: onRenameStatus,
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

  // ─── RICH TEXT EDITOR (Descrição / Legenda) ──────────────────────────────────
  // useEditor deve ser chamado antes do early-return (regras dos hooks)
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
  const [tagsOpen, setTagsOpen] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState(null);

  const [errors, setErrors] = useState({});
  const fileInputRef  = useRef(null);
  const carouselRef   = useRef(null);

  // ─── REVIEW DO CLIENTE ────────────────────────────────────────────────────────
  const [reviewMode, setReviewMode]       = useState(null); // null | 'rejeitado' | 'ajustes'
  const [reviewDraft, setReviewDraft]     = useState(post?.clienteNotes ?? '');
  const [reviewSent, setReviewSent]       = useState(false);

  // ─── CARROSSEL ───────────────────────────────────────────────────────────────
  const [carouselIdx, setCarouselIdx]     = useState(0);

  // ─── SYNC DE CAMPOS DE REVIEW COM O PROP `post` ──────────────────────────────
  // Quando o Firestore atualiza o post (ex.: cliente envia ajustes enquanto o modal
  // está aberto), o Dashboard chama setSelectedPost(fresh), o que muda o prop `post`
  // sem remontar o componente. Sem este efeito, formRef.current e form ficam com
  // valores antigos, causando dois problemas:
  //   1. O banner de notificação não aparece (form.clienteNotification desatualizado)
  //   2. handleMarkRead verifica formRef.current.clienteReview (desatualizado) e
  //      pode não limpar o campo, impedindo o post de entrar em postsParaAprovar
  //      novamente após o SM reenviar para aprovação.
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

  // Sincroniza o conteúdo do editor quando o post muda externamente (Firestore)
  // Só atualiza se o editor não estiver em foco para não interromper a digitação
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const incoming = post?.notes ?? '';
    const current  = editor.getHTML();
    if (incoming !== current) editor.commands.setContent(incoming, false);
  }, [post?.notes]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ─── HANDLERS DE REVIEW (perfil cliente) ─────────────────────────────────────
  // Mapeia clienteReview → status automático
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
    // Se estiver na fila de aprovação, avança automaticamente
    if (isInApprovalMode && onReviewNext) {
      // Pequeno delay para o usuário perceber o feedback antes de avançar
      setTimeout(() => onReviewNext(), 600);
    }
  };

  const handleAprovar = () => sendReview('aprovado');

  const handleConfirmReview = () => {
    if (!reviewDraft.trim()) return;
    sendReview(reviewMode, reviewDraft.trim());
  };

  // Marcar notificação como lida (social media)
  // Para "ajustes": limpa o review e libera o botão de reenvio para o cliente
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

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const coverAttachment = (form.attachments ?? []).find((a) => a.id === form.coverId);
  const hasErrors = Object.keys(errors).length > 0;

  // Carrossel
  const attachments   = form.attachments ?? [];
  const hasAttachments = attachments.length > 0;
  const safeIdx       = hasAttachments ? Math.min(carouselIdx, attachments.length - 1) : 0;
  const activeAtt     = hasAttachments ? attachments[safeIdx] : null;

  return (
    <div className="popup-overlay visible" onClick={handleOverlayClick}>
      <div className="popup popup-large popup-with-carousel">

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

        {/* ── CORPO PRINCIPAL: Splitter esquerda / direita ── */}
        <Splitter className="popup-splitter-body">
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
            <button className="review-banner-read-btn" onClick={handleMarkRead} title="Marcar como lido">
              ✓ Marcar como lido
            </button>
          </div>
        )}

        {/* ── CONTEÚDO ── */}
        <div className="popup-content">

            {/* Data + Mandar para aprovação (Social Media) */}
          {!readOnly && (
            <div className="popup-section">
              <div className="field-label">
                Data {errors.date && <span className="error-inline">⚠ obrigatório</span>}
              </div>
              <div className="date-approved-row">
                <ConfigProvider locale={ptBR}>
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
                </ConfigProvider>

                {/* Status de aprovação do cliente */}
                {form.clienteReview === 'aprovado' && (
                  <span className="send-approval-status send-approval-aprovado">
                    ✅ Aprovado pelo cliente
                  </span>
                )}
                {form.clienteReview === 'rejeitado' && (
                  <span className="send-approval-status send-approval-rejeitado">
                    ❌ Rejeitado pelo cliente
                  </span>
                )}
                {form.clienteReview === 'ajustes' && (
                  <span className="send-approval-status send-approval-ajustes">
                    ✏️ Ajustes solicitados
                  </span>
                )}
                {!form.clienteReview && form.enviadoParaAprovacao && (
                  <span className="send-approval-status send-approval-aguardando">
                    ⏳ Aguardando aprovação
                  </span>
                )}
                {!form.clienteReview && !form.enviadoParaAprovacao && (
                  <button
                    className="btn-send-approval"
                    onClick={async () => {
                      saveFields({ enviadoParaAprovacao: true, status: 'Aguardando Aprovação' });
                      if (clientMeta?.phone) {
                        const token = await getOrCreateClientToken(clientMeta.id, ownerUid);
                        const approvalUrl = `${window.location.origin}/?token=${token}`;
                        const text = `Olá ${clientMeta.name}! Você tem posts aguardando sua aprovação no Flowly. Acesse: ${approvalUrl}`;
                        setWhatsappUrl(`https://wa.me/${clientMeta.phone}?text=${encodeURIComponent(text)}`);
                      }
                    }}
                    title="Enviar este post para o cliente aprovar"
                  >
                    📤 Mandar para aprovação
                  </button>
                )}
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

          {/* ── INFO ROW (cliente): Data · Formato · Status · Etiquetas — mesma linha ── */}
          {readOnly ? (
            <div className="popup-section client-info-mantine">
              {/* Data */}
              {form.date && (
                <div className="client-info-chip">
                  <span className="client-info-chip-label">Data</span>
                  <ConfigProvider locale={ptBR}>
                    <DatePicker
                      value={form.date ? dayjs(form.date) : null}
                      format="DD/MM/YYYY"
                      disabled
                      style={{ width: '100%' }}
                    />
                  </ConfigProvider>
                </div>
              )}

              {/* Formato — Select readOnly */}
              {availableFormats.length > 0 && (
                <Select
                  label="Formato"
                  data={availableFormats}
                  value={form.format ?? null}
                  readOnly
                  variant="filled"
                  placeholder="—"
                  renderOption={({ option }) => (
                    <span className={`modal-pill pill-selected ${FORMAT_CLS[option.value] ?? 'fmt-post'}`}
                      style={{ fontSize: 12 }}>
                      {option.label}
                    </span>
                  )}
                />
              )}

              {/* Status — Select readOnly */}
              {availableStatuses.length > 0 && (
                <Select
                  label="Status"
                  data={availableStatuses}
                  value={form.status ?? null}
                  readOnly
                  variant="filled"
                  placeholder="—"
                  renderOption={({ option }) => (
                    <span className={`modal-pill pill-selected ${STATUS_CLS[option.value] ?? 'status-planejado'}`}
                      style={{ fontSize: 12 }}>
                      {option.label}
                    </span>
                  )}
                />
              )}

              {/* Etiquetas — Popover readOnly */}
              {availableTags.length > 0 && (
                <div>
                  <span className="mantine-label-fake">Etiquetas</span>
                  <Popover
                    opened={tagsOpen}
                    onChange={setTagsOpen}
                    position="bottom-start"
                    width="target"
                    withinPortal
                  >
                    <Popover.Target>
                      <div
                        className={`tags-trigger tags-trigger-readonly${tagsOpen ? ' tags-trigger-open' : ''}`}
                        onClick={() => setTagsOpen((o) => !o)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setTagsOpen((o) => !o)}
                      >
                        {(form.tags ?? []).length === 0 ? (
                          <span className="tags-trigger-placeholder">—</span>
                        ) : (
                          <div className="tags-trigger-chips">
                            {(form.tags ?? []).map((tag) => {
                              const pc = PILLAR_COLORS[tag] ?? { cls: 'pill-especial' };
                              return (
                                <span key={tag} className={`post-pill modal-pill ${pc.cls} pill-selected`}>
                                  {tag}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <span className="tags-trigger-arrow">{tagsOpen ? '▲' : '▼'}</span>
                      </div>
                    </Popover.Target>
                    <Popover.Dropdown>
                      <p className="tags-popover-header">Etiquetas do post</p>
                      <div className="tags-popover-grid">
                        {availableTags.map((tag) => {
                          const pc    = PILLAR_COLORS[tag] ?? { cls: 'pill-especial' };
                          const isSel = (form.tags ?? []).includes(tag);
                          return (
                            <span
                              key={tag}
                              className={`post-pill modal-pill ${pc.cls} ${isSel ? 'pill-selected' : 'pill-unselected pill-readonly'}`}
                            >
                              {isSel ? '✓ ' : ''}{tag}
                            </span>
                          );
                        })}
                      </div>
                    </Popover.Dropdown>
                  </Popover>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Formato — Select (Social Media) */}
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
                  <Select
                    data={availableFormats}
                    value={form.format ?? null}
                    onChange={(val) => {
                      saveField('format', val ?? '');
                      if (errors.format) setErrors((prev) => { const e = { ...prev }; delete e.format; return e; });
                    }}
                    placeholder="Selecionar formato..."
                    error={errors.format && !form.format ? 'Obrigatório' : null}
                    clearable
                    allowDeselect
                  />
                )}
              </div>

              {/* Status — Select (Social Media) */}
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
                  <Select
                    data={availableStatuses}
                    value={form.status ?? null}
                    onChange={(val) => {
                      saveField('status', val ?? '');
                      if (errors.status) setErrors((prev) => { const e = { ...prev }; delete e.status; return e; });
                    }}
                    placeholder="Selecionar status..."
                    error={errors.status && !form.status ? 'Obrigatório' : null}
                    clearable
                    allowDeselect
                    renderOption={({ option }) => (
                      <span className={`modal-pill pill-selected ${STATUS_CLS[option.value] ?? 'status-planejado'}`}
                        style={{ fontSize: 12 }}>
                        {option.label}
                      </span>
                    )}
                  />
                )}
              </div>

              {/* Etiquetas — MultiSelect (Social Media) */}
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
                  <Popover
                    opened={tagsOpen}
                    onChange={setTagsOpen}
                    position="bottom-start"
                    width="target"
                    withinPortal
                  >
                    <Popover.Target>
                      <div
                        className={`tags-trigger${tagsOpen ? ' tags-trigger-open' : ''}`}
                        onClick={() => setTagsOpen((o) => !o)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setTagsOpen((o) => !o)}
                      >
                        {(form.tags ?? []).length === 0 ? (
                          <span className="tags-trigger-placeholder">Selecionar etiquetas...</span>
                        ) : (
                          <div className="tags-trigger-chips">
                            {(form.tags ?? []).map((tag) => {
                              const pc = PILLAR_COLORS[tag] ?? { cls: 'pill-especial' };
                              return (
                                <span key={tag} className={`post-pill modal-pill ${pc.cls} pill-selected`}>
                                  {tag}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <span className="tags-trigger-arrow">{tagsOpen ? '▲' : '▼'}</span>
                      </div>
                    </Popover.Target>
                    <Popover.Dropdown>
                      <p className="tags-popover-header">Selecione as etiquetas</p>
                      <div className="tags-popover-grid">
                        {availableTags.map((tag) => {
                          const pc    = PILLAR_COLORS[tag] ?? { cls: 'pill-especial' };
                          const isSel = (form.tags ?? []).includes(tag);
                          return (
                            <button
                              key={tag}
                              className={`post-pill modal-pill ${pc.cls} ${isSel ? 'pill-selected' : 'pill-unselected'}`}
                              onClick={() => toggleTag(tag)}
                            >
                              {isSel ? '✓ ' : ''}{tag}
                            </button>
                          );
                        })}
                      </div>
                    </Popover.Dropdown>
                  </Popover>
                )}
              </div>
            </>
          )}

          {/* Descrição do Post / Legenda — Rich Text Editor */}
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

            {/* input de arquivo — oculto, acionado pelo botão no painel direito */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileAdd}
          />
        </div>

        {/* ── HISTÓRICO DE ALTERAÇÕES — somente Social Media ── */}
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

        </div>{/* fim popup-main-left */}
        </Splitter.Panel>

        {/* ── PAINEL DIREITO: Mídias ── */}
        <Splitter.Panel defaultSize="45%" min="30%" className="popup-splitter-right">
          <div className="carousel-panel">

            {/* Cabeçalho do painel de mídias */}
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

            {/* Estado vazio */}
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

            {/* Carousel antd */}
            {hasAttachments && (
              <>
                <div className="carousel-main-wrap">
                  <Image.PreviewGroup>
                    <ConfigProvider>
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
                    </ConfigProvider>
                  </Image.PreviewGroup>

                  {/* Ações sobre a imagem atual */}
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

                {/* Contador + nome */}
                <div className="carousel-counter">
                  <span>{safeIdx + 1} / {attachments.length}</span>
                  {activeAtt && <span className="carousel-filename">{activeAtt.name}</span>}
                </div>

                {/* Thumbnails */}
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
        </Splitter>{/* fim Splitter */}

        {/* ── RODAPÉ CLIENTE ── */}
        {readOnly && (
          <div className="popup-footer-review">

            {/* Barra de progresso da fila */}
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

            {/* Status do review já enviado (fora de modo rejeição/ajustes) */}
            {reviewSent && !reviewMode && (
              <div className="review-sent-feedback">
                {form.clienteReview === 'aprovado'  && <span className="review-sent-pill review-sent-aprovado">✅ Aprovado!</span>}
                {form.clienteReview === 'rejeitado' && <span className="review-sent-pill review-sent-rejeitado">❌ Rejeitado</span>}
                {form.clienteReview === 'ajustes'   && <span className="review-sent-pill review-sent-ajustes">✏️ Ajustes enviados</span>}
                {isInApprovalMode && <span className="review-sent-next">Avançando…</span>}
              </div>
            )}

            {/* Painel de texto — Rejeição */}
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

            {/* Painel de texto — Ajustes */}
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

            {/* Conteúdo ainda não enviado para aprovação */}
            {!form.enviadoParaAprovacao && !form.clienteReview && !reviewSent && (
              <div className="review-not-sent-msg">
                <span className="review-not-sent-icon">🛠</span>
                Esse conteúdo ainda está sendo produzido
              </div>
            )}

            {/* Botões principais — só aparecem quando enviado para aprovação */}
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
            {/* Excluir — só para posts existentes */}
            {!isNew && (
              <button className="btn-danger" onClick={() => onDelete(post)}>🗑 Excluir</button>
            )}
            <div style={{ flex: 1 }} />
            <button
              className={`btn-history ${showHistory ? 'btn-history-active' : ''}`}
              onClick={() => setShowHistory((v) => !v)}
              title="Ver histórico de alterações"
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

      </div>
    </div>
  );
}
