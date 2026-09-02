/* ==========================================================================
   TITAN FITNESS GYM - FRONTEND INTERACTIVE LOGIC
   ========================================================================== */

const API_BASE = (window.location.protocol === 'file:') ? 'http://localhost:3000/api' : '/api';

// Current active auth tab: 'client-login' | 'client-register' | 'admin-login'
let currentAuthTab = 'client-login';
let allAdminClientsCache = [];

/* ==========================================================================
   MODAL & NAVIGATION UTILITIES
   ========================================================================== */

function openModal(modalId, initialTab = 'client-login') {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    if (modalId === 'authModal') {
      switchAuthTab(initialTab);
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

function switchAuthTab(tabName) {
  currentAuthTab = tabName;
  const title = document.getElementById('modalTitle');
  const fields = document.getElementById('formFields');
  const submitBtn = document.getElementById('authSubmitBtn');
  const alertBox = document.getElementById('authAlert');

  if (alertBox) alertBox.style.display = 'none';

  // Update tab button active highlights
  ['tabClientLogin', 'tabClientRegister', 'tabAdminLogin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });

  if (tabName === 'client-login') {
    document.getElementById('tabClientLogin')?.classList.add('active');
    title.innerText = 'CLIENT LOGIN';
    submitBtn.innerText = 'LOG IN AS CLIENT';
    fields.innerHTML = `
      <div class="form-group">
        <label class="form-label">Username (Full Name) or Email</label>
        <input type="text" id="authEmail" class="form-control" placeholder="Enter your Username" required>
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <input type="password" id="authPassword" class="form-control" placeholder="Please Enter your Password" required>
      </div>
    `;
  } else if (tabName === 'client-register') {
    document.getElementById('tabClientRegister')?.classList.add('active');
    title.innerText = 'CREATE NEW CLIENT ACCOUNT';
    submitBtn.innerText = 'REGISTER NOW';
    fields.innerHTML = `
      <div class="form-group">
        <label class="form-label">Full Name *</label>
        <input type="text" id="regName" class="form-control" placeholder="Enter your Username" required>
      </div>
      <div class="form-group">
        <label class="form-label">Email Address *</label>
        <input type="email" id="regEmail" class="form-control" placeholder="john@example.com" required>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Phone Number *</label>
          <input type="tel" id="regPhone" class="form-control" placeholder="+91 98765 43210" required>
        </div>
        <div class="form-group" style="flex: 1;">
          <label class="form-label">Gender</label>
          <select id="regGender" class="form-control">
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Date of Birth</label>
        <input type="date" id="regDob" class="form-control">
      </div>
      <div class="form-group">
        <label class="form-label">Address</label>
        <input type="text" id="regAddress" class="form-control" placeholder="House/Street, City">
      </div>
      <div class="form-group">
        <label class="form-label">Emergency Contact Phone</label>
        <input type="text" id="regEmergency" class="form-control" placeholder="+91 98765 00000 (Relation)">
      </div>
      <div class="form-group">
        <label class="form-label">Create Password *</label>
        <input type="password" id="regPassword" class="form-control" placeholder="Please Enter your Password" required>
      </div>
    `;
  } else if (tabName === 'admin-login') {
    document.getElementById('tabAdminLogin')?.classList.add('active');
    title.innerText = 'ADMIN / STAFF AUTHENTICATION';
    submitBtn.innerText = 'LOGIN TO ADMIN DASHBOARD';
    fields.innerHTML = `
      <div class="form-group">
        <label class="form-label">Admin Username or Email</label>
        <input type="text" id="adminEmail" class="form-control" placeholder="Enter your Username" required>
      </div>
      <div class="form-group">
        <label class="form-label">Admin Password</label>
        <input type="password" id="adminPassword" class="form-control" placeholder="Please Enter your Password" required>
      </div>
    `;
  }
}

/* ==========================================================================
   AUTHENTICATION FORM HANDLER
   ========================================================================== */

async function handleAuthSubmit(event) {
  event.preventDefault();
  const alertBox = document.getElementById('authAlert');

  try {
    if (currentAuthTab === 'client-login') {
      const email = document.getElementById('authEmail').value;
      const password = document.getElementById('authPassword').value;

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'CLIENT' })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('titan_token', data.token);
      localStorage.setItem('titan_role', 'CLIENT');
      localStorage.setItem('titan_user_name', data.user.full_name);

      closeModal('authModal');
      // IMPORTANT USER FLOW: Redirect to Homepage, NOT payment page
      window.location.href = 'index.html';

    } else if (currentAuthTab === 'client-register') {
      const payload = {
        full_name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        phone: document.getElementById('regPhone').value,
        gender: document.getElementById('regGender').value,
        dob: document.getElementById('regDob').value,
        address: document.getElementById('regAddress').value,
        emergency_contact: document.getElementById('regEmergency').value,
        password: document.getElementById('regPassword').value
      };

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      localStorage.setItem('titan_token', data.token);
      localStorage.setItem('titan_role', 'CLIENT');
      localStorage.setItem('titan_user_name', data.user.full_name);

      closeModal('authModal');
      // Redirect to Homepage
      window.location.href = 'index.html';

    } else if (currentAuthTab === 'admin-login') {
      const email = document.getElementById('adminEmail').value;
      const password = document.getElementById('adminPassword').value;

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'ADMIN' })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Admin authentication failed');

      localStorage.setItem('titan_token', data.token);
      localStorage.setItem('titan_role', 'ADMIN');
      localStorage.setItem('titan_user_name', data.user.full_name);

      closeModal('authModal');
      if (window.location.pathname.includes('admin.html')) {
        loadAdminDashboard();
      } else {
        window.location.href = 'admin.html';
      }
    }
  } catch (err) {
    if (alertBox) {
      alertBox.style.display = 'block';
      alertBox.style.background = 'rgba(255, 51, 102, 0.15)';
      alertBox.style.color = '#ff3366';
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        alertBox.innerText = '❌ Server Offline: Run "npm start" in terminal and open http://localhost:3000';
      } else {
        alertBox.innerText = err.message;
      }
    }
  }
}

// Update Navbar Links according to auth status
function updateNavAuth() {
  const token = localStorage.getItem('titan_token');
  const role = localStorage.getItem('titan_role');
  const authNavBtn = document.getElementById('authNavBtn');

  if (token && role === 'CLIENT' && authNavBtn) {
    authNavBtn.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <a href="profile.html" class="btn btn-outline" style="padding: 0.4rem 1rem;">My Profile</a>
        <button class="btn btn-danger" style="padding: 0.4rem 1rem;" onclick="logoutUser()">Logout</button>
      </div>
    `;
  }
}

function logoutUser() {
  localStorage.removeItem('titan_token');
  localStorage.removeItem('titan_role');
  localStorage.removeItem('titan_user_name');
  window.location.href = 'index.html';
}

function logoutAdmin() {
  localStorage.removeItem('titan_token');
  localStorage.removeItem('titan_role');
  localStorage.removeItem('titan_user_name');
  window.location.href = 'index.html';
}

/* ==========================================================================
   CLIENT PROFILE PAGE LOGIC (profile.html)
   ========================================================================== */

async function loadUserProfile() {
  const token = localStorage.getItem('titan_token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/client/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to load profile');
    const data = await res.json();

    const { user, membership, payments } = data;

    // Render Status Badge
    const badgeContainer = document.getElementById('statusBadgeContainer');
    const status = membership.status || { code: 'EXPIRED', label: 'EXPIRED' };
    
    let badgeClass = 'status-expired';
    if (status.code === 'ACTIVE') badgeClass = 'status-active';
    if (status.code === 'EXPIRING_SOON') badgeClass = 'status-expiring';

    if (badgeContainer) {
      badgeContainer.innerHTML = `
        <div class="status-badge ${badgeClass}" style="font-size: 1rem; padding: 0.6rem 1.5rem;">
          ${status.label}
        </div>
      `;
    }

    // Render Personal Info
    const infoBox = document.getElementById('personalInfoBox');
    if (infoBox) {
      infoBox.innerHTML = `
        <div><strong style="color: var(--text-muted); font-size: 0.8rem;">MEMBER ID:</strong><div>${user.id}</div></div>
        <div><strong style="color: var(--text-muted); font-size: 0.8rem;">FULL NAME:</strong><div>${user.full_name}</div></div>
        <div><strong style="color: var(--text-muted); font-size: 0.8rem;">EMAIL ADDRESS:</strong><div>${user.email}</div></div>
        <div><strong style="color: var(--text-muted); font-size: 0.8rem;">PHONE NUMBER:</strong><div>${user.phone || 'N/A'}</div></div>
        <div><strong style="color: var(--text-muted); font-size: 0.8rem;">DATE OF BIRTH:</strong><div>${user.dob || 'N/A'}</div></div>
        <div><strong style="color: var(--text-muted); font-size: 0.8rem;">GENDER:</strong><div>${user.gender || 'N/A'}</div></div>
        <div><strong style="color: var(--text-muted); font-size: 0.8rem;">ADDRESS:</strong><div>${user.address || 'N/A'}</div></div>
        <div><strong style="color: var(--text-muted); font-size: 0.8rem;">EMERGENCY CONTACT:</strong><div>${user.emergency_contact || 'N/A'}</div></div>
      `;
    }

    // Render Membership Info
    const memBox = document.getElementById('membershipInfoBox');
    if (memBox) {
      memBox.innerHTML = `
        <div>
          <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 700;">CURRENT PLAN</span>
          <div style="font-size: 1.3rem; font-weight: 800; color: #fff;">${membership.plan_name || 'No Active Plan'}</div>
        </div>
        <div>
          <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 700;">EXPIRY / DUE DATE</span>
          <div style="font-size: 1.3rem; font-weight: 800; color: var(--accent-lime);">${membership.due_date || 'N/A'}</div>
        </div>
        <div>
          <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 700;">LAST RENEWAL DATE</span>
          <div>${membership.last_renewal_date || 'N/A'}</div>
        </div>
        <div>
          <span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 700;">AMOUNT PAID</span>
          <div>₹${membership.amount_paid ? membership.amount_paid.toLocaleString('en-IN') : 0}</div>
        </div>
      `;
    }

    // Render Payment History Table
    const tableBody = document.getElementById('paymentHistoryBody');
    if (tableBody) {
      if (payments.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No payment records found. Pay in-person at the gym to activate your membership.</td></tr>`;
      } else {
        tableBody.innerHTML = payments.map(p => `
          <tr>
            <td><strong>${p.invoice_number}</strong></td>
            <td>${p.payment_date}</td>
            <td>${p.plan_name}</td>
            <td style="color: var(--accent-lime); font-weight: 700;">₹${p.amount.toLocaleString('en-IN')}</td>
            <td>${p.payment_method || 'Cash'}</td>
            <td>${p.due_date}</td>
            <td>
              <a href="${API_BASE}/invoices/${p.invoice_number}/pdf" target="_blank" class="btn btn-outline" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;">
                📥 Download Invoice
              </a>
            </td>
          </tr>
        `).join('');
      }
    }

  } catch (err) {
    console.error(err);
  }
}

/* ==========================================================================
   ADMIN DASHBOARD LOGIC (admin.html)
   ========================================================================== */

async function loadAdminDashboard() {
  const token = localStorage.getItem('titan_token');
  const role = localStorage.getItem('titan_role');

  if (!token || role !== 'ADMIN') {
    if (typeof openModal === 'function' && document.getElementById('authModal')) {
      openModal('authModal', 'admin-login');
    } else {
      window.location.href = 'index.html';
    }
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/admin/clients`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('titan_token');
        localStorage.removeItem('titan_role');
        if (typeof openModal === 'function' && document.getElementById('authModal')) {
          openModal('authModal', 'admin-login');
        } else {
          window.location.href = 'index.html';
        }
        return;
      }
      throw new Error('Failed to fetch clients');
    }

    const clients = await res.json();
    allAdminClientsCache = clients;

    // Calculate Summary Stats
    let activeCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;

    clients.forEach(c => {
      const code = c.membership?.status?.code;
      if (code === 'ACTIVE') activeCount++;
      else if (code === 'EXPIRING_SOON') expiringCount++;
      else expiredCount++;
    });

    const elTotal = document.getElementById('statTotalClients');
    const elActive = document.getElementById('statActiveCount');
    const elExpiring = document.getElementById('statExpiringCount');
    const elExpired = document.getElementById('statExpiredCount');

    if (elTotal) elTotal.innerText = clients.length;
    if (elActive) elActive.innerText = activeCount;
    if (elExpiring) elExpiring.innerText = expiringCount;
    if (elExpired) elExpired.innerText = expiredCount;

    renderAdminTable(clients);
    populateClientSelectOptions(clients);

  } catch (err) {
    console.error('Error loading admin dashboard:', err);
  }
}

function renderAdminTable(clients) {
  const tbody = document.getElementById('adminClientTableBody');
  if (!tbody) return;

  if (clients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No matching client records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = clients.map(c => {
    const status = c.membership?.status || { code: 'EXPIRED', label: 'EXPIRED' };
    let badgeClass = 'status-expired';
    if (status.code === 'ACTIVE') badgeClass = 'status-active';
    if (status.code === 'EXPIRING_SOON') badgeClass = 'status-expiring';

    const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
    const waMsg = encodeURIComponent(`Hi ${c.full_name}, greetings from 500CC FITNESS CLUB! This is a friendly reminder regarding your membership (${c.membership?.plan_name || 'Membership'}). Your current subscription due date is ${c.membership?.due_date || 'N/A'}. Please visit the gym reception counter to renew.`);
    const waLink = waPhone ? `https://wa.me/${waPhone}?text=${waMsg}` : '#';

    return `
      <tr>
        <td><strong>${c.id}</strong></td>
        <td>
          <div style="font-weight: 700;">${c.full_name}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${c.email} | ${c.phone}</div>
        </td>
        <td>${c.membership?.plan_name || 'N/A'}</td>
        <td>${c.membership?.start_date || 'N/A'}</td>
        <td style="font-weight: 700;">${c.membership?.due_date || 'N/A'}</td>
        <td><span class="status-badge ${badgeClass}">${status.label}</span></td>
        <td>${c.lastPayment ? `₹${c.lastPayment.amount} (${c.lastPayment.payment_date})` : 'None'}</td>
        <td>
          <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
            <button class="btn btn-primary" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; font-weight: 700;" onclick="openRenewalForClient('${c.id}')" title="Renew Membership">
              ⚡ Renew
            </button>
            <a href="${waLink}" target="_blank" class="btn btn-outline" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; font-weight: 700; border-color: #22C55E; color: #15803D; background: #F0FDF4; text-decoration: none; display: inline-flex; align-items: center;" title="Send WhatsApp Reminder">
              💬 WhatsApp
            </a>
            <button class="btn btn-outline" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; font-weight: 700; border-color: #3B82F6; color: #2563EB; background: #EFF6FF;" onclick="openEditMemberModal('${c.id}')" title="Edit Member Profile">
              ✏️ Edit
            </button>
            <button class="btn btn-outline" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; font-weight: 700; border-color: #EF4444; color: #DC2626; background: #FEF2F2;" onclick="confirmDeleteMember('${c.id}', '${c.full_name.replace(/'/g, "\\'")}')" title="Delete Member Account">
              🗑️ Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminClients() {
  const query = document.getElementById('adminSearchInput').value.toLowerCase();
  const filter = document.getElementById('adminStatusFilter').value;

  let filtered = allAdminClientsCache.filter(c => {
    const matchQuery = c.full_name.toLowerCase().includes(query) ||
                       c.email.toLowerCase().includes(query) ||
                       c.id.toLowerCase().includes(query) ||
                       c.phone.includes(query);

    const statusCode = c.membership?.status?.code;
    const matchFilter = filter === 'ALL' || statusCode === filter;

    return matchQuery && matchFilter;
  });

  renderAdminTable(filtered);
}

function populateClientSelectOptions(clients) {
  const select = document.getElementById('renewClientId');
  if (!select) return;

  select.innerHTML = clients.map(c => `<option value="${c.id}">${c.full_name} (${c.id}) - Current: ${c.membership?.plan_name || 'Pending'}</option>`).join('');
}

function openRenewalModal() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('renewPaymentDate').value = today;
  updatePlanAmount();
  openModal('renewalModal');
}

function openRenewalForClient(clientId) {
  openRenewalModal();
  const select = document.getElementById('renewClientId');
  if (select) select.value = clientId;
}

function updatePlanAmount() {
  const plan = document.getElementById('renewPlan').value;
  const amountInput = document.getElementById('renewAmount');
  const dueDateInput = document.getElementById('renewDueDate');
  
  const today = new Date();
  let addDays = 30;
  let defaultAmount = 1500;

  if (plan === 'Monthly Pass') {
    addDays = 30;
    defaultAmount = 1500;
  } else if (plan === 'Quarterly Pass') {
    addDays = 90;
    defaultAmount = 4000;
  } else if (plan === 'Annual VIP Pass') {
    addDays = 365;
    defaultAmount = 14000;
  }

  amountInput.value = defaultAmount;

  const targetDate = new Date();
  targetDate.setDate(today.getDate() + addDays);
  dueDateInput.value = targetDate.toISOString().split('T')[0];
}

async function handleRenewalSubmit(event) {
  event.preventDefault();
  const token = localStorage.getItem('titan_token');
  const alertBox = document.getElementById('renewalAlert');

  const payload = {
    client_id: document.getElementById('renewClientId').value,
    plan_name: document.getElementById('renewPlan').value,
    amount: document.getElementById('renewAmount').value,
    payment_method: document.getElementById('renewMethod').value,
    payment_date: document.getElementById('renewPaymentDate').value,
    due_date: document.getElementById('renewDueDate').value
  };

  try {
    const res = await fetch(`${API_BASE}/admin/renew`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to record payment');

    closeModal('renewalModal');
    loadAdminDashboard();

    alert(`✅ Success! Renewal recorded & invoice generated: ${data.payment.invoice_number}`);
  } catch (err) {
    if (alertBox) {
      alertBox.style.display = 'block';
      alertBox.style.background = 'rgba(255, 51, 102, 0.15)';
      alertBox.style.color = '#ff3366';
      alertBox.innerText = err.message;
    }
  }
}

/* ==========================================================================
   ADMIN EDIT & DELETE MEMBER HANDLERS
   ========================================================================== */

function openEditMemberModal(clientId) {
  const client = allAdminClientsCache.find(c => c.id === clientId);
  if (!client) return;

  document.getElementById('editClientId').value = client.id;
  document.getElementById('editFullName').value = client.full_name || '';
  document.getElementById('editEmail').value = client.email || '';
  document.getElementById('editPhone').value = client.phone || '';
  document.getElementById('editGender').value = client.gender || 'Male';
  document.getElementById('editDob').value = client.dob || '';
  document.getElementById('editAddress').value = client.address || '';
  document.getElementById('editEmergency').value = client.emergency_contact || '';

  document.getElementById('editPlanName').value = client.membership?.plan_name || 'Monthly Pass';
  document.getElementById('editStartDate').value = client.membership?.start_date || '';
  document.getElementById('editDueDate').value = client.membership?.due_date || '';

  const alertBox = document.getElementById('editMemberAlert');
  if (alertBox) alertBox.style.display = 'none';

  openModal('editMemberModal');
}

async function handleEditMemberSubmit(event) {
  event.preventDefault();
  const token = localStorage.getItem('titan_token');
  const alertBox = document.getElementById('editMemberAlert');
  const clientId = document.getElementById('editClientId').value;

  const payload = {
    full_name: document.getElementById('editFullName').value,
    email: document.getElementById('editEmail').value,
    phone: document.getElementById('editPhone').value,
    gender: document.getElementById('editGender').value,
    dob: document.getElementById('editDob').value,
    address: document.getElementById('editAddress').value,
    emergency_contact: document.getElementById('editEmergency').value,
    plan_name: document.getElementById('editPlanName').value,
    start_date: document.getElementById('editStartDate').value,
    due_date: document.getElementById('editDueDate').value
  };

  try {
    const res = await fetch(`${API_BASE}/admin/client/${clientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update member profile');

    if (alertBox) {
      alertBox.style.display = 'block';
      alertBox.style.background = '#ECFDF5';
      alertBox.style.color = '#047857';
      alertBox.style.border = '1px solid #A7F3D0';
      alertBox.innerText = '✅ Member profile updated successfully!';
    }

    setTimeout(() => {
      closeModal('editMemberModal');
      loadAdminDashboard();
    }, 1000);
  } catch (err) {
    if (alertBox) {
      alertBox.style.display = 'block';
      alertBox.style.background = '#FEF2F2';
      alertBox.style.color = '#991B1B';
      alertBox.style.border = '1px solid #FCA5A5';
      alertBox.innerText = `⚠️ ${err.message}`;
    }
  }
}

async function confirmDeleteMember(clientId, clientName) {
  if (!confirm(`Are you sure you want to permanently delete member profile: ${clientName} (${clientId})?\n\nThis will remove their account and all membership records.`)) {
    return;
  }

  const token = localStorage.getItem('titan_token');
  try {
    const res = await fetch(`${API_BASE}/admin/client/${clientId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete member');

    alert(`✅ ${data.message || 'Member deleted successfully'}`);
    loadAdminDashboard();
  } catch (err) {
    alert(`⚠️ ${err.message}`);
  }
}

/* ==========================================================================
   ADMIN PDF REPORT EXPORTER
   ========================================================================== */

async function exportAdminClientsPDF() {
  const query = document.getElementById('adminSearchInput')?.value.toLowerCase() || '';
  const filter = document.getElementById('adminStatusFilter')?.value || 'ALL';
  const token = localStorage.getItem('titan_token');

  if (!token) {
    alert('Please log in as Admin to export PDF report.');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/admin/export-pdf?filter=${encodeURIComponent(filter)}&query=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      let errorMsg = 'Failed to generate PDF report';
      try {
        const errData = await response.json();
        errorMsg = errData.error || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const filterClean = filter.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const fileName = `500CC_Member_Registry_Report_${filterClean}_${new Date().toISOString().split('T')[0]}.pdf`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  } catch (err) {
    alert(`⚠️ Error exporting PDF report: ${err.message}`);
  }
}

// Mobile Navbar Menu Toggle
function initMobileNavbar() {
  const toggleBtn = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navMenu.classList.toggle('active');
      toggleBtn.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        navMenu.classList.remove('active');
        toggleBtn.classList.remove('active');
      }
    });

    navMenu.querySelectorAll('.nav-link, button, a').forEach(item => {
      item.addEventListener('click', () => {
        navMenu.classList.remove('active');
        toggleBtn.classList.remove('active');
      });
    });
  }
}

// Global Nav Init
document.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();
  initMobileNavbar();
});
