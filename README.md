# 500CC FITNESS CLUB - Gym Membership & Subscription Management System

A complete web application for gym membership tracking, in-person payment recording, PDF invoice generation, and automated SMTP 2-day expiry reminders.

## Project Structure

- `HTML and CSS/` - Public site (`index.html`), Member Profile (`profile.html`), Admin Portal (`admin.html`), and Stylesheet (`styles.css`).
- `Java Script/` - Express server (`server.js`), Auth (`auth.js`), DB logic (`db.js`), PDF Invoice Generator (`invoice.js`), SMTP Mailer (`mailer.js`), and Client Interactivity (`main.js`).
- `Image and Video/` - Media assets and gym imagery.
- `Database/` - JSON/SQLite persistence (`gym_data.json`).
- `Invoices/` - Storage location for generated PDF invoices.
- `Config/` - Environment settings (`.env`).

## Quick Start

```bash
# 1. Install dependencies
cmd /c npm install

# 2. Start server
npm start
```

Open `http://localhost:3000/HTML%20and%20CSS/index.html` in your browser.

## Default Credentials

- **Admin Login**: `Admin01` / Password: `12345`
- **Client Login**: Username (Full Name e.g. `Rahul Sharma`) or Email (`rahul.sharma@example.com`) / Password: `12345`

## Docker Deployment

```bash
# 1. Build Docker image under your Docker Hub account
docker build -t ranjith2006/gym-website:latest .

# 2. Run with Docker Compose
docker compose up -d

# 3. Push to Docker Hub
docker push ranjith2006/gym-website:latest
```


