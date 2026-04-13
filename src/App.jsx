import { useState } from 'react';
import './App.css';
import Dashboard from './Dashboard';
import LoginPage from './LoginPage';
import WorkspacePage from './components/WorkspacePage';

export default function App() {
  const [userRole,     setUserRole]     = useState(null);
  const [activeClient, setActiveClient] = useState(null);

  const handleLogout = () => {
    setUserRole(null);
    setActiveClient(null);
  };

  // 1) Sem perfil → tela de login
  if (!userRole) {
    return <LoginPage onSelectRole={setUserRole} />;
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
  return (
    <Dashboard
      userRole={userRole}
      clientId={activeClient.id}
      clientMeta={activeClient}
      onLogout={handleLogout}
      onBack={() => setActiveClient(null)}
    />
  );
}
