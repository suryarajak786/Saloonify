import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, ActivePage } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { PosBillingPage } from './pages/PosBillingPage';
import { CustomersPage } from './pages/CustomersPage';
import { ServicesPage } from './pages/ServicesPage';
import { StaffPage } from './pages/StaffPage';
import { InventoryPage } from './pages/InventoryPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UsersPage } from './pages/UsersPage';
import { LoginPage } from './pages/LoginPage';
import { Appointment } from './types';
import { api } from './services/api';
import { RefreshCw, ShieldAlert } from 'lucide-react';

function SaloonifyApp() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ isPostgres: boolean; engine: string } | null>(null);
  const [posAppointment, setPosAppointment] = useState<Appointment | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  const fetchDbStatus = async () => {
    try {
      const res = await api.getHealth();
      if (res.success && res.database) {
        setDbStatus({
          isPostgres: res.database.isPostgres || false,
          engine: res.database.engine || 'PostgreSQL',
        });
      }
    } catch {
      // offline or loading
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDbStatus();
    }
  }, [isAuthenticated]);

  // Role-based Access Enforcement and Redirection
  useEffect(() => {
    if (user) {
      const role = user.role || 'staff';
      const staffAllowed: ActivePage[] = ['dashboard', 'appointments', 'pos', 'customers'];
      const managerAllowed: ActivePage[] = [
        ...staffAllowed,
        'services',
        'staff',
        'inventory',
        'expenses',
        'users'
      ];

      if (role === 'staff' && !staffAllowed.includes(activePage)) {
        setAccessDeniedMessage(`Access restricted: Staff accounts cannot access the ${activePage} module.`);
        setActivePage('dashboard');
        setTimeout(() => setAccessDeniedMessage(null), 4000);
      } else if (role === 'manager' && !managerAllowed.includes(activePage)) {
        setAccessDeniedMessage(`Access restricted: Managers cannot access ${activePage}. Admin privileges required.`);
        setActivePage('dashboard');
        setTimeout(() => setAccessDeniedMessage(null), 4000);
      }
    }
  }, [user, activePage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-300">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
          <span className="text-xs font-semibold tracking-wide">Connecting to Saloonify Database...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleBillAppointment = (apt: Appointment) => {
    setPosAppointment(apt);
    setActivePage('pos');
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans antialiased">
      {/* Sidebar Navigation (Responsive Drawer on Mobile, Fixed on Desktop) */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isPostgres={dbStatus?.isPostgres}
        dbEngine={dbStatus?.engine}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          activePage={activePage}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          onOpenNewAppointment={() => setActivePage('appointments')}
          onOpenNewBill={() => {
            setPosAppointment(null);
            setActivePage('pos');
          }}
        />

        {/* Access Restriction Notification Banner */}
        {accessDeniedMessage && (
          <div className="px-8 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium">{accessDeniedMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setAccessDeniedMessage(null)}
              className="text-amber-700 hover:text-amber-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto">
          {activePage === 'dashboard' && (
            <DashboardPage
              onNavigate={(page) => setActivePage(page)}
              onOpenBillForAppointment={handleBillAppointment}
            />
          )}

          {activePage === 'appointments' && (
            <AppointmentsPage onBillAtPos={handleBillAppointment} />
          )}

          {activePage === 'pos' && (
            <PosBillingPage
              initialAppointment={posAppointment}
              onClearInitialAppointment={() => setPosAppointment(null)}
            />
          )}

          {activePage === 'customers' && (
            <CustomersPage
              onStartPosBill={(cust) => {
                setActivePage('pos');
              }}
            />
          )}

          {activePage === 'services' && <ServicesPage />}

          {activePage === 'staff' && <StaffPage />}

          {activePage === 'inventory' && <InventoryPage />}

          {activePage === 'expenses' && <ExpensesPage />}

          {activePage === 'reports' && <ReportsPage />}

          {activePage === 'users' && <UsersPage />}

          {activePage === 'settings' && (
            <SettingsPage onDataReset={fetchDbStatus} />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SaloonifyApp />
    </AuthProvider>
  );
}
