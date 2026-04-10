import { MONTH_NAMES, CURRENT_YEAR } from '../constants';

export default function MonthSelector({ selectedMonths, onToggle, onSelectAll, onClearAll }) {
  const allSelected = selectedMonths.length === 12;

  return (
    <div className="month-selector-wrap">
      <div className="month-selector-label">
        📅 Filtrar por mês
      </div>
      <div className="month-selector-pills">
        {MONTH_NAMES.map((name, idx) => (
          <button
            key={idx}
            className={`month-pill ${selectedMonths.includes(idx) ? 'month-pill-active' : ''}`}
            onClick={() => onToggle(idx)}
            title={`${name} ${CURRENT_YEAR}`}
          >
            {name.slice(0, 3)}
          </button>
        ))}
      </div>
      <div className="month-selector-actions">
        <button className="month-action-btn" onClick={onSelectAll} disabled={allSelected}>
          Todos
        </button>
        <button
          className="month-action-btn"
          onClick={onClearAll}
          disabled={selectedMonths.length <= 1}
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
