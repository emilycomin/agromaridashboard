import { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './Dashboard';
import LandingPage from './LandingPage';
import AuthPage from './AuthPage';
import WorkspacePage from './components/WorkspacePage';
import { loadClients, lookupToken } from './services/db';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth } from './firebase';

export default function App() {
  const [resolving,          setResolving]          = useState(true);
  const [screen,             setScreen]             = useState('landing');
  const [userRole,           setUserRole]           = useState(null);
  const [activeClient,       setActiveClient]       = useState(null);
  const [googleAccessToken,  setGoogleAccessToken]  = useState(null);

  // ── Resolve token na URL ao montar ──────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    // 1. Conclusão de sign-in por link de e-mail
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let emailForSignIn = localStorage.getItem('emailForSignIn');
      if (!emailForSignIn) {
        emailForSignIn = window.prompt('Informe seu e-mail para concluir o acesso:');
      }
      if (emailForSignIn) {
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then(() => {
            localStorage.removeItem('emailForSignIn');
            window.history.replaceState({}, document.title, window.location.pathname);
            setUserRole('social-media');
            setScreen('app');
          })
          .catch(() => {})
          .finally(() => setResolving(false));
      } else {
        setResolving(false);
      }
      return;
    }

    // 2. Acesso por token de cliente (link compartilhado)
    if (!token) {
      setResolving(false);
      return;
    }

    lookupToken(token)
      .then(async (data) => {
        if (!data) return;
        const clients = await loadClients();
        const client = clients.find((c) => c.id === data.clientId);
        if (client) {
          setUserRole('cliente');
          setActiveClient(client);
          setScreen('app');
        }
      })
      .catch(() => {})
      .finally(() => setResolving(false));
  }, []);

  const handleSelectRole = (role, token = null) => {
    setUserRole(role);
    setGoogleAccessToken(token);
    setScreen('app');
  };

  const handleLogout = () => {
    setUserRole(null);
    setActiveClient(null);
    setGoogleAccessToken(null);
    setScreen('landing');
  };

  // ── Aguardando resolução de token ────────────────────────────────────────────
  if (resolving) {
    return (
      <>
        <style>{`@keyframes app-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', fontFamily: 'Inter, sans-serif',
          color: '#6C63FF', fontSize: '16px', gap: '12px',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: '2px solid #EEF0FF', borderTopColor: '#6C63FF',
            animation: 'app-spin 0.7s linear infinite',
          }} />
          Carregando…
        </div>
      </>
    );
  }

  // ── Landing page ─────────────────────────────────────────────────────────────
  if (screen === 'landing') {
    return <LandingPage onLogin={() => setScreen('login')} />;
  }

  // ── Tela de autenticação ──────────────────────────────────────────────────────
  if (screen === 'login' && !userRole) {
    return <AuthPage onSelectRole={handleSelectRole} onBack={() => setScreen('landing')} />;
  }

  // ── Área de trabalho (cliente não selecionado) ────────────────────────────────
  if (!activeClient) {
    return (
      <WorkspacePage
        userRole={userRole}
        onSelectClient={setActiveClient}
        onLogout={handleLogout}
      />
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────
  const isSM = userRole === 'social-media';
  return (
    <Dashboard
      userRole={userRole}
      clientId={activeClient.id}
      clientMeta={activeClient}
      googleAccessToken={googleAccessToken}
      onLogout={handleLogout}
      onBack={isSM ? () => setActiveClient(null) : undefined}
    />
  );
}
