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

- **Tool used:** Cursor AI (Claude)
- **Sensor JSON prompt:** See Assignment Section 16 — generated 20 readings with 5 per crop, mixed order, one intentional invalid older Wheat reading, and latest cases for Dry Tomato, Healthy Lettuce, Too Wet Wheat, and Faulty Maize.
- **Correction made:** Verified timestamps are distinct within each crop and that the invalid Wheat reading (soil_moisture 120) is not the latest for Wheat.
- **Matching verified:** Frontend uses strict equality (`===`) on `crop_name`.
- **Latest timestamp verified:** Readings sorted with `localeCompare` on timestamp; array order is mixed.
- **Implementation decision:** Used `better-sqlite3` for synchronous SQLite access and Vite dev proxy to avoid CORS setup during development.

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
