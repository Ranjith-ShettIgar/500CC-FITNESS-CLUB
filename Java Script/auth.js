const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { readDB, writeDB } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_gym_key_2026_fitness';

// Authenticate middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Role Middleware
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Access denied. Requires ${role} privileges.` });
    }
    next();
  };
}

// Client Register Handler
function registerClient(clientData) {
  const db = readDB();

  // Check email uniqueness
  const existing = db.users.find(u => u.email.toLowerCase() === clientData.email.toLowerCase());
  if (existing) {
    throw new Error('Email is already registered');
  }

  const clientId = `CLT-${Date.now().toString().slice(-4)}`;
  const passwordHash = bcrypt.hashSync(clientData.password, 10);
  const todayStr = new Date().toISOString().split('T')[0];

  const newUser = {
    id: clientId,
    full_name: clientData.full_name,
    email: clientData.email.toLowerCase(),
    phone: clientData.phone || '',
    password_hash: passwordHash,
    dob: clientData.dob || '',
    gender: clientData.gender || 'Unspecified',
    address: clientData.address || '',
    emergency_contact: clientData.emergency_contact || '',
    role: 'CLIENT',
    created_at: todayStr
  };

  db.users.push(newUser);

  // Initialize un-activated membership record
  const newMembership = {
    id: `MEM-${Date.now().toString().slice(-4)}`,
    client_id: clientId,
    plan_name: 'Pending Activation',
    start_date: todayStr,
    due_date: todayStr, // Expired by default until admin records first payment
    last_renewal_date: 'N/A',
    amount_paid: 0
  };

  db.memberships.push(newMembership);
  writeDB(db);

  const token = jwt.sign({ id: newUser.id, role: newUser.role, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });

  return { token, user: newUser };
}

// Login Handler (Supports Client & Admin)
function loginUser(credential, password, expectedRole) {
  const db = readDB();
  const lowerCred = (credential || '').trim().toLowerCase();
  const user = db.users.find(u => 
    (u.full_name && u.full_name.trim().toLowerCase() === lowerCred) ||
    (u.email && u.email.trim().toLowerCase() === lowerCred) ||
    (u.username && u.username.trim().toLowerCase() === lowerCred) ||
    (u.id && u.id.trim().toLowerCase() === lowerCred)
  );

  if (!user) {
    throw new Error('Invalid username/email or password');
  }

  if (expectedRole && user.role !== expectedRole) {
    throw new Error(`Unauthorized login attempt for role: ${expectedRole}`);
  }

  const isValidPassword = bcrypt.compareSync(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

  return { token, user };
}

module.exports = {
  authenticateToken,
  requireRole,
  registerClient,
  loginUser,
  JWT_SECRET
};
