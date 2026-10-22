import React, { useState, useEffect } from 'react';
import { Customer, Appointment, Invoice } from '../types';
import { api } from '../services/api';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  IndianRupee,
  Edit2,
  Trash2,
  X,
  History,
  Clock,
  Heart,
  Sparkles,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

interface CustomersPageProps {
  onStartPosBill?: (customer: Customer) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({ onStartPosBill }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // View Customer Profile Drawer / Modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerAppointments, setCustomerAppointments] = useState<Appointment[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Add / Edit Modal
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [gender, setGender] = useState<'female' | 'male' | 'other'>('female');
  const [address, setAddress] = useState<string>('');
  const [birthdate, setBirthdate] = useState<string>('');
  const [anniversary, setAnniversary] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [preferences, setPreferences] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCustomers = async (search?: string) => {
    try {
      setLoading(true);
      const res = await api.getCustomers(search);
      if (res.success) {
        setCustomers(res.customers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(searchQuery);
  }, [searchQuery]);

  const handleOpenDetails = async (cust: Customer) => {
    setSelectedCustomer(cust);
    try {
      setLoadingDetails(true);
      const res = await api.getCustomerById(cust._id);
      if (res.success) {
        setCustomerAppointments(res.appointments || []);
        setCustomerInvoices(res.invoices || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setGender('female');
    setAddress('');
    setBirthdate('');
    setAnniversary('');
    setNotes('');
    setPreferences('');
    setFormError(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingId(cust._id);
    setName(cust.name);
    setPhone(cust.phone);
    setEmail(cust.email || '');
    setGender(cust.gender || 'female');
    setAddress(cust.address || '');
    setBirthdate(cust.birthdate || '');
    setAnniversary(cust.anniversary || '');
    setNotes(cust.notes || '');
    setPreferences(cust.preferences || '');
    setFormError(null);
    setShowFormModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !phone.trim()) {
      setFormError('Customer name and phone number are required.');
      return;
    }

    try {
      const payload = {
        name,
        phone,
        email,
        gender,
        address,
        birthdate,
        anniversary,
        notes,
        preferences,
      };

      if (editingId) {
        const res = await api.updateCustomer(editingId, payload);
        if (res.success) {
          setShowFormModal(false);
          fetchCustomers(searchQuery);
        }
      } else {
        const res = await api.createCustomer(payload);
        if (res.success) {
          setShowFormModal(false);
          fetchCustomers(searchQuery);
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save customer');
    }
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      await api.deleteCustomer(customerToDelete._id);
      if (selectedCustomer?._id === customerToDelete._id) setSelectedCustomer(null);
      setCustomerToDelete(null);
      fetchCustomers(searchQuery);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-x-auto">
        <table className="w-full text-xs text-left min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <th className="py-2.5 px-4 font-semibold">Client Name</th>
              <th className="py-2.5 px-4 font-semibold">Contact Info</th>
              <th className="py-2.5 px-4 font-semibold">Preferences & Notes</th>
              <th className="py-2.5 px-4 font-semibold text-center">Visits</th>
              <th className="py-2.5 px-4 font-semibold text-right">Total Spent</th>
              <th className="py-2.5 px-4 font-semibold text-center">Last Visit</th>
              <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                  {loading ? 'Loading customer records...' : 'No customers found matching search.'}
                </td>
              </tr>
            ) : (
              customers.map((cust) => (
                <tr key={cust._id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(cust)}
                      className="font-bold text-slate-900 hover:text-sky-600 text-left"
                    >
                      {cust.name}
                    </button>
                    <span className="block text-[11px] text-slate-400 capitalize">{cust.gender}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                    <div>{cust.phone}</div>
                    {cust.email && <div className="text-[10px] text-slate-400 font-sans">{cust.email}</div>}
                  </td>
                  <td className="py-3 px-4 max-w-[220px]">
                    {cust.preferences || cust.notes ? (
                      <span className="text-[11px] text-slate-600 truncate block">
                        {cust.preferences || cust.notes}
                      </span>
                    ) : (
                      <span className="text-slate-300 italic text-[11px]">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-mono tabular-nums font-semibold text-slate-800">
                    {cust.totalVisits}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                    ₹{(cust.totalSpent || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-500">
                    {cust.lastVisitDate || '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenDetails(cust)}
                        className="px-2 py-1 text-sky-700 hover:bg-sky-50 rounded text-[11px] font-semibold"
                      >
                        Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cust)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                        title="Edit Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomerToDelete(cust)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* VIEW CUSTOMER PROFILE MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 space-y-5 my-8">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-sky-600 tracking-wider">Client Profile</span>
                <h3 className="text-lg font-bold text-slate-900">{selectedCustomer.name}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-slate-400" /> {selectedCustomer.phone}
                  </span>
                  {selectedCustomer.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" /> {selectedCustomer.email}
                    </span>
                  )}
                </div>
              </div>

              <button type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">Total Visits</span>
                <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                  {selectedCustomer.totalVisits}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Total Revenue</span>
                <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                  ₹{(selectedCustomer.totalSpent || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Last Visit</span>
                <span className="text-xs font-semibold text-slate-800 font-mono mt-1 block">
                  {selectedCustomer.lastVisitDate || 'First Visit'}
                </span>
              </div>
            </div>

            {/* Notes & Styling Preferences */}
            <div className="space-y-2 text-xs">
              {selectedCustomer.preferences && (
                <div className="bg-sky-50/60 border border-sky-100 p-3 rounded-lg text-slate-800">
                  <span className="font-semibold text-sky-900 flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" /> Styling Preferences:
                  </span>
                  <p>{selectedCustomer.preferences}</p>
                </div>
              )}

              {selectedCustomer.notes && (
                <div className="bg-amber-50/60 border border-amber-100 p-3 rounded-lg text-slate-800">
                  <span className="font-semibold text-amber-900 flex items-center gap-1.5 mb-1">
                    <Heart className="w-3.5 h-3.5 text-amber-600" /> Treatment & Scalp Notes:
                  </span>
                  <p>{selectedCustomer.notes}</p>
                </div>
              )}
            </div>

            {/* Past Invoices and Appointments */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Visit & Billing History ({customerInvoices.length} Bills)
              </h4>

              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs">
                {customerInvoices.length === 0 ? (
                  <p className="text-slate-400 italic py-4 text-center">No past settled invoices.</p>
                ) : (
                  customerInvoices.map((inv) => (
                    <div key={inv._id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800">{inv.invoiceNumber}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 font-sans">
                            {new Date(inv.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-sm">
                          {inv.items.map((i) => i.name).join(', ')}
                        </div>
                      </div>

                      <div className="text-right font-mono font-bold text-slate-900 tabular-nums">
                        ₹{inv.grandTotal.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT CUSTOMER MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingId ? 'Edit Customer Record' : 'Register New Customer'}
              </h3>
              <button type="button" onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shalini Roy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e: any) => setGender(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  placeholder="client@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Postal Address</label>
                <input
                  type="text"
                  placeholder="Street, Locality, City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Styling Preferences</label>
                <input
                  type="text"
                  placeholder="e.g. layers, ash toner, balayage"
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Health / Scalp Notes</label>
                <input
                  type="text"
                  placeholder="e.g. allergic to ammonia, sensitive skin"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(customerToDelete)}
        title="Delete Customer Profile"
        message={`Are you sure you want to delete "${customerToDelete?.name}"? All associated historical record references will be removed.`}
        confirmLabel="Delete Customer"
        onConfirm={confirmDeleteCustomer}
        onCancel={() => setCustomerToDelete(null)}
      />
    </div>
  );
};
