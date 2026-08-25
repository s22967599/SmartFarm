import { useEffect, useState } from 'react';

const EMPTY_FORM = {
  crop_name: '',
  location: '',
  target_min: '',
  target_max: '',
  normal_water: '',
  notes: '',
};

export default function CropForm({
  mode,
  crop,
  availableCropNames,
  onSubmit,
  onCancel,
  error,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (mode === 'edit' && crop) {
      setForm({
        crop_name: crop.crop_name,
        location: crop.location,
        target_min: crop.target_min,
        target_max: crop.target_max,
        normal_water: crop.normal_water,
        notes: crop.notes || '',
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        crop_name: availableCropNames[0] || '',
      });
    }
    setValidationError('');
  }, [mode, crop, availableCropNames]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    if (mode === 'create' && !form.crop_name) {
      return 'Please select a crop name';
    }
    if (!form.location.trim() || form.location.length > 100) {
      return 'Location is required (1–100 characters)';
    }

    const targetMin = Number(form.target_min);
    const targetMax = Number(form.target_max);
    const normalWater = Number(form.normal_water);

    if (Number.isNaN(targetMin) || targetMin < 0 || targetMin > 100) {
      return 'Target min must be a number between 0 and 100';
    }
    if (Number.isNaN(targetMax) || targetMax < 0 || targetMax > 100) {
      return 'Target max must be a number between 0 and 100';
    }
    if (targetMin >= targetMax) {
      return 'Target min must be less than target max';
    }
    if (Number.isNaN(normalWater) || normalWater <= 0 || normalWater > 10000) {
      return 'Normal water must be greater than 0 and at most 10000';
    }
    if (form.notes.length > 500) {
      return 'Notes must be at most 500 characters';
    }
    return '';
  }

  function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setValidationError(err);
      return;
    }

    const payload = {
      location: form.location.trim(),
      target_min: Number(form.target_min),
      target_max: Number(form.target_max),
      normal_water: Number(form.normal_water),
      notes: form.notes.trim(),
    };

    if (mode === 'create') {
      payload.crop_name = form.crop_name;
    } else {
      payload.crop_name = crop.crop_name;
    }

    onSubmit(payload);
  }

  return (
    <form className="crop-form" onSubmit={handleSubmit}>
      <h3>{mode === 'create' ? 'Add Crop Card' : `Edit ${crop?.crop_name}`}</h3>

      {(validationError || error) && (
        <div className="banner banner-error">{validationError || error}</div>
      )}

      <label>
        Crop name
        {mode === 'create' ? (
          <select name="crop_name" value={form.crop_name} onChange={handleChange} required>
            {availableCropNames.length === 0 ? (
              <option value="">No crops available</option>
            ) : (
              availableCropNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))
            )}
          </select>
        ) : (
          <input type="text" value={form.crop_name} readOnly className="readonly" />
        )}
      </label>

      <label>
        Location
        <input name="location" value={form.location} onChange={handleChange} required />
      </label>

      <label>
        Target min (%)
        <input name="target_min" type="number" value={form.target_min} onChange={handleChange} required />
      </label>

      <label>
        Target max (%)
        <input name="target_max" type="number" value={form.target_max} onChange={handleChange} required />
      </label>

      <label>
        Normal water (L)
        <input name="normal_water" type="number" value={form.normal_water} onChange={handleChange} required />
      </label>

      <label>
        Notes
        <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} />
      </label>

      <div className="form-actions">
        <button type="submit">{mode === 'create' ? 'Create' : 'Save'}</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
