# SmartFarm Crop IoT Dashboard

Full-stack crop dashboard for GreenFields Farm — React frontend, Express backend, SQLite crop cards, and read-only JSON sensor feed.

## URLs

| App | URL |
|-----|-----|
| Frontend (React + Vite) | http://localhost:5173 |
| Backend (Express API) | http://localhost:3001 |

## Installation and Run

### Backend

```bash
cd backend
npm install
npm start
```

The backend creates `smartfarm.db` on first start and seeds Tomato, Lettuce, and Wheat when the table is empty.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` requests to the backend.

## Database

SQLite stores **Crop Cards only** in `backend/smartfarm.db`.

- Table: `crops` (see `backend/db.js` for schema)
- Seeded on first run: Tomato, Lettuce, Wheat (Maize is created via the UI)
- To reset: delete `backend/smartfarm.db` and restart the backend

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/crops` | List all crop cards |
| GET | `/api/crops/:id` | Get one crop card |
| POST | `/api/crops` | Create a crop card |
| PUT | `/api/crops/:id` | Update allowed fields |
| DELETE | `/api/crops/:id` | Delete a crop card |
| GET | `/api/readings` | Read and validate sensor JSON |

All errors use JSON: `{ "error": "message" }`

## Data Ownership

| Data | Storage | Who changes it |
|------|---------|----------------|
| Crop Cards | SQLite | User via CRUD |
| Sensor readings | `backend/data/sensor-readings.json` | Read-only |
| Dashboard results | React state | Calculated automatically |

## Matching and Analysis

- **Join key:** exact, case-sensitive `crop_name`
- **Latest reading:** greatest `timestamp` per crop (string sort)
- **Condition priority:** Sensor Problem → Invalid Data → Dry → Healthy → Too Wet
- **Alerts:** High temperature (> 35 °C), Rain detected (≥ 5 mm) — Online readings only
- **Overall Farm Status:** No Crops → Sensor Feed Unavailable → Critical → Watch → Normal

Analysis logic lives in `frontend/src/utils/analysis.js`.

## AI Use (Assignment Requirement)

### Tool used
Cursor AI (Claude)

### Final sensor JSON prompt

```
Generate a valid JSON array containing exactly 20 simulated SmartFarm sensor readings.
Use these crop_name values exactly and create exactly 5 readings for each:
Tomato, Lettuce, Wheat, Maize.
Every object must contain exactly these fields:
crop_name, timestamp, soil_moisture, temperature, rainfall, sensor_status, notes.
Use timestamps in YYYY-MM-DDTHH:mm:ss format. Timestamps must be distinct
within each crop. The same timestamp may be used by different crops. Mix the
array order so the latest reading is not always the last object.
Use sensor_status only as Online, Offline or Faulty. Most numeric values must
be realistic: soil_moisture 0-100, temperature 0-50, rainfall 0-50. Include
exactly one structurally valid older reading with one deliberately out-of-range
numeric value. That invalid reading must not be the latest reading for its crop.
Make the latest readings produce these cases with the default Crop Card settings:
- latest Tomato: Online, Dry, temperature above 35 C;
- latest Lettuce: Online and Healthy;
- latest Wheat: Online, Too Wet, rainfall at least 5 mm;
- latest Maize: sensor_status Faulty.
Return only the JSON array. Do not use Markdown or explanation.
```

### Manual correction made
After AI generation, I verified and corrected the file until all checks passed. One correction was ensuring timestamps are distinct within each crop and that the intentional invalid Wheat reading (`soil_moisture: 120` at `2026-08-01T09:00:00`) is not the latest reading for Wheat — the latest Wheat reading is `2026-08-06T09:00:00` (Too Wet, rainfall 8 mm).

### Verification
- **crop_name matching:** Frontend uses strict equality (`===`) on `crop_name` — case-sensitive, exact match only.
- **Latest timestamp:** `getLatestReading()` filters by crop, then sorts with `localeCompare` on timestamp descending — works regardless of JSON array order.
- **Latest cases verified:** Tomato = Dry + High temperature; Lettuce = Healthy; Wheat = Too Wet + Rain detected; Maize = Sensor Problem (Faulty).

### Implementation decision
Used `better-sqlite3` for synchronous SQLite access on server startup (schema + seed in one place) and a Vite dev proxy so the frontend can call `/api` without extra CORS configuration during development.

## Project Limitation

Sensor data is a static local JSON file — there is no real-time IoT hardware, MQTT, or live streaming feed.

## Folder Structure

```
SmartFarm/
├── backend/
│   ├── server.js
│   ├── db.js
│   └── data/sensor-readings.json
└── frontend/
    └── src/
        ├── App.jsx
        ├── components/
        ├── services/api.js
        └── utils/analysis.js
```
