import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  ReceiptText,
  Users2,
  Scissors,
  UserCheck,
  Package,
  CreditCard,
  BarChart3,
  Settings as SettingsIcon,
  Database,
  ShieldCheck,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ActivePage =
  | 'dashboard'
  | 'appointments'
  | 'pos'
  | 'customers'
  | 'services'
  | 'staff'
  | 'inventory'
  | 'expenses'
  | 'reports'
  | 'users'
  | 'settings';

interface SidebarProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  dbEngine?: string;
  isPostgres?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  dbEngine = 'PostgreSQL Database',
  isPostgres = true,
  isOpen = false,
  onClose,
}) => {
  const { user } = useAuth();
  const role = user?.role || 'staff';

  const allNavItems: Array<{
    id: ActivePage;
    label: string;
    icon: React.FC<{ className?: string }>;
    allowedRoles: Array<'admin' | 'manager' | 'staff'>;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: ['admin', 'manager', 'staff'] },
    { id: 'appointments', label: 'Appointments', icon: CalendarDays, allowedRoles: ['admin', 'manager', 'staff'] },
    { id: 'pos', label: 'Billing / POS', icon: ReceiptText, allowedRoles: ['admin', 'manager', 'staff'] },
    { id: 'customers', label: 'Customers', icon: Users2, allowedRoles: ['admin', 'manager', 'staff'] },
    { id: 'services', label: 'Services & Pricing', icon: Scissors, allowedRoles: ['admin', 'manager'] },
    { id: 'staff', label: 'Staff Roster', icon: UserCheck, allowedRoles: ['admin', 'manager'] },
    { id: 'inventory', label: 'Inventory', icon: Package, allowedRoles: ['admin', 'manager'] },
    { id: 'expenses', label: 'Expenses', icon: CreditCard, allowedRoles: ['admin', 'manager'] },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, allowedRoles: ['admin'] },
    { id: 'users', label: 'User & Roles', icon: ShieldCheck, allowedRoles: ['admin', 'manager'] },
    { id: 'settings', label: 'Salon Settings', icon: SettingsIcon, allowedRoles: ['admin'] },
  ];

  // Filter navigation items by role
  const visibleNavItems = allNavItems.filter((item) =>
    item.allowedRoles.includes(role as any)
  );

  const handleNavClick = (page: ActivePage) => {
    setActivePage(page);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden animate-in fade-in duration-150"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 select-none shadow-xl md:shadow-none transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/src/assets/images/saloonify_logo_mark_1792068954558.jpg"
              alt="Saloonify Logo"
              className="w-8 h-8 rounded-lg object-contain border border-slate-200/80 shadow-2xs shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base tracking-tight text-slate-900 leading-none truncate">
                Saloonify
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                {user?.salonName || 'Salon Operations'}
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 md:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Badge Banner */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
            {role === 'admin' ? (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            ) : role === 'manager' ? (
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            ) : (
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="capitalize">{role === 'admin' ? 'Owner / Admin' : role}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            {role === 'admin' ? 'Full Access' : role === 'manager' ? 'Ops Access' : 'Staff Access'}
          </span>
        </div>

        {/* Nav List */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-sky-50 text-sky-800 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                <span className="whitespace-nowrap truncate">{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-600 shrink-0" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Info & DB Status */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/70 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 truncate">
              <Database className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="truncate max-w-[125px] font-medium text-slate-800">PostgreSQL</span>
            </div>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                isPostgres
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-sky-100 text-sky-800'
              }`}
            >
              {isPostgres ? 'POSTGRES' : 'PERSISTENT'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
