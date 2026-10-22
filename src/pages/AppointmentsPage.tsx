import React, { useState, useEffect } from 'react';
import { Appointment, Customer, Service, Staff } from '../types';
import { api } from '../services/api';
import {
  CalendarDays,
  Plus,
  Search,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  X,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AppointmentsPageProps {
  onBillAtPos: (appointment: Appointment) => void;
}

export const AppointmentsPage: React.FC<AppointmentsPageProps> = ({ onBillAtPos }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterStaffId, setFilterStaffId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'schedule' | 'table'>('schedule');

  // New Appointment Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newCustId, setNewCustId] = useState<string>('');
  const [newStaffId, setNewStaffId] = useState<string>('');
  const [newSelectedServices, setNewSelectedServices] = useState<string[]>([]);
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newStartTime, setNewStartTime] = useState<string>('11:00');
  const [newNotes, setNewNotes] = useState<string>('');
  const [allowConflictOverride, setAllowConflictOverride] = useState<boolean>(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Quick Add Customer in Appointment Modal
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState<boolean>(false);
  const [quickCustName, setQuickCustName] = useState<string>('');
  const [quickCustPhone, setQuickCustPhone] = useState<string>('');
  const [quickCustLoading, setQuickCustLoading] = useState<boolean>(false);
  const [quickCustError, setQuickCustError] = useState<string | null>(null);

  const handleQuickAddCustomer = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!quickCustName.trim() || !quickCustPhone.trim()) {
      setQuickCustError('Name and phone are required.');
      return;
    }
    try {
      setQuickCustLoading(true);
      setQuickCustError(null);
      const res = await api.createCustomer({
        name: quickCustName.trim(),
        phone: quickCustPhone.trim(),
      });
      if (res.success && res.customer) {
        setCustomers((prev) => [res.customer, ...prev]);
        setNewCustId(res.customer._id);
        setShowQuickAddCustomer(false);
        setQuickCustName('');
        setQuickCustPhone('');
      }
    } catch (err: any) {
      setQuickCustError(err.message || 'Failed to create customer');
    } finally {
      setQuickCustLoading(false);
    }
  };

  // Status Change Modal
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [aptRes, custRes, srvRes, stfRes] = await Promise.all([
        api.getAppointments(),
        api.getCustomers(),
        api.getServices({ activeOnly: true }),
        api.getStaff(),
      ]);

      if (aptRes.success) setAppointments(aptRes.appointments);
      if (custRes.success) setCustomers(custRes.customers);
      if (srvRes.success) setServices(srvRes.services);
      if (stfRes.success) setStaffList(stfRes.staff);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    if (!newCustId || !newStaffId || !newSelectedServices.length) {
      setConflictError('Please select a customer, stylist, and at least one service.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.createAppointment({
        customerId: newCustId,
        staffId: newStaffId,
        serviceIds: newSelectedServices,
        appointmentDate: newDate,
        startTime: newStartTime,
        notes: newNotes,
        allowOverlap: allowConflictOverride,
      });

      if (res.success) {
        setShowCreateModal(false);
        setNewCustId('');
        setNewStaffId('');
        setNewSelectedServices([]);
        setNewNotes('');
        setAllowConflictOverride(false);
        loadData();
      }
    } catch (err: any) {
      setConflictError(err.message || 'Failed to book appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (aptId: string, status: string) => {
    try {
      const res = await api.updateAppointment(aptId, { status: status as any });
      if (res.success) {
        setAppointments((prev) => prev.map((a) => (a._id === aptId ? res.appointment : a)));
        setEditingApt(null);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Date Shift Helpers
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter((apt) => {
    const matchDate = !selectedDate || apt.appointmentDate === selectedDate;
    const matchStaff = filterStaffId === 'all' || apt.staffId === filterStaffId;
    const matchStatus = filterStatus === 'all' || apt.status === filterStatus;
    const matchSearch =
      !searchQuery ||
      apt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.customerPhone.includes(searchQuery) ||
      apt.appointmentNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDate && matchStaff && matchStatus && matchSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        {/* Date Selector with Next/Prev */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
          />
          <button
            type="button"
            onClick={() => shiftDate(1)}
            className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-2.5 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Staff Filter */}
          <select
            value={filterStaffId}
            onChange={(e) => setFilterStaffId(e.target.value)}
            className="p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
          >
            <option value="all">All Stylists</option>
            {staffList.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="booked">Booked</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
            <button type="button"
              onClick={() => setViewMode('schedule')}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] ${
                viewMode === 'schedule' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Timeline View
            </button>
            <button type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              List View
            </button>
          </div>

          {/* New Appointment Button */}
          <button
            type="button"
            onClick={() => {
              setConflictError(null);
              setShowCreateModal(true);
            }}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Main View: Timeline or Table */}
      {viewMode === 'schedule' ? (
        /* TIMELINE SCHEDULE VIEW */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing appointments for <strong className="text-slate-800">{new Date(selectedDate).toDateString()}</strong>
            </span>
            <span>Total: {filteredAppointments.length} bookings</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAppointments.length === 0 ? (
              <div className="col-span-full bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                No appointments scheduled for this date. Click "+ Book Appointment" above to schedule a client.
              </div>
            ) : (
              filteredAppointments.map((apt) => (
                <div
                  key={apt._id}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between space-y-3 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 font-semibold">{apt.appointmentNumber}</span>
                        <h4 className="font-bold text-slate-900 text-sm">{apt.customerName}</h4>
                        <span className="text-slate-500 text-xs font-mono">{apt.customerPhone}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          apt.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : apt.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800'
                            : apt.status === 'confirmed'
                            ? 'bg-sky-100 text-sky-800'
                            : apt.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {apt.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Time & Stylist */}
                    <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="font-mono font-medium">
                        {apt.startTime} - {apt.endTime}
                      </span>
                      <span>·</span>
                      <span className="truncate font-semibold text-slate-800">{apt.staffName}</span>
                    </div>

                    {/* Services */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Services:</span>
                      <div className="flex flex-wrap gap-1">
                        {apt.services.map((s, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {apt.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-1.5 rounded border border-amber-100/60">
                        "{apt.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setEditingApt(apt)}
                      className="text-slate-600 hover:text-slate-900 font-medium"
                    >
                      Update Status
                    </button>

                    {apt.status !== 'completed' && apt.status !== 'cancelled' ? (
                      <button
                        type="button"
                        onClick={() => onBillAtPos(apt)}
                        className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Receipt className="w-3 h-3" />
                        <span>Bill at POS</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Settled
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-4 font-semibold">Apt #</th>
                <th className="py-2.5 px-4 font-semibold">Date & Time</th>
                <th className="py-2.5 px-4 font-semibold">Customer</th>
                <th className="py-2.5 px-4 font-semibold">Stylist</th>
                <th className="py-2.5 px-4 font-semibold">Services</th>
                <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredAppointments.map((apt) => (
                <tr key={apt._id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 font-bold text-sky-700">{apt.appointmentNumber}</td>
                  <td className="py-2.5 px-4 font-sans text-slate-800">
                    {apt.appointmentDate} <span className="font-mono text-slate-500">({apt.startTime} - {apt.endTime})</span>
                  </td>
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-900">
                    {apt.customerName}
                    <span className="block text-[10px] text-slate-400 font-mono">{apt.customerPhone}</span>
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-800">{apt.staffName}</td>
                  <td className="py-2.5 px-4 font-sans text-slate-600 max-w-[200px] truncate">
                    {apt.services.map((s) => s.name).join(', ')}
                  </td>
                  <td className="py-2.5 px-4 text-center font-sans">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        apt.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : apt.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-800'
                          : apt.status === 'confirmed'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {apt.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-sans">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button"
                        onClick={() => setEditingApt(apt)}
                        className="text-slate-500 hover:text-slate-800 font-medium"
                      >
                        Edit
                      </button>
                      <button type="button"
                        onClick={() => onBillAtPos(apt)}
                        className="px-2 py-0.5 bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold rounded text-[11px]"
                      >
                        POS Bill
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE APPOINTMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Book Client Appointment</h3>
              <button type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {conflictError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span>{conflictError}</span>
                  <label className="flex items-center gap-1.5 mt-2 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowConflictOverride}
                      onChange={(e) => setAllowConflictOverride(e.target.checked)}
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span>Allow double booking / override conflict</span>
                  </label>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateAppointment} className="space-y-3.5 text-xs">
              {/* Customer */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 block">Select Customer *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickAddCustomer(!showQuickAddCustomer);
                      setQuickCustError(null);
                    }}
                    className="text-xs text-sky-600 hover:text-sky-800 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{showQuickAddCustomer ? 'Choose Existing' : 'Quick Add Client'}</span>
                  </button>
                </div>

                {showQuickAddCustomer ? (
                  <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-lg space-y-2">
                    <span className="text-[11px] font-bold text-sky-900 block">New Customer Details</span>
                    {quickCustError && (
                      <p className="text-[11px] text-rose-600 font-medium">{quickCustError}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Client Full Name *"
                        value={quickCustName}
                        onChange={(e) => setQuickCustName(e.target.value)}
                        className="p-2 border border-slate-200 rounded-md bg-white text-xs focus:ring-1 focus:ring-sky-500"
                      />
                      <input
                        type="tel"
                        placeholder="Mobile Number *"
                        value={quickCustPhone}
                        onChange={(e) => setQuickCustPhone(e.target.value)}
                        className="p-2 border border-slate-200 rounded-md bg-white text-xs font-mono focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowQuickAddCustomer(false)}
                        className="px-2.5 py-1 text-slate-500 hover:text-slate-700 text-xs font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={quickCustLoading}
                        onClick={handleQuickAddCustomer}
                        className="px-3 py-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs"
                      >
                        {quickCustLoading ? 'Saving...' : 'Save & Select Client'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    required
                    value={newCustId}
                    onChange={(e) => setNewCustId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Stylist */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assign Stylist / Specialist *</label>
                <select
                  required
                  value={newStaffId}
                  onChange={(e) => setNewStaffId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">-- Choose Stylist --</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Services Selector */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Choose Services *</label>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
                  {services.map((srv) => {
                    const isChecked = newSelectedServices.includes(srv._id);
                    return (
                      <label
                        key={srv._id}
                        className="flex items-center justify-between p-1.5 hover:bg-white rounded cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewSelectedServices([...newSelectedServices, srv._id]);
                              } else {
                                setNewSelectedServices(newSelectedServices.filter((id) => id !== srv._id));
                              }
                            }}
                            className="rounded text-sky-600 focus:ring-sky-500"
                          />
                          <span className="font-medium text-slate-800">{srv.name}</span>
                        </div>
                        <span className="font-mono text-slate-500 text-[11px]">
                          ₹{srv.price} · {srv.durationMinutes}m
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Date & Start Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Client Notes / Styling Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. prefers organic toner, sensitive skin"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg font-semibold shadow-xs"
                >
                  {isSubmitting ? 'Confirming...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {editingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Update Appointment Status</h3>
            <p className="text-xs text-slate-500">
              {editingApt.customerName} · {editingApt.appointmentNumber}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'booked', label: 'Booked' },
                { id: 'confirmed', label: 'Confirmed' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'completed', label: 'Completed' },
                { id: 'cancelled', label: 'Cancelled' },
                { id: 'no_show', label: 'No Show' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleStatusChange(editingApt._id, st.id)}
                  className={`p-2 rounded-lg border text-center font-semibold transition-colors ${
                    editingApt.status === st.id
                      ? 'border-sky-500 bg-sky-50 text-sky-800'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setEditingApt(null)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
