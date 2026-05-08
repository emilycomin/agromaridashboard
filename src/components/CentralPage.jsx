import { useState } from 'react';
import AppHeader from './AppHeader';
import { persistClient, getOrCreateClientToken, removeClient, setClientArchived } from '../services/db';
import './CentralPage.css';

const PALETTE = [
  '#2E7D32', '#1565C0', '#E65100', '#6A1B9A',
  '#C2185B', '#00838F', '#F57F17', '#4E342E',
];

const EMOJI_SUGGESTIONS = ['🏢','💄','🏠','🍕','🐾','💪','📸','👗','🌿','🎨','🚗','💅'];

const MENU = [
  {
    group: 'Cliente',
    items: [
      { id: 'alterar-info',   label: 'Alterar informações',        icon: '✏️' },
      { id: 'whatsapp-notif', label: 'Notificação pelo WhatsApp',  icon: '💬' },
    ],
  },
];

export default function CentralPage({
  firebaseUser,
  activeClient,
  clients,
  onSelectClient,
  onClientUpdate,
  onLogout,
  onSwitchAccount,
  onBack,
  onArchiveClient,
  onDeleteClient,
}) {
  const [activeItem, setActiveItem] = useState('alterar-info');
  const uid = firebaseUser?.uid;

  return (
    <div className="central-page">
      <AppHeader
        title="Central"
        subtitle={activeClient?.name}
        firebaseUser={firebaseUser}
        onLogout={onLogout}
        onSwitchAccount={onSwitchAccount}
        clients={clients}
        onSelectClient={onSelectClient}
        onBack={onBack}
        userRole="social-media"
      />

      <div className="central-body">
        {/* ── Sidebar ── */}
        <aside className="central-sidebar">
          {MENU.map((section) => (
            <div key={section.group} className="central-sidebar-group">
              <div className="central-sidebar-group-label">{section.group}</div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  className={`central-sidebar-item ${activeItem === item.id ? 'active' : ''}`}
                  onClick={() => setActiveItem(item.id)}
                >
                  <span className="central-sidebar-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* ── Conteúdo ── */}
        <main className="central-content">
          {activeItem === 'alterar-info' && (
            <AlterarInformacoes
              client={activeClient}
              uid={uid}
              onClientUpdate={onClientUpdate}
            />
          )}
          {activeItem === 'whatsapp-notif' && (
            <NotificacaoWhatsApp
              client={activeClient}
              uid={uid}
              onClientUpdate={onClientUpdate}
              onArchiveClient={onArchiveClient}
              onDeleteClient={onDeleteClient}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Painel: Alterar Informações ─────────────────────────────────────────────
function AlterarInformacoes({ client, uid, onClientUpdate }) {
  const [form, setForm] = useState({
    name:        client?.name        ?? '',
    handle:      client?.handle      ?? '',
    description: client?.description ?? '',
    phone:       client?.phone       ?? '',
    emoji:       client?.emoji       ?? '🏢',
    color:       client?.color       ?? PALETTE[1],
  });
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const updated = {
      ...client,
      name:        form.name.trim().toUpperCase(),
      handle:      form.handle.trim(),
      description: form.description.trim(),
      phone:       form.phone.trim(),
      emoji:       form.emoji.trim() || '🏢',
      color:       form.color,
    };
    await persistClient(updated, uid).catch(console.error);
    onClientUpdate(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="central-panel">
      <h2 className="central-panel-title">Alterar informações do cliente</h2>
      <p className="central-panel-desc">Edite os dados do cliente ativos no painel.</p>

      <form className="central-form" onSubmit={handleSave}>
        <div className="central-form-row">
          <label className="central-field">
            <span>Nome <span className="central-req">*</span></span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label className="central-field">
            <span>Perfil Instagram</span>
            <input
              type="text"
              placeholder="@perfil"
              value={form.handle}
              onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))}
            />
          </label>
        </div>

        <label className="central-field">
          <span>Descrição</span>
          <input
            type="text"
            placeholder="Ex: Moda feminina, e-commerce"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>

        <label className="central-field">
          <span>WhatsApp <span className="central-optional">(opcional)</span></span>
          <input
            type="tel"
            placeholder="Ex: 5511999999999 (com DDI, sem + ou espaços)"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </label>

        <div className="central-form-row">
          <label className="central-field" style={{ flex: '0 0 auto' }}>
            <span>Ícone</span>
            <input
              type="text"
              value={form.emoji}
              maxLength={4}
              onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
              className="central-emoji-input"
            />
          </label>
          <div className="central-field" style={{ flex: 1 }}>
            <span>Sugestões</span>
            <div className="central-emoji-grid">
              {EMOJI_SUGGESTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  className={`central-emoji-btn ${form.emoji === em ? 'active' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, emoji: em }))}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="central-field">
          <span>Cor de destaque</span>
          <div className="central-palette">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                className={`central-color-dot ${form.color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => setForm((f) => ({ ...f, color: c }))}
              />
            ))}
          </div>
        </div>

        <div className="central-form-actions">
          <button
            type="submit"
            className="central-btn-save"
            style={{ background: form.color }}
            disabled={saving || !form.name.trim()}
          >
            {saving ? 'Salvando…' : saved ? '✓ Salvo!' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Painel: Notificação pelo WhatsApp ───────────────────────────────────────
function NotificacaoWhatsApp({ client, uid, onClientUpdate, onArchiveClient, onDeleteClient }) {
  const [phone,      setPhone]      = useState(client?.phone ?? '');
  const [editPhone,  setEditPhone]  = useState(!client?.phone);
  const [savingPhone,setSavingPhone]= useState(false);
  const [sending,    setSending]    = useState(false);
  const [sent,       setSent]       = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const approvalText = `Olá ${client?.name ?? 'cliente'}! Você tem posts aguardando sua aprovação no ContentFlow. Acesse seu painel para revisar.`;

  const handleSavePhone = async () => {
    if (!phone.trim()) return;
    setSavingPhone(true);
    const updated = { ...client, phone: phone.trim() };
    await persistClient(updated, uid).catch(console.error);
    onClientUpdate(updated);
    setSavingPhone(false);
    setEditPhone(false);
  };

  const handleSendWhatsApp = async () => {
    if (!phone.trim()) return;
    setSending(true);
    const token = await getOrCreateClientToken(client.id, uid);
    const approvalUrl = `${window.location.origin}/?token=${token}`;
    const text = `${approvalText} Acesse: ${approvalUrl}`;
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    window.open(`https://wa.me/${phone.trim()}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="central-panel">
      <h2 className="central-panel-title">Notificação pelo WhatsApp</h2>
      <p className="central-panel-desc">
        Envie uma mensagem ao cliente com o link de acesso ao painel de aprovação.
      </p>

      {/* Número de WhatsApp */}
      <div className="central-whatsapp-phone-section">
        <div className="central-field-label">Número do cliente</div>
        {editPhone ? (
          <div className="central-whatsapp-phone-edit">
            <input
              type="tel"
              className="central-phone-input"
              placeholder="Ex: 5511999999999 (com DDI)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button
              className="central-btn-save-phone"
              onClick={handleSavePhone}
              disabled={savingPhone || !phone.trim()}
            >
              {savingPhone ? 'Salvando…' : 'Salvar'}
            </button>
            {client?.phone && (
              <button className="central-btn-cancel-phone" onClick={() => { setPhone(client.phone); setEditPhone(false); }}>
                Cancelar
              </button>
            )}
          </div>
        ) : (
          <div className="central-whatsapp-phone-display">
            <span className="central-phone-value">+{phone}</span>
            <button className="central-btn-edit-phone" onClick={() => setEditPhone(true)}>
              ✏️ Editar
            </button>
          </div>
        )}
      </div>

      {/* Preview da mensagem */}
      <div className="central-message-preview">
        <div className="central-field-label">Preview da mensagem</div>
        <div className="central-message-bubble">
          <span>{approvalText}</span>
          <span className="central-message-link"> [link do painel]</span>
        </div>
      </div>

      {/* Botão enviar */}
      <button
        className="central-btn-whatsapp"
        onClick={handleSendWhatsApp}
        disabled={!phone.trim() || sending || editPhone}
      >
        {sending ? 'Abrindo…' : sent ? '✓ WhatsApp aberto!' : '💬 Enviar pelo WhatsApp'}
      </button>

      {!phone.trim() && !editPhone && (
        <p className="central-no-phone-warning">
          Nenhum número cadastrado. Adicione o número acima para enviar notificações.
        </p>
      )}

      {/* ── Zona de perigo ── */}
      <div className="central-danger-zone">
        <div className="central-danger-header">
          <span className="central-danger-title">Zona de perigo</span>
          <span className="central-danger-desc">Ações irreversíveis ou que afetam o acesso ao cliente.</span>
        </div>

        <div className="central-danger-actions">
          {/* Arquivar */}
          <div className="central-danger-row">
            <div className="central-danger-row-info">
              <strong>{client?.archived ? 'Restaurar cliente' : 'Arquivar cliente'}</strong>
              <span>{client?.archived ? 'Reativa o cliente na área de trabalho.' : 'Oculta o cliente da área de trabalho sem apagar dados.'}</span>
            </div>
            <button
              className={`central-danger-btn central-danger-btn-archive${client?.archived ? ' restore' : ''}`}
              onClick={async () => {
                const next = !client?.archived;
                await setClientArchived(client.id, next).catch(console.error);
                onArchiveClient?.(client.id, next);
              }}
            >
              {client?.archived ? '📂 Restaurar' : '📁 Arquivar'}
            </button>
          </div>

          {/* Excluir */}
          <div className="central-danger-row central-danger-row-delete">
            <div className="central-danger-row-info">
              <strong>Excluir cliente</strong>
              <span>Remove permanentemente o cliente e todos os dados associados.</span>
            </div>
            {confirmDel ? (
              <div className="central-danger-confirm">
                <span>Tem certeza?</span>
                <button
                  className="central-danger-confirm-yes"
                  onClick={async () => {
                    await removeClient(client.id).catch(console.error);
                    onDeleteClient?.(client.id);
                  }}
                >
                  Sim, excluir
                </button>
                <button className="central-danger-confirm-no" onClick={() => setConfirmDel(false)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                className="central-danger-btn central-danger-btn-delete"
                onClick={() => setConfirmDel(true)}
              >
                🗑 Excluir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
