const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableCell,
  TableRow,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType
} = require('docx');

const ROOT_DIR = path.join(__dirname, '..');
const DOCX_PATH = path.join(ROOT_DIR, '500CC_Fitness_Club_Technical_Documentation.docx');
const MD_PATH = path.join(ROOT_DIR, 'DOCUMENTATION.md');
const DB_PATH = path.join(ROOT_DIR, 'Database/gym_data.json');
const PKG_PATH = path.join(ROOT_DIR, 'package.json');

// Read live database and metadata
function getLiveMetrics() {
  let userCount = 0;
  let activeMemCount = 0;
  let paymentCount = 0;
  let dbVersion = '1.0.0';

  if (fs.existsSync(DB_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      userCount = (data.users || []).length;
      activeMemCount = (data.memberships || []).length;
      paymentCount = (data.payments || []).length;
    } catch (e) {}
  }

  if (fs.existsSync(PKG_PATH)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
      dbVersion = pkg.version || '1.0.0';
    } catch (e) {}
  }

  return {
    userCount,
    activeMemCount,
    paymentCount,
    dbVersion,
    generatedDate: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };
}

async function generateDocxDocumentation() {
  const metrics = getLiveMetrics();

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Cover Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spaceAfter: 300,
            children: [
              new TextRun({
                text: '500CC FITNESS CLUB',
                bold: true,
                size: 36,
                color: '0F172A'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spaceAfter: 400,
            children: [
              new TextRun({
                text: 'INDUSTRIAL ENTERPRISE TECHNICAL DOCUMENTATION',
                bold: true,
                size: 20,
                color: '2563EB'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spaceAfter: 600,
            children: [
              new TextRun({
                text: `Version ${metrics.dbVersion}  |  Last Auto-Updated: ${metrics.generatedDate}`,
                italic: true,
                size: 18,
                color: '64748B'
              })
            ]
          }),

          // Section 1: Executive Overview
          new Paragraph({
            text: '1. Executive System Overview',
            heading: HeadingLevel.HEADING_1,
            spaceBefore: 300,
            spaceAfter: 150
          }),
          new Paragraph({
            spaceAfter: 200,
            children: [
              new TextRun({
                text: '500CC FITNESS CLUB is an enterprise-grade Gym Website and Subscription Management Portal. The platform provides a dual-interface architecture: a sleek, high-contrast dark-themed self-service portal for gym members and a lightweight, high-performance administrative command center for staff.',
                size: 22
              })
            ]
          }),
          new Paragraph({
            spaceAfter: 200,
            children: [
              new TextRun({
                text: `Current System Metrics (Live Auto-Sync):`,
                bold: true,
                size: 22
              }),
              new TextRun({
                text: ` Registered Members: ${metrics.userCount}  |  Active Subscriptions: ${metrics.activeMemCount}  |  Recorded Invoices: ${metrics.paymentCount}`,
                size: 22,
                color: '1E40AF'
              })
            ]
          }),

          // Section 2: Technical Architecture & Technology Stack
          new Paragraph({
            text: '2. Technical Architecture & Tech Stack',
            heading: HeadingLevel.HEADING_1,
            spaceBefore: 400,
            spaceAfter: 150
          }),
          new Paragraph({
            spaceAfter: 150,
            children: [
              new TextRun({ text: '• Backend Core: ', bold: true }),
              new TextRun('Node.js runtime with Express.js REST API framework.')
            ]
          }),
          new Paragraph({
            spaceAfter: 150,
            children: [
              new TextRun({ text: '• Frontend UI: ', bold: true }),
              new TextRun('Vanilla HTML5, modern CSS3 design system with custom properties, glassmorphism, and responsive CSS Grid/Flexbox layouts.')
            ]
          }),
          new Paragraph({
            spaceAfter: 150,
            children: [
              new TextRun({ text: '• Security & Authentication: ', bold: true }),
              new TextRun('JSON Web Tokens (JWT) for stateless session handling and bcryptjs for salted password hashing.')
            ]
          }),
          new Paragraph({
            spaceAfter: 150,
            children: [
              new TextRun({ text: '• PDF Engine: ', bold: true }),
              new TextRun('PDFKit vector graphics library for automated billing receipt generation and landscape Member Registry PDF reports.')
            ]
          }),
          new Paragraph({
            spaceAfter: 150,
            children: [
              new TextRun({ text: '• Containerization: ', bold: true }),
              new TextRun('Docker & Docker Compose containerized deployment (image tag: ranjith2006/gym-website:latest).')
            ]
          }),

          // Section 3: REST API Specifications
          new Paragraph({
            text: '3. Core REST API Endpoint Specifications',
            heading: HeadingLevel.HEADING_1,
            spaceBefore: 400,
            spaceAfter: 150
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'HTTP Method', bold: true })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Endpoint URI', bold: true })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Auth Required', bold: true })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Description', bold: true })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('POST')] }),
                  new TableCell({ children: [new Paragraph('/api/auth/register')] }),
                  new TableCell({ children: [new Paragraph('Public')] }),
                  new TableCell({ children: [new Paragraph('Register new client member account.')] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('POST')] }),
                  new TableCell({ children: [new Paragraph('/api/auth/login')] }),
                  new TableCell({ children: [new Paragraph('Public')] }),
                  new TableCell({ children: [new Paragraph('Authenticate member or admin; returns JWT.')] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('GET')] }),
                  new TableCell({ children: [new Paragraph('/api/admin/clients')] }),
                  new TableCell({ children: [new Paragraph('JWT (ADMIN)')] }),
                  new TableCell({ children: [new Paragraph('Fetch all member profiles & statuses.')] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('PUT')] }),
                  new TableCell({ children: [new Paragraph('/api/admin/client/:id')] }),
                  new TableCell({ children: [new Paragraph('JWT (ADMIN)')] }),
                  new TableCell({ children: [new Paragraph('Update member profile details & plan dates.')] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('DELETE')] }),
                  new TableCell({ children: [new Paragraph('/api/admin/client/:id')] }),
                  new TableCell({ children: [new Paragraph('JWT (ADMIN)')] }),
                  new TableCell({ children: [new Paragraph('Permanently delete member profile.')] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('GET')] }),
                  new TableCell({ children: [new Paragraph('/api/admin/export-pdf')] }),
                  new TableCell({ children: [new Paragraph('JWT (ADMIN)')] }),
                  new TableCell({ children: [new Paragraph('Stream formatted landscape PDF member report.')] })
                ]
              })
            ]
          }),

          // Section 4: Data Models & Persistence
          new Paragraph({
            text: '4. Database Schemas & Data Persistence',
            heading: HeadingLevel.HEADING_1,
            spaceBefore: 400,
            spaceAfter: 150
          }),
          new Paragraph({
            spaceAfter: 200,
            children: [
              new TextRun({
                text: 'The database is stored in Database/gym_data.json as a JSON document store with four primary entities: users, memberships, payments, and notifications. Each record is indexed by unique business keys (e.g. CLT-XXXX, MEM-XXXX, PAY-XXXX, INV-YYYY-XXXX).',
                size: 22
              })
            ]
          }),

          // Section 5: Operations & Container Deployment
          new Paragraph({
            text: '5. Operations & Container Deployment',
            heading: HeadingLevel.HEADING_1,
            spaceBefore: 400,
            spaceAfter: 150
          }),
          new Paragraph({
            spaceAfter: 150,
            children: [
              new TextRun({ text: '• Local Docker Execution: ', bold: true }),
              new TextRun('docker compose up -d --build')
            ]
          }),
          new Paragraph({
            spaceAfter: 150,
            children: [
              new TextRun({ text: '• Docker Hub Image: ', bold: true }),
              new TextRun('ranjith2006/gym-website:latest')
            ]
          }),
          new Paragraph({
            spaceAfter: 150,
            children: [
              new TextRun({ text: '• Automatic Doc Sync Command: ', bold: true }),
              new TextRun('npm run doc')
            ]
          })
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(DOCX_PATH, buffer);
  console.log(`[Doc Generator] Word Document generated: ${DOCX_PATH}`);
}

function generateMarkdownDocumentation() {
  const metrics = getLiveMetrics();

  const mdContent = `# 500CC FITNESS CLUB — Enterprise Technical Documentation
> **Version**: ${metrics.dbVersion}  
> **Last Auto-Updated**: ${metrics.generatedDate}  
> **Repository Tag**: \`ranjith2006/gym-website:latest\`

---

## 1. Executive Summary

**500CC FITNESS CLUB** is a full-featured Gym Website and Subscription Management System designed to streamline member onboarding, offline reception billing, renewal tracking, invoice PDF generation, and administrative reporting.

### Live Metrics Sync
- **Total Registered Members**: \`${metrics.userCount}\`
- **Active Subscriptions**: \`${metrics.activeMemCount}\`
- **Payment Invoices Issued**: \`${metrics.paymentCount}\`

---

## 2. System Architecture & Tech Stack

- **Backend**: Node.js (v20+), Express.js REST API
- **Frontend**: Vanilla HTML5, CSS3 Custom Properties (Dual Dark/Light Design System), JS (ES6+)
- **Security**: JWT Stateless Tokens (\`jsonwebtoken\`), \`bcryptjs\` Password Hashing
- **Reporting & Invoicing**: PDFKit Vector Engine (\`pdfkit\`)
- **Storage**: Lightweight Document Store (\`Database/gym_data.json\`)
- **Containerization**: Docker Compose (\`ranjith2006/gym-website:latest\`)

---

## 3. Core REST API Endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| \`POST\` | \`/api/auth/register\` | Public | Onboard new gym member |
| \`POST\` | \`/api/auth/login\` | Public | Member / Admin authentication |
| \`GET\` | \`/api/client/profile\` | JWT Client | Fetch member dashboard profile |
| \`GET\` | \`/api/admin/clients\` | JWT Admin | Fetch all member records & statuses |
| \`POST\` | \`/api/admin/renew\` | JWT Admin | Record offline cash/UPI payment |
| \`PUT\` | \`/api/admin/client/:id\` | JWT Admin | Edit member profile & due date |
| \`DELETE\` | \`/api/admin/client/:id\` | JWT Admin | Permanently delete member record |
| \`GET\` | \`/api/admin/export-pdf\` | JWT Admin | Stream landscape PDF registry report |
| \`GET\` | \`/api/invoices/:invoiceNumber/pdf\` | Public/JWT | Download billing receipt PDF |

---

## 4. Key Workflows & Features

1. **In-Person Renewal Billing**: Staff records payments directly at reception desk with auto invoice generation.
2. **Landscape PDF Exporter**: Generates formatted printable member registry PDF reports with custom filters.
3. **1-Click WhatsApp Quick Reminder**: Admin can trigger personalized WhatsApp reminders to members with 1 click.
4. **Auto-Updating Documentation**: Running \`npm run doc\` scans live database models and regenerates both Word (\`.docx\`) and Markdown (\`.md\`) documents automatically.

---

## 5. Maintenance & Deployment

\`\`\`bash
# Auto-update documentation
npm run doc

# Rebuild local Docker container
docker compose up -d --build

# Push image to Docker Hub
docker push ranjith2006/gym-website:latest
\`\`\`
`;

  fs.writeFileSync(MD_PATH, mdContent, 'utf8');
  console.log(`[Doc Generator] Markdown Documentation generated: ${MD_PATH}`);
}

async function run() {
  generateMarkdownDocumentation();
  await generateDocxDocumentation();
}

module.exports = {
  generateDocxDocumentation,
  generateMarkdownDocumentation,
  run
};

if (require.main === module) {
  run().catch(console.error);
}
