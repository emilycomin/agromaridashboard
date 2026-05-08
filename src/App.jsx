import { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './Dashboard';
import LandingPage from './LandingPage';
import AuthPage from './AuthPage';
import WorkspacePage from './components/WorkspacePage';
import CentralPage from './components/CentralPage';
import { loadClients, lookupToken, getClientById } from './services/db';
import { isSignInWithEmailLink, signInWithEmailLink, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';

export default function App() {
  const [resolving,          setResolving]          = useState(true);
  const [screen,             setScreen]             = useState('landing');
  const [userRole,           setUserRole]           = useState(null);
  const [activeClient,       setActiveClient]       = useState(null);
  const [googleAccessToken,  setGoogleAccessToken]  = useState(null);
  const [resetOobCode,       setResetOobCode]       = useState(null);
  const [firebaseUser,       setFirebaseUser]       = useState(null);
  const [clients,            setClients]            = useState([]);

  // ── Mantém firebaseUser sincronizado e carrega clientes ao autenticar ────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        loadClients(user.uid, user.email)
          .then(setClients)
          .catch(console.error);
      } else {
        setClients([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // ── Resolve token na URL ao montar ──────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    // 1. Redefinição de senha via link do Firebase
    if (params.get('mode') === 'resetPassword' && params.get('oobCode')) {
      setResetOobCode(params.get('oobCode'));
      window.history.replaceState({}, document.title, window.location.pathname);
      setScreen('login');
      setResolving(false);
      return;
    }

    // 2. Conclusão de sign-in por link de e-mail
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

    // 3. Acesso por token de cliente (link compartilhado)
    if (token) {
      lookupToken(token)
        .then(async (data) => {
          if (!data) return;
          const client = await getClientById(data.clientId);
          if (client) {
            setUserRole('cliente');
            setActiveClient(client);
            setScreen('app');
          }
        })
        .catch(() => {})
        .finally(() => setResolving(false));
      return;
    }

    // 4. Sem parâmetros de URL — verifica sessão Firebase existente
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        setUserRole('social-media');
        setScreen('app');
      }
      setResolving(false);
    });
  }, []);

  const handleSelectRole = (role, token = null) => {
    setUserRole(role);
    setGoogleAccessToken(token);
    setScreen('app');
  };

  const handleLogout = () => {
    signOut(auth).catch(console.error);
    setUserRole(null);
    setActiveClient(null);
    setGoogleAccessToken(null);
    setScreen('landing');
  };

  const handleSwitchAccount = () => {
    signOut(auth).catch(console.error);
    setUserRole(null);
    setActiveClient(null);
    setGoogleAccessToken(null);
    setScreen('login');
  };

  // ── Aguardando resolução de token ────────────────────────────────────────────
  if (resolving) {
    return (
      <>
        <style>{`@keyframes app-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', fontFamily: 'Inter, sans-serif',
          color: '#4338CA', fontSize: '16px', gap: '12px',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: '2px solid #EEF2FF', borderTopColor: '#4338CA',
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
    return (
      <AuthPage
        onSelectRole={handleSelectRole}
        onBack={() => setScreen('landing')}
        resetOobCode={resetOobCode}
        onResetDone={() => setResetOobCode(null)}
      />
    );
  }

  // ── Área de trabalho (cliente não selecionado) ────────────────────────────────
  if (!activeClient) {
    return (
      <WorkspacePage
        userRole={userRole}
        firebaseUser={firebaseUser}
        onSelectClient={setActiveClient}
        onLogout={handleLogout}
        onSwitchAccount={handleSwitchAccount}
      />
    );
  }

  // ── Central ──────────────────────────────────────────────────────────────────
  if (screen === 'central') {
    return (
      <CentralPage
        firebaseUser={firebaseUser}
        activeClient={activeClient}
        clients={clients}
        onSelectClient={setActiveClient}
        onClientUpdate={setActiveClient}
        onLogout={handleLogout}
        onSwitchAccount={handleSwitchAccount}
        onBack={() => setScreen('app')}
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
      firebaseUser={firebaseUser}
      clients={clients}
      onSelectClient={setActiveClient}
      onLogout={handleLogout}
      onSwitchAccount={handleSwitchAccount}
      onBack={isSM ? () => setActiveClient(null) : undefined}
      onOpenCentral={isSM ? () => setScreen('central') : undefined}
    />
  );
}
