import { useState } from 'react';
import './App.css';
import Dashboard from './Dashboard';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import WorkspacePage from './components/WorkspacePage';

export default function App() {
  const [screen,            setScreen]            = useState('landing'); // 'landing' | 'login' | 'app'
  const [userRole,          setUserRole]          = useState(null);
  const [activeClient,      setActiveClient]      = useState(null);
  const [googleAccessToken, setGoogleAccessToken] = useState(null);

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

  // 1) Landing page
  if (screen === 'landing') {
    return <LandingPage onLogin={() => setScreen('login')} />;
  }

  // 2) Tela de login
  if (screen === 'login' && !userRole) {
    return <LoginPage onSelectRole={handleSelectRole} onBack={() => setScreen('landing')} />;
  }

  // 2) Com perfil mas sem cliente → área de trabalho
  if (!activeClient) {
    return (
      <WorkspacePage
        userRole={userRole}
        onSelectClient={setActiveClient}
        onLogout={handleLogout}
      />
    );
  }

  // 3) Cliente selecionado → dashboard
  // onBack só existe para Social Media — cliente vai direto ao dashboard sem retorno à workspace
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
