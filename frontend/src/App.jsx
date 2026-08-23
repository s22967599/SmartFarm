import { useCallback, useEffect, useMemo, useState } from 'react';
import CropCardDisplay, { SensorHistoryModal } from './components/CropCard';
import CropForm from './components/CropForm';
import * as api from './services/api';
import {
  analyseCrop,
  calculateFarmStatus,
  getAvailableCropNames,
  getLatestReading,
  getReadingsForCrop,
} from './utils/analysis';
import './App.css';

function formatRefreshTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  const [crops, setCrops] = useState([]);
  const [readings, setReadings] = useState(null);
  const [hasSensorData, setHasSensorData] = useState(false);
  const [lastRefresh, setLastRefresh] = useState('Never');

  const [loading, setLoading] = useState(true);
  const [cropsError, setCropsError] = useState('');
  const [sensorError, setSensorError] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [historyCrop, setHistoryCrop] = useState(null);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadCrops = useCallback(async () => {
    const data = await api.fetchCrops();
    setCrops(data);
    return data;
  }, []);

  const loadReadings = useCallback(async (isRefresh = false) => {
    const data = await api.fetchReadings();
    setReadings(data);
    setHasSensorData(true);
    setLastRefresh(formatRefreshTime(new Date()));
    setSensorError('');
    return data;
  }, []);

  const initialLoad = useCallback(async () => {
    setLoading(true);
    setCropsError('');
    setSensorError('');

    try {
      const cropsResult = await api.fetchCrops();
      setCrops(cropsResult);
    } catch (err) {
      setCropsError(err.message);
      setLoading(false);
      return;
    }

    try {
      const readingsResult = await api.fetchReadings();
      setReadings(readingsResult);
      setHasSensorData(true);
      setLastRefresh(formatRefreshTime(new Date()));
    } catch (err) {
      setSensorError(err.message);
      setHasSensorData(false);
      setLastRefresh('Never');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  const dashboardResults = useMemo(() => {
    if (!hasSensorData || !readings) {
      return crops.map((crop) => analyseCrop(crop, null));
    }
    return crops.map((crop) => {
      const latest = getLatestReading(crop.crop_name, readings);
      return analyseCrop(crop, latest);
    });
  }, [crops, readings, hasSensorData]);

  const farmStatus = useMemo(
    () => calculateFarmStatus(dashboardResults, hasSensorData, crops.length),
    [dashboardResults, hasSensorData, crops.length]
  );

  const availableCropNames = useMemo(
    () => (hasSensorData && readings ? getAvailableCropNames(readings, crops) : []),
    [readings, crops, hasSensorData]
  );

  async function handleRefresh() {
    setRefreshing(true);
    setSensorError('');
    try {
      await loadReadings(true);
    } catch (err) {
      setSensorError(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCreate(payload) {
    setFormError('');
    try {
      await api.createCrop(payload);
      await loadCrops();
      setShowCreateForm(false);
      setSuccessMessage(`${payload.crop_name} crop card created.`);
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleEdit(payload) {
    setFormError('');
    try {
      await api.updateCrop(editingCrop.id, payload);
      await loadCrops();
      setEditingCrop(null);
      setSuccessMessage(`${editingCrop.crop_name} crop card updated.`);
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleDelete(crop) {
    if (!window.confirm(`Delete ${crop.crop_name} crop card?`)) return;
    setFormError('');
    try {
      await api.deleteCrop(crop.id);
      await loadCrops();
      setSuccessMessage(`${crop.crop_name} crop card deleted.`);
    } catch (err) {
      setFormError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="app">
        <p className="loading">Loading SmartFarm dashboard…</p>
      </div>
    );
  }

  if (cropsError) {
    return (
      <div className="app">
        <div className="banner banner-error">
          Failed to load crop cards: {cropsError}
        </div>
        <button type="button" onClick={initialLoad}>Retry</button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="dashboard-header">
        <h1>SmartFarm Crop Dashboard</h1>
        <div className="summary">
          <p><strong>Overall Status:</strong> <span className={`status-${farmStatus.replace(/\s+/g, '-').toLowerCase()}`}>{farmStatus}</span></p>
          <p><strong>Crop cards:</strong> {crops.length}</p>
          <p><strong>Last sensor refresh:</strong> {lastRefresh}</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            onClick={() => { setShowCreateForm(true); setFormError(''); setSuccessMessage(''); }}
            disabled={!hasSensorData || availableCropNames.length === 0}
          >
            Add Crop Card
          </button>
          <button type="button" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh Sensor Data'}
          </button>
        </div>
      </header>

      {sensorError && (
        <div className="banner banner-error">
          Sensor feed error: {sensorError}
        </div>
      )}

      {successMessage && (
        <div className="banner banner-success">{successMessage}</div>
      )}

      {formError && !showCreateForm && !editingCrop && (
        <div className="banner banner-error">{formError}</div>
      )}

      {showCreateForm && (
        <CropForm
          mode="create"
          availableCropNames={availableCropNames}
          onSubmit={handleCreate}
          onCancel={() => { setShowCreateForm(false); setFormError(''); }}
          error={formError}
        />
      )}

      {editingCrop && (
        <CropForm
          mode="edit"
          crop={editingCrop}
          availableCropNames={[]}
          onSubmit={handleEdit}
          onCancel={() => { setEditingCrop(null); setFormError(''); }}
          error={formError}
        />
      )}

      {crops.length === 0 ? (
        <div className="empty-state">
          <p>No crop cards yet. Add a crop card to get started.</p>
        </div>
      ) : (
        <section className="crop-grid">
          {dashboardResults.map((result) => (
            <CropCardDisplay
              key={result.crop.id}
              result={result}
              onEdit={(crop) => { setEditingCrop(crop); setFormError(''); setSuccessMessage(''); }}
              onDelete={handleDelete}
              onViewHistory={(crop) => setHistoryCrop(crop)}
            />
          ))}
        </section>
      )}

      {historyCrop && readings && (
        <SensorHistoryModal
          crop={historyCrop}
          readings={getReadingsForCrop(historyCrop.crop_name, readings)}
          onClose={() => setHistoryCrop(null)}
        />
      )}
    </div>
  );
}
