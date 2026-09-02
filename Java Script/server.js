require('dotenv').config({ path: require('path').join(__dirname, '../Config/.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const PDFDocument = require('pdfkit');

const { readDB, writeDB, computeMembershipStatus } = require('./db');
const { authenticateToken, requireRole, registerClient, loginUser } = require('./auth');
const { generatePDFInvoice, INVOICE_DIR } = require('./invoice');
const { checkAndSendExpiryReminders } = require('./mailer');
const { generateDocxDocumentation, generateMarkdownDocumentation } = require('./generate-docs');

// Auto-Sync Documentation on Startup
try {
  generateMarkdownDocumentation();
  generateDocxDocumentation().catch(() => {});
} catch (e) {}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve Static Folders (Root level, unencoded, and URL-encoded path aliases for full browser compatibility)
app.use(express.static(path.join(__dirname, '../HTML and CSS')));
app.use(express.static(path.join(__dirname, '../Java Script')));
app.use('/HTML and CSS', express.static(path.join(__dirname, '../HTML and CSS')));
app.use('/HTML%20and%20CSS', express.static(path.join(__dirname, '../HTML and CSS')));
app.use('/Java Script', express.static(path.join(__dirname, '../Java Script')));
app.use('/Java%20Script', express.static(path.join(__dirname, '../Java Script')));
app.use('/Image and Video', express.static(path.join(__dirname, '../Image and Video')));
app.use('/Image%20and%20Video', express.static(path.join(__dirname, '../Image and Video')));
app.use('/Invoices', express.static(INVOICE_DIR));

// Direct page routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../HTML and CSS/index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../HTML and CSS/admin.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../HTML and CSS/profile.html'));
});

/* ==========================================================================
   AUTHENTICATION API ROUTES
   ========================================================================== */

// Client Register
app.post('/api/auth/register', (req, res) => {
  try {
    const result = registerClient(req.body);
    res.status(201).json({ message: 'Registration successful', ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Client & Admin Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password, role } = req.body;
    const result = loginUser(email, password, role);
    res.json({ message: 'Login successful', ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ==========================================================================
   CLIENT PROFILE API ROUTES
   ========================================================================== */

// Fetch logged-in user profile & membership
app.get('/api/client/profile', authenticateToken, requireRole('CLIENT'), (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const membership = db.memberships.find(m => m.client_id === user.id) || {};
  const status = computeMembershipStatus(membership.due_date);

  const payments = db.payments
    .filter(p => p.client_id === user.id)
    .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));

  // Sanitize password_hash
  const { password_hash, ...safeUser } = user;

  res.json({
    user: safeUser,
    membership: {
      ...membership,
      status
    },
    payments
  });
});

/* ==========================================================================
   ADMIN MANAGEMENT API ROUTES
   ========================================================================== */

// Fetch all clients & calculated statuses for Admin Dashboard
app.get('/api/admin/clients', authenticateToken, requireRole('ADMIN'), (req, res) => {
  const db = readDB();
  const clients = db.users.filter(u => u.role === 'CLIENT');

  const clientRecords = clients.map(client => {
    const membership = db.memberships.find(m => m.client_id === client.id) || {};
    const status = computeMembershipStatus(membership.due_date);
    const lastPayment = db.payments
      .filter(p => p.client_id === client.id)
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0] || null;

    const { password_hash, ...safeClient } = client;

    return {
      ...safeClient,
      membership: {
        ...membership,
        status
      },
      lastPayment
    };
  });

  res.json(clientRecords);
});

// Admin Record Payment & Renew Membership
app.post('/api/admin/renew', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { client_id, plan_name, amount, payment_method, payment_date, due_date } = req.body;
    const db = readDB();

    const client = db.users.find(u => u.id === client_id && u.role === 'CLIENT');
    if (!client) return res.status(404).json({ error: 'Client not found' });

    let membership = db.memberships.find(m => m.client_id === client_id);
    if (!membership) {
      membership = {
        id: `MEM-${Date.now().toString().slice(-4)}`,
        client_id: client_id
      };
      db.memberships.push(membership);
    }

    // Update Membership Record
    membership.plan_name = plan_name;
    membership.due_date = due_date;
    membership.last_renewal_date = payment_date;
    membership.amount_paid = parseFloat(amount);

    // Generate Invoice Number
    const invoiceNum = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPayment = {
      id: `PAY-${Date.now().toString().slice(-4)}`,
      invoice_number: invoiceNum,
      client_id: client_id,
      membership_id: membership.id,
      amount: parseFloat(amount),
      plan_name,
      payment_date,
      payment_method,
      due_date,
      recorded_by_admin: req.user.id
    };

    db.payments.push(newPayment);
    writeDB(db);

    // Generate PDF invoice file asynchronously
    await generatePDFInvoice(newPayment, client);

    res.json({
      message: 'Payment recorded & membership renewed successfully',
      payment: newPayment,
      membership
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Edit Member Profile & Subscription
app.put('/api/admin/client/:id', authenticateToken, requireRole('ADMIN'), (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, gender, dob, address, emergency_contact, plan_name, start_date, due_date } = req.body;
    const db = readDB();

    const client = db.users.find(u => u.id === id && u.role === 'CLIENT');
    if (!client) return res.status(404).json({ error: 'Client member not found' });

    // Update user profile fields
    if (full_name !== undefined) client.full_name = full_name;
    if (email !== undefined) client.email = email;
    if (phone !== undefined) client.phone = phone;
    if (gender !== undefined) client.gender = gender;
    if (dob !== undefined) client.dob = dob;
    if (address !== undefined) client.address = address;
    if (emergency_contact !== undefined) client.emergency_contact = emergency_contact;

    // Update membership fields
    let membership = db.memberships.find(m => m.client_id === id);
    if (!membership) {
      membership = {
        id: `MEM-${Date.now().toString().slice(-4)}`,
        client_id: id
      };
      db.memberships.push(membership);
    }

    if (plan_name !== undefined) membership.plan_name = plan_name;
    if (start_date !== undefined) membership.start_date = start_date;
    if (due_date !== undefined) membership.due_date = due_date;

    writeDB(db);

    const { password_hash, ...safeClient } = client;
    res.json({ message: 'Member profile updated successfully', client: safeClient, membership });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Delete Member Profile & Associated Data
app.delete('/api/admin/client/:id', authenticateToken, requireRole('ADMIN'), (req, res) => {
  try {
    const { id } = req.params;
    const db = readDB();

    const clientIndex = db.users.findIndex(u => u.id === id && u.role === 'CLIENT');
    if (clientIndex === -1) return res.status(404).json({ error: 'Client member not found' });

    // Remove user
    const deletedUser = db.users.splice(clientIndex, 1)[0];

    // Remove associated membership
    db.memberships = db.memberships.filter(m => m.client_id !== id);

    // Remove associated payments
    db.payments = db.payments.filter(p => p.client_id !== id);

    writeDB(db);

    res.json({ message: `Member ${deletedUser.full_name} (${id}) deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Export Member Registry PDF Report
app.get('/api/admin/export-pdf', authenticateToken, requireRole('ADMIN'), (req, res) => {
  try {
    const { filter, query } = req.query;
    const db = readDB();
    const q = (query || '').toLowerCase();
    const f = filter || 'ALL';

    const clients = db.users.filter(u => u.role === 'CLIENT');
    const filtered = clients.filter(c => {
      const matchQuery = c.full_name.toLowerCase().includes(q) ||
                         c.email.toLowerCase().includes(q) ||
                         c.id.toLowerCase().includes(q) ||
                         c.phone.includes(q);

      const membership = db.memberships.find(m => m.client_id === c.id) || {};
      const status = computeMembershipStatus(membership.due_date);
      const matchFilter = f === 'ALL' || status.code === f;

      return matchQuery && matchFilter;
    });

    const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 40 });
    const filterClean = f.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const fileName = `500CC_Member_Registry_Report_${filterClean}_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    doc.pipe(res);

    // Header Branding
    doc.fillColor('#0F172A')
       .fontSize(22)
       .text('500CC FITNESS CLUB', 40, 35, { bold: true });

    doc.fontSize(10)
       .fillColor('#64748B')
       .text('Chikkensal Road, Kundapur, Karnataka 576201 | Phone: +91 8553483001 | Email: info@500ccfitness.com', 40, 62);

    doc.moveTo(40, 78).lineTo(800, 78).strokeColor('#CBD5E1').stroke();

    // Report Title & Meta
    const today = new Date().toISOString().split('T')[0];
    doc.fontSize(14)
       .fillColor('#0F172A')
       .text('MEMBER SUBSCRIPTION REGISTRY REPORT', 40, 90, { bold: true });

    doc.fontSize(9)
       .fillColor('#475569')
       .text(`Generated On: ${today}  |  Filter: ${f.toUpperCase()}  |  Total Member Records: ${filtered.length}`, 40, 110);

    // Table Header
    let y = 135;
    doc.rect(40, y, 760, 22).fill('#F1F5F9');

    doc.fillColor('#0F172A')
       .fontSize(9)
       .text('MEMBER ID', 45, y + 6, { width: 75 })
       .text('FULL NAME & EMAIL', 125, y + 6, { width: 170 })
       .text('PHONE', 300, y + 6, { width: 95 })
       .text('PLAN', 400, y + 6, { width: 95 })
       .text('START DATE', 500, y + 6, { width: 70 })
       .text('DUE DATE', 575, y + 6, { width: 70 })
       .text('STATUS', 650, y + 6, { width: 65 })
       .text('LAST PAYMENT', 720, y + 6, { width: 75 });

    y += 28;

    filtered.forEach((c, idx) => {
      if (y > 510) {
        doc.addPage({ layout: 'landscape', size: 'A4', margin: 40 });
        y = 40;
      }

      const membership = db.memberships.find(m => m.client_id === c.id) || {};
      const status = computeMembershipStatus(membership.due_date);
      const lastPayment = db.payments
        .filter(p => p.client_id === c.id)
        .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0] || null;

      if (idx % 2 === 1) {
        doc.rect(40, y - 4, 760, 22).fill('#F8FAFC');
      }

      doc.fillColor('#0F172A')
         .fontSize(8.5)
         .text(c.id, 45, y, { width: 75 })
         .text(`${c.full_name}`, 125, y, { width: 170 })
         .text(c.phone || 'N/A', 300, y, { width: 95 })
         .text(membership.plan_name || 'Pending', 400, y, { width: 95 })
         .text(membership.start_date || 'N/A', 500, y, { width: 70 })
         .text(membership.due_date || 'N/A', 575, y, { width: 70 })
         .text(status.label, 650, y, { width: 65 })
         .text(lastPayment ? `Rs.${lastPayment.amount}` : 'None', 720, y, { width: 75 });

      y += 22;
    });

    // Footer Page Note
    doc.fontSize(8)
       .fillColor('#94A3B8')
       .text('© 2026 500CC FITNESS CLUB — Official Member Registry PDF Report', 40, 555, { align: 'center' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   PDF INVOICE DOWNLOAD API
   ========================================================================== */

app.get('/api/invoices/:invoiceNumber/pdf', async (req, res) => {
  const { invoiceNumber } = req.params;
  const db = readDB();
  const payment = db.payments.find(p => p.invoice_number === invoiceNumber);

  if (!payment) return res.status(404).json({ error: 'Invoice not found' });

  const client = db.users.find(u => u.id === payment.client_id) || { full_name: 'Gym Member', id: payment.client_id, email: '', phone: '' };

  const pdfPath = path.join(INVOICE_DIR, `${invoiceNumber}.pdf`);

  if (!fs.existsSync(pdfPath)) {
    // Generate on demand if missing
    await generatePDFInvoice(payment, client);
  }

  res.download(pdfPath, `${invoiceNumber}.pdf`);
});

/* ==========================================================================
   AUTOMATED CRON SCHEDULER (Runs daily at 09:00 AM)
   ========================================================================== */

cron.schedule('0 9 * * *', async () => {
  console.log('[Cron] Running daily SMTP expiry check...');
  await checkAndSendExpiryReminders();
});

// Run initial check on server start
checkAndSendExpiryReminders().catch(console.error);

// Start Express Server
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`⚡ 500CC FITNESS CLUB SERVER RUNNING ON PORT ${PORT}`);
  console.log(`🌐 Public Website: http://localhost:${PORT}/HTML%20and%20CSS/index.html`);
  console.log(`👤 Client Profile: http://localhost:${PORT}/HTML%20and%20CSS/profile.html`);
  console.log(`👑 Admin Dashboard: http://localhost:${PORT}/HTML%20and%20CSS/admin.html`);
  console.log(`==================================================\n`);
});
