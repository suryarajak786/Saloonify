export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff' | 'receptionist';
  phone?: string;
  avatar?: string;
  salonId?: string;
  salonName?: string;
  isActive?: boolean;
  lastLogin?: string;
  createdAt?: string;
}

export interface Invitation {
  _id: string;
  id?: string;
  salonId: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'manager' | 'staff';
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  createdBy?: string;
  expiresAt: string;
  createdAt: string;
  salonName?: string;
}

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  gender: 'female' | 'male' | 'other';
  birthdate?: string;
  anniversary?: string;
  address?: string;
  notes?: string;
  preferences?: string;
  totalVisits: number;
  totalSpent: number;
  lastVisitDate?: string;
  createdAt?: string;
}

export interface Service {
  _id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  durationMinutes: number;
  taxRate: number;
  isActive: boolean;
  genderTarget: 'all' | 'female' | 'male';
}

export interface Staff {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  specialties: string[];
  commissionPercentage: number;
  avatar?: string;
  isActive: boolean;
  schedule?: {
    days: string[];
    shiftStart: string;
    shiftEnd: string;
  };
  totalAppointments?: number;
  completedAppointments?: number;
  totalRevenue?: number;
}

export interface Appointment {
  _id: string;
  appointmentNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  staffId: string;
  staffName: string;
  services: Array<{
    serviceId: string;
    name: string;
    price: number;
    durationMinutes: number;
  }>;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  status: 'booked' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  totalAmount: number;
  createdAt?: string;
}

export interface InvoiceItem {
  itemId: string;
  itemType: 'service' | 'product';
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  totalAmount: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  staffId?: string;
  staffName?: string;
  appointmentId?: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  paymentMethod: 'cash' | 'upi' | 'card' | 'mixed';
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paidAmount: number;
  dueAmount: number;
  notes?: string;
}

export interface Product {
  _id: string;
  name: string;
  sku?: string;
  barcode?: string;
  brand?: string;
  category: string;
  purchaseCost: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockThreshold: number;
  unit: string;
  supplier?: string;
  taxRate: number;
}

export interface InventoryMovement {
  _id: string;
  productId: string;
  productName: string;
  type: 'purchase' | 'internal_use' | 'sale' | 'adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  date: string;
  performedBy: string;
  notes?: string;
}

export interface Expense {
  _id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: string;
  paidTo?: string;
  receiptNumber?: string;
  notes?: string;
}

export interface Settings {
  _id?: string;
  salonName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  defaultGstRate: number;
  currencySymbol: string;
  invoicePrefix: string;
  invoiceFooter: string;
  termsAndConditions: string;
  operatingHours: {
    open: string;
    close: string;
    workingDays: string[];
  };
}

export interface DashboardStats {
  todaySales: number;
  todayInvoicesCount: number;
  todayAppointmentsCount: number;
  completedToday: number;
  pendingToday: number;
  totalCustomers: number;
  totalServices: number;
  lowStockCount: number;
  lowStockItems: Product[];
  recentInvoices: Invoice[];
  upcomingAppointments: Appointment[];
  popularServices: Array<{ name: string; count: number; revenue: number }>;
  salesTrend: Array<{ date: string; dayName: string; sales: number; count: number }>;
  dbStatus: {
    isMysql?: boolean;
    isMongo?: boolean;
    engine: string;
    host?: string;
    port?: number | string;
    database?: string;
    error: string | null;
  };
}
