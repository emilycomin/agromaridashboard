import { useState } from 'react';
import './App.css';
import Dashboard from './Dashboard';
import LoginPage from './LoginPage';

export default function App() {
  const [userRole, setUserRole] = useState(null);

  if (!userRole) {
    return <LoginPage onSelectRole={setUserRole} />;
  }

  return (
    <div>
      <Dashboard userRole={userRole} onLogout={() => setUserRole(null)} />
    </div>
  );
}
