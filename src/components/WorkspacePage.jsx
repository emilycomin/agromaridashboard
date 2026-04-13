import { useState, useEffect } from 'react';
import { loadClients, persistClient } from '../services/db';
import './WorkspacePage.css';

const PALETTE = [
  '#2E7D32', '#1565C0', '#E65100', '#6A1B9A',
  '#C2185B', '#00838F', '#F57F17', '#4E342E',
];

const EMOJI_SUGGESTIONS = ['🏢','💄','🏠','🍕','🐾','💪','📸','👗','🌿','🎨','🚗','💅'];

const AGROMARI_DEFAULT = {
  id: 'agromari',
  name: 'AGROMARI PETSHOP',
  handle: '@agro.mari',
  emoji: '🐾',
  color: '#2E7D32',
  description: 'Petshop e grooming',
  createdAt: new Date().toISOString(),
};

const ROLE_INFO = {
  'social-media': { label: 'Social Media', icon: '✏️' },
  'cliente':      { label: 'Cliente',       icon: '👁' },
};

const EMPTY_FORM = { name: '', handle: '', emoji: '🏢', color: PALETTE[1], description: '' };

export default function WorkspacePage({ userRole, onSelectClient, onLogout }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isSM = userRole === 'social-media';
  const role = ROLE_INFO[userRole];

  /* ── Carrega clientes do Firestore ── */
  useEffect(() => {
    loadClients()
      .then((cs) => {
        if (cs.length === 0) {
          // Semeia o cliente padrão Agromari na primeira vez
          return persistClient(AGROMARI_DEFAULT).then(() => setClients([AGROMARI_DEFAULT]));
        }
        // Ordena: Agromari primeiro, depois por ordem de criação
        const sorted = [...cs].sort((a, b) => {
          if (a.id === 'agromari') return -1;
          if (b.id === 'agromari') return 1;
          return new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0);
        });
        setClients(sorted);
      })
      .catch(() => setClients([AGROMARI_DEFAULT]))
      .finally(() => setLoading(false));
  }, []);

  /* ── Adiciona novo cliente ── */
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const id = `client_${Date.now()}`;
    const newClient = {
      id,
      name: form.name.trim().toUpperCase(),
      handle: form.handle.trim() || '',
      emoji: form.emoji?.trim() || '🏢',
      color: form.color,
      description: form.description.trim(),
      createdAt: new Date().toISOString(),
    };
    await persistClient(newClient).catch(console.error);
    setClients((prev) => [...prev, newClient]);
    setShowModal(false);
    setSaving(false);
    setForm(EMPTY_FORM);
  };

  const closeModal = () => { setShowModal(false); setForm(EMPTY_FORM); };

  /* ── Render ── */
  return (
    <div className="ws-page">

      {/* ── Header ── */}
      <div className="ws-header">
        <div className="ws-header-left">
          <div className="ws-logo">🐾</div>
          <div>
            <div className="ws-header-title">Área de Trabalho</div>
            <div className="ws-header-sub">Agromari Social Media Dashboard</div>
          </div>
        </div>
        <div className="ws-header-right">
          {role && <div className="role-badge">{role.icon} {role.label}</div>}
          <button className="logout-btn" onClick={onLogout}>↩ Trocar perfil</button>
        </div>
      </div>

      {/* ── Corpo ── */}
      <div className="ws-body">
        <div className="ws-section-header">
          <div>
            <h2 className="ws-section-title">Seus Clientes</h2>
            <p className="ws-section-sub">
              {loading
                ? 'Carregando…'
                : `${clients.length} cliente${clients.length !== 1 ? 's' : ''} cadastrado${clients.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {isSM && (
            <button className="ws-add-btn" onClick={() => setShowModal(true)}>
              + Adicionar Cliente
            </button>
          )}
        </div>

        {loading ? (
          <div className="ws-loading">
            <div className="ws-spinner" />
            Carregando clientes…
          </div>
        ) : (
          <div className="ws-grid">
            {clients.map((c) => (
              <button
                key={c.id}
                className="ws-card"
                onClick={() => onSelectClient(c)}
                style={{ '--accent': c.color }}
              >
                <div className="ws-card-accent" style={{ background: c.color }} />
                <div className="ws-card-content">
                  <div className="ws-card-avatar" style={{ background: `${c.color}22`, border: `2px solid ${c.color}44` }}>
                    <span>{c.emoji}</span>
                  </div>
                  <div className="ws-card-info">
                    <div className="ws-card-name">{c.name}</div>
                    {c.handle && <div className="ws-card-handle">{c.handle}</div>}
                    {c.description && <div className="ws-card-desc">{c.description}</div>}
                  </div>
                </div>
                <div className="ws-card-footer" style={{ color: c.color }}>
                  Acessar painel →
                </div>
              </button>
            ))}

            {isSM && (
              <button className="ws-card ws-card-add" onClick={() => setShowModal(true)}>
                <div className="ws-card-add-icon">+</div>
                <div className="ws-card-add-label">Adicionar<br />Cliente</div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Novo Cliente ── */}
      {showModal && (
        <div className="ws-modal-backdrop" onClick={closeModal}>
          <div className="ws-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ws-modal-header">
              <h3>Novo Cliente</h3>
              <button className="ws-modal-close" onClick={closeModal}>✕</button>
            </div>

            <form className="ws-modal-form" onSubmit={handleAdd}>
              <label className="ws-field">
                <span>Nome do cliente <span className="ws-req">*</span></span>
                <input
                  type="text"
                  placeholder="Ex: Beauty Studio"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  autoFocus
                />
              </label>

              <label className="ws-field">
                <span>Perfil Instagram</span>
                <input
                  type="text"
                  placeholder="@perfil"
                  value={form.handle}
                  onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))}
                />
              </label>

              <label className="ws-field">
                <span>Descrição</span>
                <input
                  type="text"
                  placeholder="Ex: Moda feminina, e-commerce"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>

              <div className="ws-modal-row">
                <label className="ws-field" style={{ flex: 1 }}>
                  <span>Ícone</span>
                  <input
                    type="text"
                    placeholder="🏢"
                    value={form.emoji}
                    maxLength={4}
                    onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                    className="ws-emoji-input"
                  />
                </label>
                <div className="ws-field" style={{ flex: 3 }}>
                  <span>Sugestões</span>
                  <div className="ws-emoji-grid">
                    {EMOJI_SUGGESTIONS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        className={`ws-emoji-btn ${form.emoji === em ? 'selected' : ''}`}
                        onClick={() => setForm((f) => ({ ...f, emoji: em }))}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ws-field">
                <span>Cor de destaque</span>
                <div className="ws-palette">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`ws-color-dot ${form.color === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="ws-preview">
                <div className="ws-preview-label">Pré-visualização</div>
                <div className="ws-preview-card" style={{ borderTopColor: form.color }}>
                  <div className="ws-preview-avatar" style={{ background: `${form.color}22` }}>
                    {form.emoji || '🏢'}
                  </div>
                  <div>
                    <div className="ws-preview-name">{form.name.toUpperCase() || 'NOME DO CLIENTE'}</div>
                    <div className="ws-preview-handle">{form.handle || '@perfil'}</div>
                  </div>
                </div>
              </div>

              <div className="ws-modal-actions">
                <button type="button" className="ws-btn-cancel" onClick={closeModal}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="ws-btn-submit"
                  style={{ background: form.color }}
                  disabled={saving || !form.name.trim()}
                >
                  {saving ? 'Criando…' : '✓ Criar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
