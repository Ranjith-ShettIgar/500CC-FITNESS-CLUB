# 500CC FITNESS CLUB — Enterprise Technical Documentation
> **Version**: 1.0.0  
> **Last Auto-Updated**: September 3, 2026  
> **Repository Tag**: `ranjith2006/gym-website:latest`

---

## 1. Executive Summary

**500CC FITNESS CLUB** is a full-featured Gym Website and Subscription Management System designed to streamline member onboarding, offline reception billing, renewal tracking, invoice PDF generation, and administrative reporting.

### Live Metrics Sync
- **Total Registered Members**: `3`
- **Active Subscriptions**: `2`
- **Payment Invoices Issued**: `1`

---

## 2. System Architecture & Tech Stack

- **Backend**: Node.js (v20+), Express.js REST API
- **Frontend**: Vanilla HTML5, CSS3 Custom Properties (Dual Dark/Light Design System), JS (ES6+)
- **Security**: JWT Stateless Tokens (`jsonwebtoken`), `bcryptjs` Password Hashing
- **Reporting & Invoicing**: PDFKit Vector Engine (`pdfkit`)
- **Storage**: Lightweight Document Store (`Database/gym_data.json`)
- **Containerization**: Docker Compose (`ranjith2006/gym-website:latest`)

---

## 3. Core REST API Endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Onboard new gym member |
| `POST` | `/api/auth/login` | Public | Member / Admin authentication |
| `GET` | `/api/client/profile` | JWT Client | Fetch member dashboard profile |
| `GET` | `/api/admin/clients` | JWT Admin | Fetch all member records & statuses |
| `POST` | `/api/admin/renew` | JWT Admin | Record offline cash/UPI payment |
| `PUT` | `/api/admin/client/:id` | JWT Admin | Edit member profile & due date |
| `DELETE` | `/api/admin/client/:id` | JWT Admin | Permanently delete member record |
| `GET` | `/api/admin/export-pdf` | JWT Admin | Stream landscape PDF registry report |
| `GET` | `/api/invoices/:invoiceNumber/pdf` | Public/JWT | Download billing receipt PDF |

---

## 4. Key Workflows & Features

1. **In-Person Renewal Billing**: Staff records payments directly at reception desk with auto invoice generation.
2. **Landscape PDF Exporter**: Generates formatted printable member registry PDF reports with custom filters.
3. **1-Click WhatsApp Quick Reminder**: Admin can trigger personalized WhatsApp reminders to members with 1 click.
4. **Auto-Updating Documentation**: Running `npm run doc` scans live database models and regenerates both Word (`.docx`) and Markdown (`.md`) documents automatically.

---

## 5. Maintenance & Deployment

```bash
# Auto-update documentation
npm run doc

# Rebuild local Docker container
docker compose up -d --build

# Push image to Docker Hub
docker push ranjith2006/gym-website:latest
```
