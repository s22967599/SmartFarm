import { createPortal } from 'react-dom';
import { analyseCrop } from '../utils/analysis';

function conditionClass(condition) {
  switch (condition) {
    case 'Healthy':
      return 'condition-healthy';
    case 'Dry':
      return 'condition-dry';
    case 'Too Wet':
      return 'condition-wet';
    case 'Sensor Problem':
      return 'condition-sensor';
    case 'Invalid Data':
      return 'condition-invalid';
    default:
      return 'condition-na';
  }
}

export default function CropCardDisplay({ result, onEdit, onDelete, onViewHistory }) {
  const { crop, latest_reading, condition, recommended_water, alerts, action } = result;
  const statusClass = latest_reading
    ? latest_reading.sensor_status.toLowerCase()
    : '';

  return (
    <article className="crop-card">
      <header className="crop-card-header">
        <div className="crop-card-title">
          <h3>{crop.crop_name}</h3>
          <span className="location">{crop.location || '—'}</span>
        </div>
        <span className={`sensor-status-pill ${statusClass || 'na'}`}>
          {latest_reading ? latest_reading.sensor_status : 'N/A'}
        </span>
      </header>

      <div className="crop-card-body">
        <section className="crop-card-settings">
          <p className="section-label">Card settings</p>
          <dl className="info-list">
            <div>
              <dt>Target</dt>
              <dd>{crop.target_min}% – {crop.target_max}%</dd>
            </div>
            <div>
              <dt>Normal water</dt>
              <dd>{crop.normal_water} L</dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd className={crop.notes ? '' : 'empty-value'}>{crop.notes || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="crop-card-sensor">
          <p className="section-label">Latest sensor</p>
          {latest_reading ? (
            <>
              <p className="timestamp-line">
                <span>Latest</span>
                <strong>{latest_reading.timestamp}</strong>
              </p>
              <div className="metric-grid">
                <div className="metric">
                  <span>Moisture</span>
                  <strong>{latest_reading.soil_moisture}%</strong>
                </div>
                <div className="metric">
                  <span>Temperature</span>
                  <strong>{latest_reading.temperature} °C</strong>
                </div>
                <div className="metric">
                  <span>Rainfall</span>
                  <strong>{latest_reading.rainfall} mm</strong>
                </div>
                <div className="metric">
                  <span>Status</span>
                  <strong>{latest_reading.sensor_status}</strong>
                </div>
              </div>
            </>
          ) : (
            <div className="sensor-unavailable">Sensor data: N/A</div>
          )}
        </section>

        <section className={`condition-badge ${conditionClass(condition)}`}>
          <p className="condition-title">{condition}</p>
          <dl className="info-list compact">
            <div>
              <dt>Recommended</dt>
              <dd>{recommended_water}</dd>
            </div>
            <div>
              <dt>Alert</dt>
              <dd className={alerts.length ? '' : 'empty-value'}>
                {alerts.length > 0 ? alerts.join(', ') : '—'}
              </dd>
            </div>
            <div>
              <dt>Action</dt>
              <dd>{action}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="crop-card-actions">
        <button type="button" onClick={() => onEdit(crop)}>Edit</button>
        <button type="button" className="btn-danger" onClick={() => onDelete(crop)}>Delete</button>
        <button type="button" className="btn-ghost" onClick={() => onViewHistory(crop)}>View Sensor History</button>
      </div>
    </article>
  );
}

export function SensorHistoryModal({ crop, readings, onClose }) {
  const historyResults = readings.map((reading) => analyseCrop(crop, reading));

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Sensor History — {crop.crop_name}</h2>
          <button type="button" className="btn-close" onClick={onClose}>×</button>
        </header>
        <div className="history-list">
          {historyResults.map((result) => (
            <div key={result.latest_reading.timestamp} className="history-item">
              <p><strong>{result.latest_reading.timestamp}</strong></p>
              <p>Moisture: {result.latest_reading.soil_moisture}% | Temp: {result.latest_reading.temperature} °C | Rain: {result.latest_reading.rainfall} mm</p>
              <p>Status: {result.latest_reading.sensor_status}</p>
              <p>Condition: {result.condition} | Recommended: {result.recommended_water}</p>
              {result.alerts.length > 0 && <p>Alerts: {result.alerts.join(', ')}</p>}
              <p>Action: {result.action}</p>
              {result.latest_reading.notes && <p className="notes">{result.latest_reading.notes}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
