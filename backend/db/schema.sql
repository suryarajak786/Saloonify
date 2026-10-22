-- Saloonify Salon Management System
-- PostgreSQL Database Schema Definition

-- 1. Salons Table (Multi-tenant business entity)
CREATE TABLE IF NOT EXISTS salons (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id VARCHAR(64),
  phone VARCHAR(50) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  address TEXT DEFAULT '',
  gstin VARCHAR(50) DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table (Multi-role accounts: admin/owner, manager, staff)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  salon_id VARCHAR(64) REFERENCES salons(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'staff',
  phone VARCHAR(50) DEFAULT '',
  avatar TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_salon_id ON users(salon_id);

-- 3. Invitations Table (Staff & Manager activation flow)
CREATE TABLE IF NOT EXISTS invitations (
  id VARCHAR(64) PRIMARY KEY,
  salon_id VARCHAR(64) NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  token VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  created_by VARCHAR(64),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_salon ON invitations(salon_id);

-- 4. Password Resets Table
CREATE TABLE IF NOT EXISTS password_resets (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);

-- 5. Staff Table (Stylists & Technicians)
CREATE TABLE IF NOT EXISTS staff (
  id VARCHAR(64) PRIMARY KEY,
  salon_id VARCHAR(64) REFERENCES salons(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) DEFAULT '',
  role VARCHAR(100) NOT NULL,
  specialties JSONB DEFAULT '[]'::jsonb,
  commission_percentage NUMERIC(5,2) DEFAULT 0,
  avatar TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  schedule JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) PRIMARY KEY,
  salon_id VARCHAR(64) REFERENCES salons(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) DEFAULT '',
  gender VARCHAR(20) DEFAULT 'female',
  birthdate VARCHAR(20) DEFAULT '',
  anniversary VARCHAR(20) DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  preferences TEXT DEFAULT '',
  total_visits INTEGER DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0,
  last_visit_date VARCHAR(50) DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- 7. Services Table (Salon Catalog)
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(64) PRIMARY KEY,
  salon_id VARCHAR(64) REFERENCES salons(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 18.00,
  is_active BOOLEAN DEFAULT TRUE,
  gender_target VARCHAR(20) DEFAULT 'all',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);

-- 8. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(64) PRIMARY KEY,
  salon_id VARCHAR(64) REFERENCES salons(id) ON DELETE CASCADE,
  appointment_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  staff_id VARCHAR(64) DEFAULT '',
  staff_name VARCHAR(255) DEFAULT '',
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  appointment_date VARCHAR(20) NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  status VARCHAR(50) DEFAULT 'booked',
  notes TEXT DEFAULT '',
  total_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);

-- 9. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(64) PRIMARY KEY,
  salon_id VARCHAR(64) REFERENCES salons(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_address TEXT DEFAULT '',
  staff_id VARCHAR(64) DEFAULT '',
  staff_name VARCHAR(255) DEFAULT '',
  appointment_id VARCHAR(64) DEFAULT '',
  date VARCHAR(50) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  taxable_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  cgst_total NUMERIC(12,2) DEFAULT 0,
  sgst_total NUMERIC(12,2) DEFAULT 0,
  total_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  round_off NUMERIC(6,2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'cash',
  payment_status VARCHAR(50) DEFAULT 'paid',
  paid_amount NUMERIC(12,2) DEFAULT 0,
  due_amount NUMERIC(12,2) DEFAULT 0,
  tax_mode VARCHAR(20) DEFAULT 'exclusive',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- 10. Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id VARCHAR(64) PRIMARY KEY,
  invoice_id VARCHAR(64) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_id VARCHAR(64) DEFAULT '',
  item_type VARCHAR(50) DEFAULT 'service',
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_type VARCHAR(20) DEFAULT 'percentage',
  discount_value NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  taxable_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 18.00,
  cgst_rate NUMERIC(5,2) DEFAULT 9.00,
  cgst_amount NUMERIC(10,2) DEFAULT 0,
  sgst_rate NUMERIC(5,2) DEFAULT 9.00,
  sgst_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- 11. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  invoice_id VARCHAR(64) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id VARCHAR(64) DEFAULT '',
  amount NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'completed',
  transaction_ref VARCHAR(100) DEFAULT '',
  payment_date VARCHAR(50) NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);

-- 12. Products Table (Inventory)
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  salon_id VARCHAR(64) REFERENCES salons(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL,
  purchase_cost NUMERIC(10,2) NOT NULL,
  selling_price NUMERIC(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_threshold INTEGER DEFAULT 5,
  unit VARCHAR(50) DEFAULT 'pcs',
  supplier VARCHAR(255) DEFAULT '',
  tax_rate NUMERIC(5,2) DEFAULT 18.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Inventory Movements
CREATE TABLE IF NOT EXISTS inventory_movements (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  date VARCHAR(50) NOT NULL,
  performed_by VARCHAR(255) DEFAULT 'Admin',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(64) PRIMARY KEY,
  salon_id VARCHAR(64) REFERENCES salons(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  date VARCHAR(20) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'cash',
  paid_to VARCHAR(255) DEFAULT '',
  receipt_number VARCHAR(100) DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(64) PRIMARY KEY,
  salon_id VARCHAR(64) REFERENCES salons(id) ON DELETE CASCADE,
  salon_name VARCHAR(255) DEFAULT 'Saloonify Luxury Salon & Spa',
  tagline VARCHAR(255) DEFAULT 'Style, Care & Elegance Redefined',
  phone VARCHAR(50) DEFAULT '+91 98765 43210',
  email VARCHAR(255) DEFAULT 'care@saloonify.in',
  address TEXT DEFAULT '100 Feet Road, Indiranagar',
  city VARCHAR(100) DEFAULT 'Bengaluru',
  state VARCHAR(100) DEFAULT 'Karnataka',
  pincode VARCHAR(20) DEFAULT '560038',
  gstin VARCHAR(50) DEFAULT '29ABCDE1234F1Z5',
  default_gst_rate NUMERIC(5,2) DEFAULT 18.00,
  tax_mode VARCHAR(20) DEFAULT 'exclusive',
  currency_symbol VARCHAR(10) DEFAULT '₹',
  invoice_prefix VARCHAR(20) DEFAULT 'INV',
  invoice_footer TEXT DEFAULT 'Thank you for choosing Saloonify! We look forward to pampering you again.',
  terms_and_conditions TEXT DEFAULT 'All services rendered are non-refundable. Please preserve this invoice for future warranty on treatments.',
  operating_hours JSONB DEFAULT '[]'::jsonb,
  whatsapp_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
