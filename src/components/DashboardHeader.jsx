import { MONTH_NAMES } from '../constants';

export default function DashboardHeader({ currentMonth, onMonthChange }) {
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
