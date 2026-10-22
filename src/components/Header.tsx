import React from 'react';
import { ActivePage } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Plus, ReceiptText, LogOut, CalendarPlus, Menu } from 'lucide-react';

interface HeaderProps {
  activePage: ActivePage;
  onOpenNewAppointment?: () => void;
  onOpenNewBill?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  onOpenNewAppointment,
  onOpenNewBill,
  onToggleMobileMenu,
}) => {
  const { user, logout } = useAuth();

  const pageTitles: Record<ActivePage, { title: string; subtitle: string }> = {
    dashboard: { title: 'Operations Dashboard', subtitle: "Daily salon KPIs, today's appointments, and sales breakdown" },
    appointments: { title: 'Appointment Scheduling', subtitle: 'Book, manage stylists, and track client calendar' },
    pos: { title: 'Billing & Point of Sale', subtitle: 'Issue GST compliant tax invoices and accept payments' },
    customers: { title: 'Customer Directory', subtitle: 'Manage client profiles, past visits, and styling notes' },
    services: { title: 'Services & Pricing Menu', subtitle: 'Configure salon treatments, durations, and GST rates' },
    staff: { title: 'Stylist & Staff Roster', subtitle: 'Manage stylist commission, working hours, and workload' },
    inventory: { title: 'Salon Inventory & Retail', subtitle: 'Track product stock levels, alerts, and usage movements' },
    expenses: { title: 'Operating Expenses', subtitle: 'Record salon rent, utilities, salaries, and daily supplies' },
    reports: { title: 'Analytics & Financial Reports', subtitle: 'Review revenue, taxes, margins, and download CSV' },
    users: { title: 'User & Role Management', subtitle: 'Administer salon team members, invitations, and role privileges' },
    settings: { title: 'Salon Configuration', subtitle: 'Business address, GSTIN, invoice print preferences' },
  };

  const current = pageTitles[activePage] || { title: 'Saloonify', subtitle: 'Salon Management System' };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0">
      {/* Mobile Menu Button & Breadcrumb */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 md:hidden transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
            {current.title}
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block truncate">{current.subtitle}</p>
        </div>
      </div>

      {/* Actions & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenNewAppointment && (
          <button
            type="button"
            onClick={onOpenNewAppointment}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors shadow-2xs whitespace-nowrap"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-sky-600" />
            <span>New Appointment</span>
          </button>
        )}

        {onOpenNewBill && (
          <button
            type="button"
            onClick={onOpenNewBill}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs whitespace-nowrap"
          >
            <ReceiptText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New POS Bill</span>
            <span className="sm:hidden">Bill</span>
          </button>
        )}

        {/* User Card */}
        {user && (
          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-sky-100 flex items-center justify-center text-sky-800 font-bold text-xs shrink-0 border border-slate-200">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-none">{user.name}</span>
              <span className="text-[10px] text-slate-500 capitalize">{user.role}</span>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Log out"
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
