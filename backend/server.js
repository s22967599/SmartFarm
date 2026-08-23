const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const {
  initDb,
  getAllCrops,
  getCropById,
  createCrop,
  updateCrop,
  deleteCrop,
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const SENSOR_FILE = path.join(__dirname, 'data', 'sensor-readings.json');
const ALLOWED_CROPS = ['Tomato', 'Lettuce', 'Wheat', 'Maize'];
const ALLOWED_STATUSES = ['Online', 'Offline', 'Faulty'];
const REQUIRED_FIELDS = [
  'crop_name',
  'timestamp',
  'soil_moisture',
  'temperature',
  'rainfall',
  'sensor_status',
  'notes',
];
const TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

app.use(cors());
app.use(express.json());

initDb();

function isValidTimestamp(ts) {
  if (typeof ts !== 'string' || !TIMESTAMP_REGEX.test(ts)) return false;
  const date = new Date(ts);
  return !Number.isNaN(date.getTime());
}

function validateSensorReadings(readings) {
  if (!Array.isArray(readings) || readings.length !== 20) return false;

  const cropCounts = { Tomato: 0, Lettuce: 0, Wheat: 0, Maize: 0 };
  const timestampsByCrop = { Tomato: new Set(), Lettuce: new Set(), Wheat: new Set(), Maize: new Set() };

  for (const reading of readings) {
    if (typeof reading !== 'object' || reading === null) return false;

    const keys = Object.keys(reading);
    if (keys.length !== 7) return false;
    for (const field of REQUIRED_FIELDS) {
      if (!keys.includes(field)) return false;
    }

    const { crop_name, timestamp, soil_moisture, temperature, rainfall, sensor_status, notes } = reading;

    if (typeof crop_name !== 'string' || !ALLOWED_CROPS.includes(crop_name)) return false;
    if (!isValidTimestamp(timestamp)) return false;
    if (typeof soil_moisture !== 'number' || Number.isNaN(soil_moisture)) return false;
    if (typeof temperature !== 'number' || Number.isNaN(temperature)) return false;
    if (typeof rainfall !== 'number' || Number.isNaN(rainfall)) return false;
    if (typeof sensor_status !== 'string' || !ALLOWED_STATUSES.includes(sensor_status)) return false;
    if (typeof notes !== 'string') return false;

    if (timestampsByCrop[crop_name].has(timestamp)) return false;
    timestampsByCrop[crop_name].add(timestamp);
    cropCounts[crop_name] += 1;
  }

  return ALLOWED_CROPS.every((crop) => cropCounts[crop] === 5);
}

function loadSensorReadings() {
  const raw = fs.readFileSync(SENSOR_FILE, 'utf8');
  const readings = JSON.parse(raw);
  if (!validateSensorReadings(readings)) {
    throw new Error('INVALID_SENSOR');
  }
  return readings;
}

function getValidCropNamesFromSensor() {
  const readings = loadSensorReadings();
  return [...new Set(readings.map((r) => r.crop_name))];
}

function validateCropPayload(body, isCreate) {
  const errors = [];

  if (isCreate) {
    if (typeof body.crop_name !== 'string' || !body.crop_name.trim()) {
      errors.push('crop_name is required');
    } else if (!ALLOWED_CROPS.includes(body.crop_name)) {
      errors.push('crop_name does not exist in sensor data');
    }
  }

  if (typeof body.location !== 'string' || body.location.trim().length < 1 || body.location.length > 100) {
    errors.push('location is required');
  }

  if (typeof body.target_min !== 'number' || Number.isNaN(body.target_min)) {
    errors.push('target_min must be a number');
  } else if (body.target_min < 0 || body.target_min > 100) {
    errors.push('target_min must be between 0 and 100');
  }

  if (typeof body.target_max !== 'number' || Number.isNaN(body.target_max)) {
    errors.push('target_max must be a number');
  } else if (body.target_max < 0 || body.target_max > 100) {
    errors.push('target_max must be between 0 and 100');
  }

  if (
    typeof body.target_min === 'number' &&
    typeof body.target_max === 'number' &&
    body.target_min >= body.target_max
  ) {
    errors.push('target_min must be less than target_max');
  }

  if (typeof body.normal_water !== 'number' || Number.isNaN(body.normal_water)) {
    errors.push('normal_water must be a number');
  } else if (body.normal_water <= 0 || body.normal_water > 10000) {
    errors.push('normal_water must be greater than 0 and at most 10000');
  }

  if (body.notes !== undefined && typeof body.notes !== 'string') {
    errors.push('notes must be a string');
  } else if (typeof body.notes === 'string' && body.notes.length > 500) {
    errors.push('notes must be at most 500 characters');
  }

  return errors;
}

app.get('/api/crops', (req, res) => {
  try {
    res.json(getAllCrops());
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/crops/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(404).json({ error: 'Crop card not found' });
    }
    const crop = getCropById(id);
    if (!crop) {
      return res.status(404).json({ error: 'Crop card not found' });
    }
    res.json(crop);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/crops', (req, res) => {
  try {
    const errors = validateCropPayload(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0] });
    }

    let validNames;
    try {
      validNames = getValidCropNamesFromSensor();
    } catch {
      return res.status(500).json({ error: 'Sensor data file is invalid' });
    }

    if (!validNames.includes(req.body.crop_name)) {
      return res.status(400).json({ error: 'crop_name does not exist in sensor data' });
    }

    const existing = getAllCrops().find((c) => c.crop_name === req.body.crop_name);
    if (existing) {
      return res.status(409).json({ error: 'crop_name already exists' });
    }

    const crop = createCrop({
      crop_name: req.body.crop_name,
      location: req.body.location.trim(),
      target_min: req.body.target_min,
      target_max: req.body.target_max,
      normal_water: req.body.normal_water,
      notes: req.body.notes ?? '',
    });
    res.status(201).json(crop);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'crop_name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/crops/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(404).json({ error: 'Crop card not found' });
    }

    const existing = getCropById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Crop card not found' });
    }

    if (req.body.crop_name !== undefined && req.body.crop_name !== existing.crop_name) {
      return res.status(400).json({ error: 'crop_name cannot be changed' });
    }

    const errors = validateCropPayload(req.body, false);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0] });
    }

    const crop = updateCrop(id, {
      location: req.body.location.trim(),
      target_min: req.body.target_min,
      target_max: req.body.target_max,
      normal_water: req.body.normal_water,
      notes: req.body.notes ?? '',
    });
    res.json(crop);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/crops/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(404).json({ error: 'Crop card not found' });
    }

    const deleted = deleteCrop(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Crop card not found' });
    }
    res.json({ deleted: true, id });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/readings', (req, res) => {
  try {
    const readings = loadSensorReadings();
    res.json(readings);
  } catch {
    res.status(500).json({ error: 'Sensor data file is invalid' });
  }
});

app.listen(PORT, () => {
  console.log(`SmartFarm backend running at http://localhost:${PORT}`);
});
