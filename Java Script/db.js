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

// Initial Database Structure with Seed Data
function getInitialData() {
  const adminPasswordHash = bcrypt.hashSync('12345', 10);
  const clientPasswordHash = bcrypt.hashSync('12345', 10);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Expiring in 2 days date
  const expiringDate = new Date(today);
  expiringDate.setDate(expiringDate.getDate() + 2);
  const expiringStr = expiringDate.toISOString().split('T')[0];

  // Active date (30 days out)
  const activeDate = new Date(today);
  activeDate.setDate(activeDate.getDate() + 30);
  const activeStr = activeDate.toISOString().split('T')[0];

  // Expired date (-5 days ago)
  const expiredDate = new Date(today);
  expiredDate.setDate(expiredDate.getDate() - 5);
  const expiredStr = expiredDate.toISOString().split('T')[0];

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
      },
      {
        id: 'CLT-2001',
        full_name: 'Rahul Sharma',
        email: 'rahul.sharma@example.com',
        phone: '+91 98765 11111',
        password_hash: clientPasswordHash,
        dob: '1995-04-12',
        gender: 'Male',
        address: '45 Green Park, New Delhi',
        emergency_contact: '+91 98765 99999 (Father)',
        role: 'CLIENT',
        created_at: '2026-08-01'
      },
      {
        id: 'CLT-2002',
        full_name: 'Priya Patel',
        email: 'priya.patel@example.com',
        phone: '+91 98765 22222',
        password_hash: clientPasswordHash,
        dob: '1998-09-20',
        gender: 'Female',
        address: '12 Sector 15, Gurgaon',
        emergency_contact: '+91 98765 88888 (Spouse)',
        role: 'CLIENT',
        created_at: '2026-07-15'
      },
      {
        id: 'CLT-2003',
        full_name: 'Vikram Singh',
        email: 'vikram.singh@example.com',
        phone: '+91 98765 33333',
        password_hash: clientPasswordHash,
        dob: '1992-11-05',
        gender: 'Male',
        address: '88 MG Road, Bengaluru',
        emergency_contact: '+91 98765 77777 (Brother)',
        role: 'CLIENT',
        created_at: '2026-06-10'
      }
    ],
    memberships: [
      {
        id: 'MEM-2001',
        client_id: 'CLT-2001',
        plan_name: 'Monthly Pass',
        start_date: '2026-08-01',
        due_date: activeStr,
        last_renewal_date: '2026-08-01',
        amount_paid: 1500
      },
      {
        id: 'MEM-2002',
        client_id: 'CLT-2002',
        plan_name: 'Quarterly Pass',
        start_date: '2026-06-01',
        due_date: expiringStr, // Expiring in 2 days
        last_renewal_date: '2026-06-01',
        amount_paid: 4000
      },
      {
        id: 'MEM-2003',
        client_id: 'CLT-2003',
        plan_name: 'Monthly Pass',
        start_date: '2026-07-01',
        due_date: expiredStr, // Expired
        last_renewal_date: '2026-07-01',
        amount_paid: 1500
      }
    ],
    payments: [
      {
        id: 'PAY-3001',
        invoice_number: 'INV-2026-1001',
        client_id: 'CLT-2001',
        membership_id: 'MEM-2001',
        amount: 1500,
        plan_name: 'Monthly Pass',
        payment_date: '2026-08-01',
        payment_method: 'Cash',
        due_date: activeStr,
        recorded_by_admin: 'ADM-1001'
      },
      {
        id: 'PAY-3002',
        invoice_number: 'INV-2026-1002',
        client_id: 'CLT-2002',
        membership_id: 'MEM-2002',
        amount: 4000,
        plan_name: 'Quarterly Pass',
        payment_date: '2026-06-01',
        payment_method: 'UPI / QR Code',
        due_date: expiringStr,
        recorded_by_admin: 'ADM-1001'
      },
      {
        id: 'PAY-3003',
        invoice_number: 'INV-2026-1003',
        client_id: 'CLT-2003',
        membership_id: 'MEM-2003',
        amount: 1500,
        plan_name: 'Monthly Pass',
        payment_date: '2026-07-01',
        payment_method: 'Cash',
        due_date: expiredStr,
        recorded_by_admin: 'ADM-1001'
      }
    ],
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
