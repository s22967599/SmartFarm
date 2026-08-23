const API_BASE = '/api';

async function handleResponse(response) {
  if (response.ok) {
    return response.json();
  }
  const data = await response.json().catch(() => ({}));
  throw new Error(data.error || 'Request failed');
}

export async function fetchCrops() {
  const response = await fetch(`${API_BASE}/crops`);
  return handleResponse(response);
}

export async function fetchCrop(id) {
  const response = await fetch(`${API_BASE}/crops/${id}`);
  return handleResponse(response);
}

export async function createCrop(crop) {
  const response = await fetch(`${API_BASE}/crops`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(crop),
  });
  return handleResponse(response);
}

export async function updateCrop(id, crop) {
  const response = await fetch(`${API_BASE}/crops/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(crop),
  });
  return handleResponse(response);
}

export async function deleteCrop(id) {
  const response = await fetch(`${API_BASE}/crops/${id}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
}

export async function fetchReadings() {
  const response = await fetch(`${API_BASE}/readings`);
  return handleResponse(response);
}
