import { useState, useRef, useEffect } from 'react';
import { TextInput } from '@mantine/core';
import UserMenu from './UserMenu';
import './AppHeader.css';

const ROLE_INFO = {
  'social-media': { label: 'Social Media', icon: '✏️' },
  'cliente':      { label: 'Cliente',       icon: '👁' },
};

export default function AppHeader({
  title = 'Área de trabalho',
  subtitle,
  firebaseUser,
  onLogout,
  clients = [],
  onSelectClient,
  onBack,
  userRole,
}) {
  const [search,  setSearch]  = useState('');
  const [open,    setOpen]    = useState(false);
  const wrapRef = useRef(null);
  const role = ROLE_INFO[userRole];

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.handle?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (client) => {
    onSelectClient?.(client);
    setOpen(false);
    setSearch('');
  };

  const showSearch = userRole === 'social-media' && clients.length > 0 && onSelectClient;

  return (
    <header className="app-header">
      {/* ── Esquerda: brand + título ── */}
      <div className="app-header-left">
        {onBack && (
          <button className="app-header-back" onClick={onBack} title="Voltar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}
        <div className="app-brand">Flow<span>ly</span></div>
        <div className="app-header-divider" />
        <div className="app-header-title-block">
          <div className="app-header-title">{title}</div>
          {subtitle && <div className="app-header-subtitle">{subtitle}</div>}
        </div>
      </div>

      {/* ── Centro: busca com dropdown ── */}
      {showSearch && (
        <div className="app-header-center" ref={wrapRef}>
          <TextInput
            placeholder="Buscar cliente…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            radius="md"
            size="sm"
            leftSection={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            }
            rightSection={search && (
              <button className="app-search-clear" onClick={() => { setSearch(''); setOpen(false); }}>
                ✕
              </button>
            )}
            styles={{
              input: {
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
              },
              section: { color: 'rgba(255,255,255,0.6)' },
            }}
          />

          {open && (
            <div className="app-search-dropdown">
              {filtered.length === 0 ? (
                <div className="app-search-empty">Nenhum cliente encontrado</div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    className="app-search-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(c)}
                  >
                    <div
                      className="app-search-item-avatar"
                      style={{ background: `${c.color ?? '#6C63FF'}22`, border: `1.5px solid ${c.color ?? '#6C63FF'}44` }}
                    >
                      {c.emoji ?? '🏢'}
                    </div>
                    <div className="app-search-item-info">
                      <div className="app-search-item-name">{c.name}</div>
                      {(c.handle || c.description) && (
                        <div className="app-search-item-sub">{c.handle || c.description}</div>
                      )}
                    </div>
                    <svg className="app-search-item-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Direita: usuário + avatar ── */}
      <div className="app-header-right">
        {firebaseUser && (
          <div className="app-user-info">
            <div className="app-user-name">
              {firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário'}
            </div>
            <div className="app-user-role">
              {role ? `${role.icon} ${role.label}` : 'Perfil do Usuário'}
            </div>
          </div>
        )}
        {firebaseUser && <UserMenu user={firebaseUser} onLogout={onLogout} />}
      </div>
    </header>
  );
}
