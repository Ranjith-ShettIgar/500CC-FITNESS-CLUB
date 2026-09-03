const fs = require('fs');
const path = require('path');
const os = require('os');
const bcrypt = require('bcryptjs');

const isServerless = !!(process.env.VERCEL || process.env.AWS_EXECUTION_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL_ENV);

function getDBFilePath() {
  if (isServerless) {
    const tmpFile = path.join(os.tmpdir(), 'gym_data.json');
    if (!fs.existsSync(tmpFile)) {
      const defaultFile = path.join(__dirname, '../Database/gym_data.json');
      if (fs.existsSync(defaultFile)) {
        try {
          fs.copyFileSync(defaultFile, tmpFile);
        } catch (e) {}
      }
    }
    return tmpFile;
  }
  const defaultPath = path.join(__dirname, '../Database/gym_data.json');
  const dbDir = path.dirname(defaultPath);
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
    } catch (e) {}
  }
  return defaultPath;
}

// Initial Database Structure with Fallback Data
function getInitialData() {
  const defaultFile = path.join(__dirname, '../Database/gym_data.json');
  if (fs.existsSync(defaultFile)) {
    try {
      const raw = fs.readFileSync(defaultFile, 'utf8');
      return JSON.parse(raw);
    } catch (e) {}
  }

  const adminPasswordHash = bcrypt.hashSync('12345', 10);
  const todayStr = new Date().toISOString().split('T')[0];

  return {
    users: [
      {
        id: 'ADM-1001',
        full_name: 'Gym Administrator',
        username: 'Admin01',
        email: 'Admin01@500ccfitness.com',
        phone: '+91 8553483001',
        password_hash: adminPasswordHash,
        role: 'ADMIN',
        created_at: todayStr
      }
    ],
    memberships: [],
    payments: [],
    notifications: []
  };
}

let inMemoryCache = null;

// Read database
function readDB() {
  if (inMemoryCache && isServerless) {
    return inMemoryCache;
  }
  const targetFile = getDBFilePath();
  if (!fs.existsSync(targetFile)) {
    const initial = getInitialData();
    try {
      const dir = path.dirname(targetFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(targetFile, JSON.stringify(initial, null, 2));
    } catch (e) {}
    inMemoryCache = initial;
    return initial;
  }
  try {
    const raw = fs.readFileSync(targetFile, 'utf8');
    inMemoryCache = JSON.parse(raw);
    return inMemoryCache;
  } catch (e) {
    const initial = getInitialData();
    inMemoryCache = initial;
    return initial;
  }
}

// Write database
function writeDB(data) {
  inMemoryCache = data;
  const targetFile = getDBFilePath();
  try {
    const dir = path.dirname(targetFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(targetFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.warn('Database write warning (serverless mode fallback):', err.message);
  }
}

// Calculate dynamic status: ACTIVE (>2 days), EXPIRING_SOON (0 to 2 days), EXPIRED (<0 days)
function computeMembershipStatus(dueDateStr) {
  if (!dueDateStr) return 'INACTIVE';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { code: 'EXPIRED', label: 'EXPIRED', days: diffDays };
  } else if (diffDays <= 2) {
    return { code: 'EXPIRING_SOON', label: 'EXPIRING SOON', days: diffDays };
  } else {
    return { code: 'ACTIVE', label: 'ACTIVE', days: diffDays };
  }
}

module.exports = {
  readDB,
  writeDB,
  computeMembershipStatus
};
