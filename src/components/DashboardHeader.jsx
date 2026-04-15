import { MONTH_NAMES } from '../constants';

const ROLE_INFO = {
  'social-media': { label: 'Social Media', icon: '✏️' },
  'cliente':      { label: 'Cliente',       icon: '👁' },
};

function formatLastUpdated(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} às ${time}`;
}

export default function DashboardHeader({
  currentMonth,
  onMonthChange,
  userRole,
  onBack,
  clientName  = 'AGROMARI PETSHOP',
  clientHandle = '@agro.mari',
  clientEmoji  = '🐾',
  lastUpdated  = null,
}) {
  const role = ROLE_INFO[userRole];
  const updatedLabel = formatLastUpdated(lastUpdated);

  return (
    <div className="header">
      <div className="header-left">
        {onBack && (
          <button className="header-back-btn" onClick={onBack} title="Voltar à área de trabalho">
            ←
          </button>
        )}
        <div className="logo-circle">{clientEmoji}</div>
        <div>
          <h1>{clientName}</h1>
          <div className="header-sub">
            Dashboard de Conteúdo Instagram · {clientHandle}
            {updatedLabel && (
              <span className="header-last-updated"> · Última atualização: {updatedLabel}</span>
            )}
          </div>
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
      </div>
    </div>
  );
}
