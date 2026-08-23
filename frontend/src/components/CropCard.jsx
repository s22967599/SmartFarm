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

  return (
    <article className="crop-card">
      <header className="crop-card-header">
        <h3>{crop.crop_name}</h3>
        <span className="location">{crop.location}</span>
      </header>

      <div className="crop-card-settings">
        <p>Target: {crop.target_min}% – {crop.target_max}%</p>
        <p>Normal water: {crop.normal_water} L</p>
        {crop.notes && <p className="notes">Notes: {crop.notes}</p>}
      </div>

      <div className="crop-card-sensor">
        {latest_reading ? (
          <>
            <p><strong>Latest:</strong> {latest_reading.timestamp}</p>
            <p>Moisture: {latest_reading.soil_moisture}%</p>
            <p>Temperature: {latest_reading.temperature} °C</p>
            <p>Rainfall: {latest_reading.rainfall} mm</p>
            <p>Status: {latest_reading.sensor_status}</p>
          </>
        ) : (
          <p className="sensor-unavailable">Sensor data: N/A</p>
        )}
      </div>

      <div className={`condition-badge ${conditionClass(condition)}`}>
        <p><strong>Condition:</strong> {condition}</p>
        <p><strong>Recommended:</strong> {recommended_water}</p>
        {alerts.length > 0 && (
          <p><strong>Alert:</strong> {alerts.join(', ')}</p>
        )}
        <p><strong>Action:</strong> {action}</p>
      </div>

      <div className="crop-card-actions">
        <button type="button" onClick={() => onEdit(crop)}>Edit</button>
        <button type="button" className="btn-danger" onClick={() => onDelete(crop)}>Delete</button>
        <button type="button" onClick={() => onViewHistory(crop)}>View Sensor History</button>
      </div>
    </article>
  );
}

export function SensorHistoryModal({ crop, readings, onClose }) {
  const historyResults = readings.map((reading) => analyseCrop(crop, reading));

  return (
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
    </div>
  );
}
