import React, { useState, useEffect } from 'react';
import { Settings } from '../types';
import { api } from '../services/api';
import {
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Database,
  Building,
  FileText,
  Clock
} from 'lucide-react';

interface SettingsPageProps {
  onDataReset?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onDataReset }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dbHealth, setDbHealth] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [salonName, setSalonName] = useState<string>('');
  const [tagline, setTagline] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [defaultGstRate, setDefaultGstRate] = useState<number>(18);
  const [currencySymbol, setCurrencySymbol] = useState<string>('₹');
  const [invoicePrefix, setInvoicePrefix] = useState<string>('INV');
  const [invoiceFooter, setInvoiceFooter] = useState<string>('');
  const [termsAndConditions, setTermsAndConditions] = useState<string>('');
  const [openTime, setOpenTime] = useState<string>('09:00');
  const [closeTime, setCloseTime] = useState<string>('21:00');

  const fetchSettingsAndHealth = async () => {
    try {
      setLoading(true);
      const [settRes, healthRes] = await Promise.all([
        api.getSettings(),
        api.getHealth(),
      ]);

      if (settRes.success && settRes.settings) {
        const s = settRes.settings;
        setSettings(s);
        setSalonName(s.salonName || '');
        setTagline(s.tagline || '');
        setPhone(s.phone || '');
        setEmail(s.email || '');
        setAddress(s.address || '');
        setCity(s.city || '');
        setState(s.state || '');
        setPincode(s.pincode || '');
        setGstin(s.gstin || '');
        setDefaultGstRate(s.defaultGstRate || 18);
        setCurrencySymbol(s.currencySymbol || '₹');
        setInvoicePrefix(s.invoicePrefix || 'INV');
        setInvoiceFooter(s.invoiceFooter || '');
        setTermsAndConditions(s.termsAndConditions || '');
        setOpenTime(s.operatingHours?.open || '09:00');
        setCloseTime(s.operatingHours?.close || '21:00');
      }

      if (healthRes.success) {
        setDbHealth(healthRes);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndHealth();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);

      const payload: Partial<Settings> = {
        salonName,
        tagline,
        phone,
        email,
        address,
        city,
        state,
        pincode,
        gstin,
        defaultGstRate: Number(defaultGstRate),
        currencySymbol,
        invoicePrefix,
        invoiceFooter,
        termsAndConditions,
        operatingHours: {
          open: openTime,
          close: closeTime,
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        },
      };

      const res = await api.updateSettings(payload);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Salon settings and invoice layout saved successfully!' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Database Connection & Architecture Status Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Database Engine Architecture</h3>
              <p className="text-xs text-slate-500">Sole Source of Truth: PostgreSQL Database Server</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            PostgreSQL Active
          </span>
        </div>

        {dbHealth && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Active Engine</span>
              <span className="font-bold text-slate-900 block mt-0.5">{dbHealth.database.engine}</span>
              <span className="text-[11px] text-slate-500 font-mono block truncate mt-0.5">
                {dbHealth.database.host ? `${dbHealth.database.host}:${dbHealth.database.port}/${dbHealth.database.database}` : dbHealth.database.database || 'PostgreSQL'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Record Counts</span>
              <div className="text-[11px] text-slate-700 space-y-0.5 mt-0.5 font-mono">
                <div>{dbHealth.counts.customers} customers · {dbHealth.counts.services} services</div>
                <div>{dbHealth.counts.appointments} bookings · {dbHealth.counts.invoices} invoices</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">PostgreSQL Status</span>
              <span className="text-[11px] text-emerald-700 font-semibold block mt-0.5">
                Relational Persistence Active
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Multi-tenant data isolation & safe relational migrations
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Salon Branding & Contact Details */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Salon Profile & Contact Info</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Salon Name *</label>
              <input
                type="text"
                required
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Brand Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Official Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Official Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Studio Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">State & Pincode</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
                <input
                  type="text"
                  placeholder="Pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* GST & Tax Configuration */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Tax & Billing Configuration</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">GSTIN Number</label>
              <input
                type="text"
                placeholder="29ABCDE1234F1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono uppercase"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Default GST Rate %</label>
              <input
                type="number"
                value={defaultGstRate}
                onChange={(e) => setDefaultGstRate(Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="font-semibold text-slate-700 block mb-1">Invoice Footer Greeting</label>
              <input
                type="text"
                value={invoiceFooter}
                onChange={(e) => setInvoiceFooter(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="font-semibold text-slate-700 block mb-1">Invoice Terms & Return Policy</label>
              <textarea
                rows={2}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Salon Operating Hours</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs max-w-sm">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Opening Time</label>
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Closing Time</label>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Settings...' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
