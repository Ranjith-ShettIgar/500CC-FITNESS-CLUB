const fs = require('fs');
const path = require('path');
const os = require('os');
const bcrypt = require('bcryptjs');

const isServerless = !!(process.env.VERCEL || process.env.AWS_EXECUTION_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL_ENV);

// GitHub Auto-Sync Configuration
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'Ranjith-ShettIgar';
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME || '500CC-FITNESS-CLUB';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_FILE_PATH = 'Database/gym_data.json';

let inMemoryCache = null;
let currentFileSha = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10000; // 10 seconds cache to avoid rate-limiting

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

/* ==========================================================================
   GITHUB AUTO-SYNC CLOUD PERSISTENCE (for Vercel)
   ========================================================================== */

async function fetchFromGitHub() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;

  const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': '500CC-Fitness-Club'
      }
    });

    if (!res.ok) {
      console.warn(`[GitHub Sync] Fetch returned status ${res.status}`);
      return null;
    }

    const data = await res.json();
    currentFileSha = data.sha;
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    const parsed = JSON.parse(content);
    inMemoryCache = parsed;
    lastFetchTime = Date.now();
    return parsed;
  } catch (err) {
    console.warn('[GitHub Sync] Fetch error:', err.message);
    return null;
  }
}

async function commitToGitHub(data) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return false;

  try {
    if (!currentFileSha) {
      await fetchFromGitHub();
    }

    const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${GITHUB_FILE_PATH}`;
    const base64Content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    const payload = {
      message: 'Sync gym database [skip ci]',
      content: base64Content,
      branch: GITHUB_BRANCH
    };
    if (currentFileSha) {
      payload.sha = currentFileSha;
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': '500CC-Fitness-Club',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      // Conflict retry with fresh SHA
      if (res.status === 409) {
        await fetchFromGitHub();
        if (currentFileSha) {
          payload.sha = currentFileSha;
          const retry = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': '500CC-Fitness-Club',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          if (retry.ok) {
            const rData = await retry.json();
            currentFileSha = rData.content?.sha || currentFileSha;
            lastFetchTime = Date.now();
            return true;
          }
        }
      }
      return false;
    }

    const resData = await res.json();
    currentFileSha = resData.content?.sha || currentFileSha;
    lastFetchTime = Date.now();
    console.log('[GitHub Sync] Successfully committed database update to GitHub repository.');
    return true;
  } catch (err) {
    console.warn('[GitHub Sync] Commit error:', err.message);
    return false;
  }
}

async function syncDBFromCloudIfNeeded() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return;

  const now = Date.now();
  if (!inMemoryCache || (now - lastFetchTime) > CACHE_TTL_MS) {
    await fetchFromGitHub();
  }
}

/* ==========================================================================
   DATABASE READ & WRITE API
   ========================================================================== */

// Read database
function readDB() {
  if (inMemoryCache) {
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

  // Trigger GitHub auto-sync in background if GITHUB_TOKEN is available
  if (process.env.GITHUB_TOKEN) {
    commitToGitHub(data).catch(err => {
      console.warn('[GitHub Sync] Background commit failed:', err.message);
    });
  }
}

async function writeDBAsync(data) {
  inMemoryCache = data;
  const targetFile = getDBFilePath();
  try {
    const dir = path.dirname(targetFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(targetFile, JSON.stringify(data, null, 2));
  } catch (err) {}

  if (process.env.GITHUB_TOKEN) {
    await commitToGitHub(data);
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
  writeDBAsync,
  fetchFromGitHub,
  commitToGitHub,
  syncDBFromCloudIfNeeded,
  computeMembershipStatus
};

