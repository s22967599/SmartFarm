const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'smartfarm.db');
const db = new Database(dbPath);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS crops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crop_name TEXT NOT NULL UNIQUE
    CHECK (crop_name IN ('Tomato','Lettuce','Wheat','Maize')),
  location TEXT NOT NULL,
  target_min REAL NOT NULL CHECK (target_min >= 0 AND target_min <= 100),
  target_max REAL NOT NULL CHECK (target_max >= 0 AND target_max <= 100),
  normal_water REAL NOT NULL CHECK (normal_water > 0 AND normal_water <= 10000),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (target_min < target_max)
);
`;

const SEED_CROPS = [
  { crop_name: 'Tomato', location: 'Greenhouse A', target_min: 55, target_max: 75, normal_water: 500, notes: '' },
  { crop_name: 'Lettuce', location: 'Greenhouse B', target_min: 60, target_max: 80, normal_water: 400, notes: '' },
  { crop_name: 'Wheat', location: 'North Field', target_min: 35, target_max: 55, normal_water: 300, notes: '' },
];

function initDb() {
  db.exec(SCHEMA);

  const count = db.prepare('SELECT COUNT(*) AS count FROM crops').get().count;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO crops (crop_name, location, target_min, target_max, normal_water, notes)
      VALUES (@crop_name, @location, @target_min, @target_max, @normal_water, @notes)
    `);
    const insertMany = db.transaction((crops) => {
      for (const crop of crops) insert.run(crop);
    });
    insertMany(SEED_CROPS);
  }
}

function getAllCrops() {
  return db.prepare('SELECT * FROM crops ORDER BY id').all();
}

function getCropById(id) {
  return db.prepare('SELECT * FROM crops WHERE id = ?').get(id);
}

function createCrop(crop) {
  const stmt = db.prepare(`
    INSERT INTO crops (crop_name, location, target_min, target_max, normal_water, notes)
    VALUES (@crop_name, @location, @target_min, @target_max, @normal_water, @notes)
  `);
  const result = stmt.run({
    crop_name: crop.crop_name,
    location: crop.location,
    target_min: crop.target_min,
    target_max: crop.target_max,
    normal_water: crop.normal_water,
    notes: crop.notes ?? '',
  });
  return getCropById(result.lastInsertRowid);
}

function updateCrop(id, crop) {
  const stmt = db.prepare(`
    UPDATE crops
    SET location = @location,
        target_min = @target_min,
        target_max = @target_max,
        normal_water = @normal_water,
        notes = @notes
    WHERE id = @id
  `);
  stmt.run({
    id,
    location: crop.location,
    target_min: crop.target_min,
    target_max: crop.target_max,
    normal_water: crop.normal_water,
    notes: crop.notes ?? '',
  });
  return getCropById(id);
}

function deleteCrop(id) {
  const result = db.prepare('DELETE FROM crops WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = {
  initDb,
  getAllCrops,
  getCropById,
  createCrop,
  updateCrop,
  deleteCrop,
};
