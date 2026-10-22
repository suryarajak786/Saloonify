import React, { useState, useEffect } from 'react';
import { DashboardStats, Invoice, Appointment, Settings } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  IndianRupee,
  CalendarCheck2,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Printer,
  Clock,
  Scissors,
  CheckCircle2,
  RefreshCw,
  Shield,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { PrintableInvoice } from '../components/PrintableInvoice';

interface DashboardPageProps {
  onNavigate: (page: any) => void;
  onOpenBillForAppointment?: (apt: Appointment) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenBillForAppointment }) => {
  const { user } = useAuth();
  const role = user?.role || 'staff';
  const isStaff = role === 'staff';
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, settingsRes] = await Promise.all([
        api.getDashboardStats(),
        api.getSettings()
      ]);
      if (statsRes.success) setStats(statsRes.stats);
      if (settingsRes.success) setSettings(settingsRes.settings);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleOpenPrint = async (invId: string) => {
    try {
      const res = await api.getInvoiceById(invId);
      if (res.success) {
        setSelectedInvoice(res.invoice);
        setSettings(res.settings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
          <span className="text-xs font-medium">Loading live salon operations...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center justify-between">
          <span>Failed to load operations data: {error}</span>
          <button type="button"
            onClick={fetchDashboard}
            className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const maxSalesInTrend = Math.max(...stats.salesTrend.map(d => d.sales), 1000);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner with Salon Showcase */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs bg-slate-900 text-white">
        <img
          src="/src/assets/images/salon_interior_banner_1792068955498.jpg"
          alt="Saloonify Salon Interior"
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
              <span>{settings?.salonName || 'Saloonify Luxury Salon & Spa'}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 text-sky-300 border border-slate-700 font-mono text-[10px]">
                {isAdmin ? <Shield className="w-3 h-3 text-amber-400" /> : isManager ? <ShieldCheck className="w-3 h-3 text-sky-400" /> : <UserCheck className="w-3 h-3 text-slate-300" />}
                {isAdmin ? 'OWNER / ADMIN' : isManager ? 'MANAGER' : 'STAFF / STYLIST'}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              {isStaff ? `Welcome, ${user?.name || 'Stylist'} — Staff Operations Console` : `Salon Overview & Front Desk Activity`}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Logged in as <strong className="text-white font-semibold">{user?.name}</strong> ({user?.email}) · {settings?.address ? `${settings.address}, ` : ''}{settings?.city || ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button"
              onClick={() => onNavigate('appointments')}
              className="px-3.5 py-2 bg-white text-slate-900 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors shadow-xs whitespace-nowrap"
            >
              {isStaff ? 'My Appointments' : 'Manage Appointments'}
            </button>
            <button type="button"
              onClick={() => onNavigate('pos')}
              className="px-3.5 py-2 bg-sky-500 text-white text-xs font-semibold rounded-lg hover:bg-sky-600 transition-colors shadow-xs whitespace-nowrap"
            >
              Open POS Register
            </button>
            {(isAdmin || isManager) && (
              <button type="button"
                onClick={() => onNavigate('users')}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors shadow-xs whitespace-nowrap"
              >
                Team & Roles
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Today's Sales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            ₹{stats.todaySales.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
            <span className="font-semibold text-slate-700">{stats.todayInvoicesCount}</span>
            <span>invoices settled today</span>
          </div>
        </div>

        {/* Appointments Today */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Appointments Today</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.todayAppointmentsCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-2">
            <span className="text-emerald-700 font-medium">{stats.completedToday} completed</span>
            <span>·</span>
            <span className="text-amber-700 font-medium">{stats.pendingToday} upcoming</span>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Customer Database</span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.totalCustomers}
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
            <span className="text-sky-700 font-medium">{stats.totalServices} catalog services</span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Inventory Health</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {stats.lowStockCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            {stats.lowStockCount > 0 ? (
              <span className="text-amber-700 font-medium">Items need restocking</span>
            ) : (
              <span className="text-emerald-700 font-medium">All items stocked</span>
            )}
          </div>
        </div>
      </div>

      {/* Mid Section: 7-Day Sales Trend & Popular Services */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Sales Bar Graph */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">7-Day Sales Trend</h3>
              <p className="text-xs text-slate-500">Daily gross revenue and transaction count</p>
            </div>
            <button type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              View Full Report <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2">
            {stats.salesTrend.map((day, idx) => {
              const heightPercent = Math.max(12, Math.round((day.sales / maxSalesInTrend) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[10px] font-mono text-slate-500 group-hover:text-slate-900 font-semibold tabular-nums">
                    ₹{day.sales > 0 ? day.sales.toLocaleString('en-IN') : '0'}
                  </div>
                  <div className="w-full max-w-[48px] bg-slate-100 rounded-t-md overflow-hidden h-32 flex items-end">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-sky-500 group-hover:bg-sky-600 transition-all rounded-t-md"
                    />
                  </div>
                  <div className="text-[11px] font-medium text-slate-600">
                    {day.dayName}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Popular Services */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top Booked Services</h3>
              <p className="text-xs text-slate-500">Most requested salon treatments</p>
            </div>
            <Scissors className="w-4 h-4 text-slate-400" />
          </div>

          <div className="flex-1 space-y-3">
            {stats.popularServices.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No service invoices recorded yet.</p>
            ) : (
              stats.popularServices.map((srv, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 text-xs">
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-slate-800 truncate">{srv.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 font-mono tabular-nums">{srv.count} orders</span>
                    <span className="block text-[10px] text-slate-500 font-mono">₹{srv.revenue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Upcoming Appointments & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Today & Upcoming Appointments</h3>
              <p className="text-xs text-slate-500">Client schedule queue</p>
            </div>
            <button type="button"
              onClick={() => onNavigate('appointments')}
              className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              Schedule View <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {stats.upcomingAppointments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No upcoming appointments scheduled.
              </div>
            ) : (
              stats.upcomingAppointments.map((apt) => (
                <div
                  key={apt._id}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4 transition-colors text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{apt.customerName}</span>
                      <span className="text-[11px] text-slate-500 font-mono">({apt.customerPhone.slice(-10)})</span>
                      <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                        apt.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
                        apt.status === 'confirmed' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {apt.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {apt.appointmentDate} · {apt.startTime} - {apt.endTime}
                      </span>
                      <span>·</span>
                      <span className="text-slate-700 font-medium">{apt.staffName}</span>
                    </div>

                    <div className="text-[11px] text-slate-600 font-medium">
                      {apt.services.map(s => s.name).join(', ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onOpenBillForAppointment && (
                      <button type="button"
                        onClick={() => onOpenBillForAppointment(apt)}
                        className="px-2.5 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold rounded-lg text-xs transition-colors"
                      >
                        Bill at POS
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Settled Invoices</h3>
              <p className="text-xs text-slate-500">Point of sale transactions</p>
            </div>
            <button type="button"
              onClick={() => onNavigate('pos')}
              className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              Open POS <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.recentInvoices.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No invoices issued yet.
              </div>
            ) : (
              stats.recentInvoices.map((inv) => (
                <div key={inv._id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-900">{inv.invoiceNumber}</span>
                      <span className="text-slate-500">·</span>
                      <span className="font-medium text-slate-800">{inv.customerName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Paid via <span className="uppercase font-semibold text-slate-700">{inv.paymentMethod}</span> · {new Date(inv.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 font-mono tabular-nums text-sm">
                      ₹{inv.grandTotal.toLocaleString('en-IN')}
                    </span>
                    <button type="button"
                      onClick={() => handleOpenPrint(inv._id)}
                      title="Print Invoice"
                      className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && settings && (
        <PrintableInvoice
          invoice={selectedInvoice}
          settings={settings}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};
