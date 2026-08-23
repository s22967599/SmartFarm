const VALID_STATUSES = ['Online', 'Offline', 'Faulty'];

export function getAvailableCropNames(readings, crops) {
  if (!readings || readings.length === 0) return [];
  const used = new Set(crops.map((c) => c.crop_name));
  const names = [...new Set(readings.map((r) => r.crop_name))];
  return names.filter((name) => !used.has(name));
}

export function getLatestReading(cropName, readings) {
  if (!readings || readings.length === 0) return null;
  const matches = readings.filter((r) => r.crop_name === cropName);
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
}

function getInvalidField(reading) {
  if (reading.soil_moisture < 0 || reading.soil_moisture > 100) return 'soil_moisture';
  if (reading.temperature < 0 || reading.temperature > 50) return 'temperature';
  if (reading.rainfall < 0 || reading.rainfall > 50) return 'rainfall';
  return null;
}

export function analyseCrop(cropCard, reading) {
  const base = {
    crop: {
      id: cropCard.id,
      crop_name: cropCard.crop_name,
      location: cropCard.location,
      target_min: cropCard.target_min,
      target_max: cropCard.target_max,
      normal_water: cropCard.normal_water,
      notes: cropCard.notes,
    },
    latest_reading: null,
    condition: 'N/A',
    recommended_water: 'N/A',
    alerts: [],
    action: 'N/A',
    invalid_field: null,
  };

  if (!reading) {
    return base;
  }

  base.latest_reading = {
    timestamp: reading.timestamp,
    soil_moisture: reading.soil_moisture,
    temperature: reading.temperature,
    rainfall: reading.rainfall,
    sensor_status: reading.sensor_status,
    notes: reading.notes,
  };

  if (reading.sensor_status === 'Offline' || reading.sensor_status === 'Faulty') {
    return {
      ...base,
      condition: 'Sensor Problem',
      recommended_water: 'N/A',
      alerts: ['Check sensor'],
      action: 'Check sensor',
    };
  }

  const invalidField = getInvalidField(reading);
  if (invalidField) {
    return {
      ...base,
      condition: 'Invalid Data',
      recommended_water: 'N/A',
      alerts: [`Invalid ${invalidField.replace('_', ' ')}`],
      action: 'Check reading',
      invalid_field: invalidField,
    };
  }

  const { target_min, target_max, normal_water } = cropCard;
  const { soil_moisture, temperature, rainfall } = reading;

  let condition;
  let recommended_water;
  let action;
  const alerts = [];

  if (soil_moisture < target_min) {
    condition = 'Dry';
    recommended_water = `${normal_water} L`;
    action = 'Water crop';
  } else if (soil_moisture <= target_max) {
    condition = 'Healthy';
    recommended_water = '0 L';
    action = 'Monitor';
  } else {
    condition = 'Too Wet';
    recommended_water = '0 L';
    action = 'Stop watering';
  }

  if (temperature > 35) {
    alerts.push('High temperature');
  }
  if (rainfall >= 5) {
    alerts.push('Rain detected');
  }

  return {
    ...base,
    condition,
    recommended_water,
    alerts,
    action,
  };
}

export function calculateFarmStatus(results, hasSensorData, cropCount) {
  if (cropCount === 0) {
    return 'No Crops';
  }
  if (!hasSensorData) {
    return 'Sensor Feed Unavailable';
  }

  const hasCritical = results.some(
    (r) => r.condition === 'Sensor Problem' || r.condition === 'Invalid Data'
  );
  if (hasCritical) return 'Critical';

  const hasWatch = results.some(
    (r) =>
      r.condition === 'Dry' ||
      r.condition === 'Too Wet' ||
      r.alerts.includes('High temperature')
  );
  if (hasWatch) return 'Watch';

  return 'Normal';
}

export function getReadingsForCrop(cropName, readings) {
  if (!readings) return [];
  return readings
    .filter((r) => r.crop_name === cropName)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
