import { MONTH_NAMES } from '../constants';

const ROLE_INFO = {
  'social-media': { label: 'Social Media', icon: '✏️' },
  'cliente':      { label: 'Cliente',       icon: '👁' },
};

export default function DashboardHeader({ currentMonth, onMonthChange, userRole, onLogout }) {
  const role = ROLE_INFO[userRole];

  return (
    <div className="header">
      <div className="header-left">
        <div className="logo-circle">🐾</div>
        <div>
          <h1>AGROMARI PETSHOP</h1>
          <div className="header-sub">Dashboard de Conteúdo Instagram · @agro.mari</div>
        </div>
      </div>
      <div className="header-filters">
        {role && (
          <div className="role-badge">
            {role.icon} {role.label}
          </div>
        )}
        <div className="filter-chip">
          📅
          <select value={currentMonth} onChange={(e) => onMonthChange(Number(e.target.value))}>
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx} value={idx}>{name} 2026</option>
            ))}
          </select>
        </div>
        {onLogout && (
          <button className="logout-btn" onClick={onLogout} title="Trocar perfil">
            ↩ Trocar perfil
          </button>
        )}
      </div>
    </div>
  );
}
