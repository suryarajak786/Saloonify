import {
  Customer,
  Service,
  Staff,
  Appointment,
  Invoice,
  Product,
  InventoryMovement,
  Expense,
  Settings,
  DashboardStats,
  User,
  Invitation
} from '../types';

const API_BASE = '/api';

function getHeaders(contentType: boolean = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  const token = localStorage.getItem('saloonify_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data && data.message) {
        errMsg = data.message;
      }
    } catch {
      // response wasn't JSON
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export const api = {
  // Auth & Setup
  async getSetupStatus(): Promise<{ success: boolean; needsSetup: boolean; userCount: number }> {
    const res = await fetch(`${API_BASE}/auth/setup-status`);
    return handleResponse(res);
  },

  async setupFirstAdmin(data: { name: string; email: string; password: string; phone?: string; salonName?: string }): Promise<{ success: boolean; token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/setup-first-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async login(credentials: { email: string; password: string }): Promise<{ success: boolean; token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async registerOwner(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    salonName: string;
    salonAddress?: string;
    gstin?: string;
  }): Promise<{ success: boolean; token: string; user: User; message: string }> {
    const res = await fetch(`${API_BASE}/auth/register-owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return handleResponse(res);
  },

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    return handleResponse(res);
  },

  async getInvitation(token: string): Promise<{ success: boolean; invitation: any }> {
    const res = await fetch(`${API_BASE}/auth/invite/${encodeURIComponent(token)}`);
    return handleResponse(res);
  },

  async acceptInvitation(data: {
    token: string;
    password: string;
    name?: string;
  }): Promise<{ success: boolean; token: string; user: User; message: string }> {
    const res = await fetch(`${API_BASE}/auth/accept-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Multi-User & Staff Accounts Management
  async getUsers(): Promise<{ success: boolean; users: User[] }> {
    const res = await fetch(`${API_BASE}/users`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async inviteUser(data: {
    name: string;
    email: string;
    phone?: string;
    role: 'admin' | 'manager' | 'staff';
  }): Promise<{ success: boolean; message: string; invitation: Invitation }> {
    const res = await fetch(`${API_BASE}/users/invite`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role: 'admin' | 'manager' | 'staff';
  }): Promise<{ success: boolean; message: string; user: User }> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateUser(
    id: string,
    data: { name?: string; phone?: string; role?: 'admin' | 'manager' | 'staff' }
  ): Promise<{ success: boolean; message: string; user: User }> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async toggleUserStatus(id: string, isActive: boolean): Promise<{ success: boolean; message: string; user: User }> {
    const res = await fetch(`${API_BASE}/users/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ isActive })
    });
    return handleResponse(res);
  },

  async adminResetPassword(id: string, temporaryPassword?: string): Promise<{ success: boolean; message: string; temporaryPassword: string }> {
    const res = await fetch(`${API_BASE}/users/${id}/reset-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ temporaryPassword })
    });
    return handleResponse(res);
  },

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getInvitations(): Promise<{ success: boolean; invitations: Invitation[] }> {
    const res = await fetch(`${API_BASE}/invitations`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async revokeInvitation(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/invitations/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Dashboard
  async getDashboardStats(): Promise<{ success: boolean; stats: DashboardStats }> {
    const res = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Customers
  async getCustomers(search?: string): Promise<{ success: boolean; customers: Customer[] }> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/customers${query}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getCustomerById(id: string): Promise<{ success: boolean; customer: Customer; appointments: Appointment[]; invoices: Invoice[] }> {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createCustomer(data: Partial<Customer>): Promise<{ success: boolean; customer: Customer }> {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<{ success: boolean; customer: Customer }> {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteCustomer(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Services
  async getServices(params?: { category?: string; search?: string; activeOnly?: boolean }): Promise<{ success: boolean; services: Service[] }> {
    const sp = new URLSearchParams();
    if (params?.category) sp.append('category', params.category);
    if (params?.search) sp.append('search', params.search);
    if (params?.activeOnly) sp.append('activeOnly', 'true');
    const qs = sp.toString() ? `?${sp.toString()}` : '';

    const res = await fetch(`${API_BASE}/services${qs}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createService(data: Partial<Service>): Promise<{ success: boolean; service: Service }> {
    const res = await fetch(`${API_BASE}/services`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateService(id: string, data: Partial<Service>): Promise<{ success: boolean; service: Service }> {
    const res = await fetch(`${API_BASE}/services/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteService(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/services/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Staff
  async getStaff(): Promise<{ success: boolean; staff: Staff[] }> {
    const res = await fetch(`${API_BASE}/staff`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createStaff(data: Partial<Staff>): Promise<{ success: boolean; staff: Staff }> {
    const res = await fetch(`${API_BASE}/staff`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateStaff(id: string, data: Partial<Staff>): Promise<{ success: boolean; staff: Staff }> {
    const res = await fetch(`${API_BASE}/staff/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteStaff(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/staff/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Appointments
  async getAppointments(params?: { date?: string; staffId?: string; status?: string; customerId?: string }): Promise<{ success: boolean; appointments: Appointment[] }> {
    const sp = new URLSearchParams();
    if (params?.date) sp.append('date', params.date);
    if (params?.staffId) sp.append('staffId', params.staffId);
    if (params?.status) sp.append('status', params.status);
    if (params?.customerId) sp.append('customerId', params.customerId);
    const qs = sp.toString() ? `?${sp.toString()}` : '';

    const res = await fetch(`${API_BASE}/appointments${qs}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createAppointment(data: {
    customerId: string;
    staffId: string;
    serviceIds: string[];
    appointmentDate: string;
    startTime: string;
    notes?: string;
    allowOverlap?: boolean;
  }): Promise<{ success: boolean; appointment: Appointment }> {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateAppointment(id: string, data: Partial<Appointment> & { allowOverlap?: boolean }): Promise<{ success: boolean; appointment: Appointment }> {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteAppointment(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Invoices & POS
  async getInvoices(params?: { startDate?: string; endDate?: string; paymentMethod?: string; search?: string }): Promise<{ success: boolean; invoices: Invoice[] }> {
    const sp = new URLSearchParams();
    if (params?.startDate) sp.append('startDate', params.startDate);
    if (params?.endDate) sp.append('endDate', params.endDate);
    if (params?.paymentMethod) sp.append('paymentMethod', params.paymentMethod);
    if (params?.search) sp.append('search', params.search);
    const qs = sp.toString() ? `?${sp.toString()}` : '';

    const res = await fetch(`${API_BASE}/invoices${qs}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getInvoiceById(id: string): Promise<{ success: boolean; invoice: Invoice; settings: Settings }> {
    const res = await fetch(`${API_BASE}/invoices/${id}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createInvoice(data: {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    staffId?: string;
    appointmentId?: string;
    items: any[];
    overallDiscountValue?: number;
    overallDiscountType?: 'percentage' | 'fixed';
    paymentMethod: string;
    paidAmount?: number;
    notes?: string;
  }): Promise<{
    success: boolean;
    invoice: Invoice;
    customer?: Customer;
    whatsApp?: { phone: string; messageText: string; waLink: string; apiConfigured: boolean };
  }> {
    const res = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getWhatsAppReceipt(invoiceId: string): Promise<{
    success: boolean;
    recipientPhone: string;
    customerPhone: string;
    customerName: string;
    messageText: string;
    waLink: string;
    apiConfigured: boolean;
  }> {
    const res = await fetch(`${API_BASE}/invoices/${invoiceId}/whatsapp-receipt`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async sendWhatsAppReceipt(invoiceId: string): Promise<{
    success: boolean;
    apiConfigured: boolean;
    message: string;
    waLink?: string;
    messageText?: string;
    details?: any;
  }> {
    const res = await fetch(`${API_BASE}/invoices/${invoiceId}/send-whatsapp`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Inventory
  async getInventory(params?: { search?: string; category?: string }): Promise<{ success: boolean; products: Product[] }> {
    const sp = new URLSearchParams();
    if (params?.search) sp.append('search', params.search);
    if (params?.category) sp.append('category', params.category);
    const qs = sp.toString() ? `?${sp.toString()}` : '';

    const res = await fetch(`${API_BASE}/inventory${qs}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createProduct(data: Partial<Product>): Promise<{ success: boolean; product: Product }> {
    const res = await fetch(`${API_BASE}/inventory`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<{ success: boolean; product: Product }> {
    const res = await fetch(`${API_BASE}/inventory/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async adjustStock(id: string, data: { type: string; quantity: number; notes?: string; performedBy?: string }): Promise<{ success: boolean; newStock: number; movement: InventoryMovement }> {
    const res = await fetch(`${API_BASE}/inventory/${id}/stock`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getInventoryMovements(): Promise<{ success: boolean; movements: InventoryMovement[] }> {
    const res = await fetch(`${API_BASE}/inventory/movements`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Expenses
  async getExpenses(params?: { category?: string; startDate?: string; endDate?: string }): Promise<{ success: boolean; expenses: Expense[] }> {
    const sp = new URLSearchParams();
    if (params?.category) sp.append('category', params.category);
    if (params?.startDate) sp.append('startDate', params.startDate);
    if (params?.endDate) sp.append('endDate', params.endDate);
    const qs = sp.toString() ? `?${sp.toString()}` : '';

    const res = await fetch(`${API_BASE}/expenses${qs}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createExpense(data: Partial<Expense>): Promise<{ success: boolean; expense: Expense }> {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteExpense(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Reports
  async getReportsSummary(startDate?: string, endDate?: string): Promise<{ success: boolean; report: any }> {
    const sp = new URLSearchParams();
    if (startDate) sp.append('startDate', startDate);
    if (endDate) sp.append('endDate', endDate);
    const qs = sp.toString() ? `?${sp.toString()}` : '';

    const res = await fetch(`${API_BASE}/reports/summary${qs}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Settings
  async getSettings(): Promise<{ success: boolean; settings: Settings }> {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async updateSettings(data: Partial<Settings>): Promise<{ success: boolean; settings: Settings }> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Reset/Seed
  async seedData(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/seed`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getDatabaseStatus(): Promise<{ success: boolean; status: any }> {
    const res = await fetch(`${API_BASE}/database/status`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getInvoiceItems(invoiceId: string): Promise<{ success: boolean; items: any[] }> {
    const res = await fetch(`${API_BASE}/invoices/${invoiceId}/items`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getInvoicePayments(invoiceId: string): Promise<{ success: boolean; payments: any[] }> {
    const res = await fetch(`${API_BASE}/invoices/${invoiceId}/payments`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async addInvoicePayment(invoiceId: string, data: { amount: number; paymentMethod?: string; transactionRef?: string; notes?: string }): Promise<{ success: boolean; payment: any; invoice: Invoice }> {
    const res = await fetch(`${API_BASE}/invoices/${invoiceId}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getHealth(): Promise<any> {
    const res = await fetch(`${API_BASE}/health`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};
