const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const os = require('os');

const isServerless = !!(process.env.VERCEL || process.env.AWS_EXECUTION_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL_ENV);
const INVOICE_DIR = isServerless ? path.join(os.tmpdir(), 'Invoices') : path.join(__dirname, '../Invoices');

try {
  if (!fs.existsSync(INVOICE_DIR)) {
    fs.mkdirSync(INVOICE_DIR, { recursive: true });
  }
} catch (e) {}

/**
 * Generates a PDF invoice for a recorded gym payment.
 * @param {Object} payment Payment record
 * @param {Object} client Client user record
 * @returns {Promise<string>} File path of generated PDF
 */
function generatePDFInvoice(payment, client) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `${payment.invoice_number}.pdf`;
      const filePath = path.join(INVOICE_DIR, fileName);
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // Header Branding
      const logoPath = path.join(__dirname, '../HTML and CSS/logo.png');
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 50, 38, { width: 55 });
        } catch (e) {}
      }

      doc.fillColor('#0F172A')
         .fontSize(22)
         .text('500CC FITNESS CLUB', 115, 45, { weight: 'bold' });
      
      doc.fontSize(10)
         .fillColor('#64748B')
         .text('Chikkensal Road, Kundapur, Karnataka 576201', 115, 75)
         .text('Phone: +91 8553483001 | Email: billing@500ccfitness.com', 115, 90);

      doc.moveTo(50, 115).lineTo(550, 115).strokeColor('#CBD5E1').stroke();

      // Invoice Title & Number
      doc.fontSize(18)
         .fillColor('#0F172A')
         .text('INVOICE / PAYMENT RECEIPT', 50, 130, { align: 'right' });

      doc.fontSize(10)
         .fillColor('#475569')
         .text(`Invoice No: ${payment.invoice_number}`, 50, 130)
         .text(`Date: ${payment.payment_date}`, 50, 145);

      // Bill To Section
      doc.fontSize(12)
         .fillColor('#0F172A')
         .text('BILL TO:', 50, 185, { underline: true });

      doc.fontSize(10)
         .fillColor('#334155')
         .text(`Client Name: ${client.full_name}`, 50, 205)
         .text(`Member ID: ${client.id}`, 50, 220)
         .text(`Email: ${client.email}`, 50, 235)
         .text(`Phone: ${client.phone}`, 50, 250);

      // Table Header
      const tableTop = 290;
      doc.rect(50, tableTop, 500, 25).fill('#F1F5F9');
      
      doc.fillColor('#0F172A')
         .fontSize(10)
         .text('DESCRIPTION / PLAN', 60, tableTop + 7)
         .text('PAYMENT METHOD', 260, tableTop + 7)
         .text('NEW DUE DATE', 380, tableTop + 7)
         .text('AMOUNT (INR)', 470, tableTop + 7);

      // Table Body
      const rowTop = tableTop + 35;
      doc.fillColor('#334155')
         .text(payment.plan_name, 60, rowTop)
         .text(payment.payment_method || 'In-Person Cash', 260, rowTop)
         .text(payment.due_date, 380, rowTop)
         .text(`₹${payment.amount.toLocaleString('en-IN')}`, 470, rowTop);

      doc.moveTo(50, rowTop + 25).lineTo(550, rowTop + 25).strokeColor('#E2E8F0').stroke();

      // Total Section
      doc.fontSize(12)
         .fillColor('#0F172A')
         .text(`TOTAL PAID: ₹${payment.amount.toLocaleString('en-IN')}`, 350, rowTop + 45, { align: 'right' });

      // Note & Authorization
      doc.fontSize(9)
         .fillColor('#64748B')
         .text('* This digital invoice represents an in-person payment recorded by 500CC Fitness Club staff.', 50, 420)
         .text(`Recorded By Admin: ${payment.recorded_by_admin || 'System Admin'}`, 50, 435);

      doc.fontSize(10)
         .fillColor('#0F172A')
         .text('Thank you for working out with 500CC Fitness Club!', 50, 480, { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve(filePath);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePDFInvoice,
  INVOICE_DIR
};
