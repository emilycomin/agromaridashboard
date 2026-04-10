import 'chart.js/auto';
import { Doughnut, Bar } from 'react-chartjs-2';

export default function ChartsSection({ pillarChartData, formatChartData }) {
  return (
    <div className="charts-grid">
      <div className="card">
        <div className="card-header">
          <h2>🎯 Posts por Pilar</h2>
        </div>
        <div className="card-body">
          <div className="chart-wrap">
            <Doughnut
              data={pillarChartData}
              options={{
                maintainAspectRatio: false,
                cutout: '58%',
                plugins: { legend: { position: 'right' } },
              }}
            />
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <h2>📊 Formatos Planejados</h2>
        </div>
        <div className="card-body">
          <div className="chart-wrap" style={{ height: '160px' }}>
            <Bar
              data={formatChartData}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
