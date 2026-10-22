# Saloonify — Salon Operations & Management System

Saloonify is a modern salon management web application inspired by the business workflow of [Salonify](https://www.salonify.in/). It empowers salon and spa owners to oversee daily operations through a single, responsive dashboard: appointment scheduling, GST billing and point-of-sale (POS) with printable receipts (A4 and 80mm thermal receipts), WhatsApp receipt integration, customer management, inventory tracking with stock-movement logs, operating expense tracking, staff rosters, and financial analytics.

---

## Architecture Overview

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide icons, Motion, Vite.
  - The frontend never connects directly to PostgreSQL and does not contain any database credentials or secret keys.
  - All communication is routed through the secure Express backend APIs (`/api/*`).
- **Backend**: Node.js + Express REST API in the `backend/` directory (`server.ts`, `backend/routes/api.ts`, `backend/database.ts`).
  - JWT authentication with bcrypt password hashing.
  - Server-side calculation and strict validation of invoice totals, discounts, CGST/SGST tax breakdown, and payments.
- **Database Layer**:
  - **PostgreSQL** configured using the official `pg` package (`pg.Pool`).
  - Comprehensive PostgreSQL schema defined in `backend/db/schema.sql`:
    - `customers`: Persistent client records with phone uniqueness, visit counts, and total spending.
    - `services`: Salon service catalog, duration, category, and tax rates.
    - `appointments`: Scheduling, stylist assignments, and calendar workflows.
    - `invoices`: Invoices with full totals, GST amounts, discount logic, and payment status.
    - `invoice_items`: Normalized line-item table linked to invoices.
    - `payments`: Normalized payment history and transaction records.
    - `staff`, `products`, `inventory_movements`, `expenses`, `settings`, `users`.
  - Resilient zero-downtime architecture: when PostgreSQL is connected, all operations run on PostgreSQL; in local sandboxes without an active PostgreSQL daemon, it seamlessly falls back to persistent disk storage (`data/saloonify_db.json`) so the application never crashes.

---

## Local Setup & Configuration

Follow these steps to set up and run Saloonify locally with Node.js, Express, and PostgreSQL.

### Step 1: Install Node.js
- Download and install **Node.js (v18 or v20+ LTS)** from [nodejs.org](https://nodejs.org/).
- Verify installation:
  ```bash
  node -v
  npm -v
  ```

### Step 2: Install & Start PostgreSQL
Ensure PostgreSQL is installed and running on your system:
- **macOS (Homebrew)**:
  ```bash
  brew install postgresql@16
  brew services start postgresql@16
  createdb saloonify
  ```
- **Ubuntu/Debian Linux**:
  ```bash
  sudo apt update
  sudo apt install postgresql postgresql-contrib
  sudo systemctl start postgresql
  sudo -u postgres createdb saloonify
  ```
- **Windows**:
  - Download and run the PostgreSQL installer from [postgresql.org/download/windows/](https://www.postgresql.org/download/windows/).
  - Ensure the PostgreSQL service is running and create the `saloonify` database via pgAdmin or `createdb -U postgres saloonify`.

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and configure your PostgreSQL database connection:
```env
PORT=3000
NODE_ENV=development

# PostgreSQL Connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/saloonify

# Or individual variables:
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_postgres_password
PGDATABASE=saloonify
PGSSL=false

# Authentication Secret
JWT_SECRET=saloonify-secure-jwt-key-2026

# WhatsApp Business API (Optional)
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

### Step 4: Install Dependencies
```bash
npm install
```

### Step 5: Initialize the PostgreSQL Database Schema
Run the database migration script to create all required tables (`customers`, `services`, `appointments`, `invoices`, `invoice_items`, `payments`, etc.):
```bash
npm run db:init
```

### Step 6: Start Frontend & Backend
Run the development server:
```bash
npm run dev
```
This starts the Node.js + Express backend on port `3000` with the Vite development server mounted via middleware. Open your browser and navigate to:
```
http://localhost:3000
```

### Step 7: Production Build & Deployment
To compile for production:
```bash
npm run build
npm start
```

---

## Key Features & Endpoints

### 1. POS Billing & Customer Management
- **Customer Auto-Complete & Search**: `GET /api/customers?search=...` searches existing clients by name or phone number.
- **Automatic Customer Storage**: `POST /api/invoices` automatically creates or updates the customer's record and links the invoice.
- **Server-Side Validation**: Line-item subtotals, item and overall discounts, CGST (9%) and SGST (9%), grand totals, round-off, and payment amounts are validated and calculated on the backend.
- **Normalized Storage**:
  - `invoices`: Master invoice record.
  - `invoice_items`: Individual service and product line items.
  - `payments`: Payment records and audit trails.
- **WhatsApp Receipts**:
  - Click-to-chat receipt URL with clean formatting ready to review and send.
  - Direct WhatsApp Cloud API support when environment credentials are provided.

### 2. Database Health & Inspection
- Check database engine status at `GET /api/database/status`.
- Response indicates active engine (`postgresql` or persistent store) and connection state.
