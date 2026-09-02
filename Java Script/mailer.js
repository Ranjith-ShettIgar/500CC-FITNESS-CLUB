const nodemailer = require('nodemailer');
const { readDB, writeDB, computeMembershipStatus } = require('./db');

// SMTP Transporter configuration
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined
  });
}

/**
 * Runs the daily automated check for memberships expiring within 2 days.
 * Sends email reminders to clients and logs notifications to avoid duplicate dispatches.
 */
async function checkAndSendExpiryReminders() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[Mailer] SMTP credentials not configured in Config/.env - Email reminders disabled.');
    return;
  }

  const db = readDB();
  const transporter = createTransporter();
  let countSent = 0;

  for (const membership of db.memberships) {
    const status = computeMembershipStatus(membership.due_date);
    
    // Trigger reminder if membership is expiring soon (<= 2 days) or expired
    if (status.code === 'EXPIRING_SOON' || status.code === 'EXPIRED') {
      const client = db.users.find(u => u.id === membership.client_id && u.role === 'CLIENT');
      if (!client || !client.email) continue;

      // Check if reminder was already sent for this due date cycle
      const alreadySent = db.notifications.find(n => 
        n.client_id === client.id && 
        n.membership_id === membership.id && 
        n.due_date === membership.due_date
      );

      if (alreadySent) continue;

      const subject = status.code === 'EXPIRING_SOON' 
        ? `⚡ Reminder: Your 500CC Fitness Club Membership Expires in ${status.days} Days!`
        : `⚠️ Alert: Your 500CC Fitness Club Membership Expired!`;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; background: #0b0d10; color: #f0f4f8; padding: 30px; border-radius: 10px;">
          <h2 style="color: #ccff00; text-transform: uppercase;">500CC FITNESS CLUB</h2>
          <p>Hi <strong>${client.full_name}</strong>,</p>
          <p>${status.code === 'EXPIRING_SOON' 
            ? `Your gym membership (<strong>${membership.plan_name}</strong>) is set to expire on <span style="color: #ff9900;">${membership.due_date}</span>.`
            : `Your gym membership (<strong>${membership.plan_name}</strong>) expired on <span style="color: #ff3366;">${membership.due_date}</span>.`
          }</p>
          <div style="background: rgba(255,255,255,0.05); padding: 15px; border-left: 4px solid #ccff00; margin: 20px 0;">
            <p style="margin: 0;">📍 <strong>Please visit the Gym Reception Desk</strong> to renew your subscription in person (Cash / UPI / Card).</p>
          </div>
          <p>Address: Chikkensal Road, Kundapur, Karnataka 576201 | Phone: +91 8553483001</p>
          <p style="font-size: 0.8em; color: #94a3b8;">This is an automated system notification from 500CC Fitness Club.</p>
        </div>
      `;

      try {
        if (process.env.SMTP_USER) {
          await transporter.sendMail({
            from: `"${process.env.SENDER_NAME || '500CC Fitness Club'}" <${process.env.SENDER_EMAIL || process.env.SMTP_USER}>`,
            to: client.email,
            subject,
            html: htmlBody
          });
        }

        // Log notification record
        db.notifications.push({
          id: `NTF-${Date.now().toString().slice(-4)}`,
          client_id: client.id,
          membership_id: membership.id,
          email: client.email,
          due_date: membership.due_date,
          type: status.code,
          sent_at: new Date().toISOString(),
          status: process.env.SMTP_USER ? 'SENT' : 'SIMULATED_LOG'
        });

        countSent++;
      } catch (err) {
        console.error(`Failed to send email to ${client.email}:`, err.message);
      }
    }
  }

  writeDB(db);
  console.log(`[SMTP Mailer Check Complete] Dispatched ${countSent} expiry reminders.`);
  return countSent;
}

module.exports = {
  checkAndSendExpiryReminders
};
