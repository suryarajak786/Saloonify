import React, { useState, useEffect } from 'react';
import { Staff } from '../types';
import { api } from '../services/api';
import {
  UserCheck,
  Plus,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  Edit2,
  Trash2,
  X,
  Sparkles,
  Award,
  CheckCircle2
} from 'lucide-react';

import { ConfirmModal } from '../components/ConfirmModal';

export const StaffPage: React.FC = () => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);

  // Add / Edit Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<string>('Senior Hair Stylist');
  const [specialtiesText, setSpecialtiesText] = useState<string>('');
  const [commissionPercentage, setCommissionPercentage] = useState<number>(10);
  const [shiftStart, setShiftStart] = useState<string>('10:00');
  const [shiftEnd, setShiftEnd] = useState<string>('19:00');
  const [selectedDays, setSelectedDays] = useState<string[]>([
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.getStaff();
      if (res.success) {
        setStaffList(res.staff);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setRole('Senior Hair Stylist');
    setSpecialtiesText('Layered Haircut, Balayage, Keratin');
    setCommissionPercentage(10);
    setShiftStart('10:00');
    setShiftEnd('19:00');
    setSelectedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (stf: Staff) => {
    setEditingId(stf._id);
    setName(stf.name);
    setPhone(stf.phone);
    setEmail(stf.email || '');
    setRole(stf.role);
    setSpecialtiesText(stf.specialties.join(', '));
    setCommissionPercentage(stf.commissionPercentage || 0);
    setShiftStart(stf.schedule?.shiftStart || '10:00');
    setShiftEnd(stf.schedule?.shiftEnd || '19:00');
    setSelectedDays(stf.schedule?.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !role.trim()) {
      setFormError('Staff name, phone, and role are required.');
      return;
    }

    try {
      const specialties = specialtiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        role: role.trim(),
        specialties,
        commissionPercentage: Number(commissionPercentage),
        schedule: {
          days: selectedDays,
          shiftStart,
          shiftEnd,
        },
      };

      if (editingId) {
        await api.updateStaff(editingId, payload);
      } else {
        await api.createStaff(payload);
      }

      setShowModal(false);
      fetchStaff();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save staff member');
    }
  };

  const confirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    try {
      await api.deleteStaff(staffToDelete._id);
      setStaffToDelete(null);
      fetchStaff();
    } catch (err) {
      console.error(err);
    }
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Salon Staff & Stylists</h3>
          <p className="text-xs text-slate-500">Manage schedules, specialties, and revenue contributions</p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {staffList.map((stf) => (
          <div
            key={stf._id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
          >
            <div>
              {/* Profile Bar */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-sky-100 border border-slate-200 shrink-0 flex items-center justify-center font-bold text-sky-800 text-sm">
                  {stf.avatar ? (
                    <img src={stf.avatar} alt={stf.name} className="w-full h-full object-cover" />
                  ) : (
                    stf.name.charAt(0)
                  )}
                </div>

                <div className="flex-1 truncate">
                  <h4 className="font-bold text-slate-900 text-sm leading-tight truncate">{stf.name}</h4>
                  <span className="text-[11px] text-sky-700 font-medium block truncate mt-0.5">{stf.role}</span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                    <span>{stf.phone}</span>
                  </div>
                </div>
              </div>

              {/* Specialties */}
              <div className="mt-3.5 pt-3 border-t border-slate-100">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Core Specialties
                </span>
                <div className="flex flex-wrap gap-1">
                  {stf.specialties.map((spec, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Shift Schedule */}
              <div className="mt-3 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex items-center justify-between font-mono">
                  <span>Shift: {stf.schedule?.shiftStart || '10:00'} - {stf.schedule?.shiftEnd || '19:00'}</span>
                  <span>{stf.schedule?.days?.length || 6} days/wk</span>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="grid grid-cols-2 gap-2 mt-3 text-center text-xs">
                <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Completed Bookings</span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums">
                    {stf.completedAppointments || 0}
                  </span>
                </div>
                <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Revenue Billed</span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums">
                    ₹{(stf.totalRevenue || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-[11px] text-slate-500 font-mono">Commission: {stf.commissionPercentage}%</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(stf)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setStaffToDelete(stf)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                  title="Remove Profile"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ADD / EDIT STAFF MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingId ? 'Edit Stylist Profile' : 'Add Staff Member'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3 text-xs">
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
                  <label className="font-semibold text-slate-700 block mb-1">Role / Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master Stylist"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Specialties (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Haircut, Keratin, Hydra Facial, Balayage"
                  value={specialtiesText}
                  onChange={(e) => setSpecialtiesText(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Commission %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={commissionPercentage}
                    onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Shift Start</label>
                  <input
                    type="time"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Shift End</label>
                  <input
                    type="time"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Working Days</label>
                <div className="flex flex-wrap gap-1">
                  {daysOfWeek.map((day) => {
                    const isChecked = selectedDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedDays(selectedDays.filter((d) => d !== day));
                          } else {
                            setSelectedDays([...selectedDays, day]);
                          }
                        }}
                        className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition-colors ${
                          isChecked ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE STAFF CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(staffToDelete)}
        title="Remove Staff Profile"
        message={`Are you sure you want to remove the staff profile for "${staffToDelete?.name}"?`}
        confirmLabel="Remove Staff"
        onConfirm={confirmDeleteStaff}
        onCancel={() => setStaffToDelete(null)}
      />
    </div>
  );
};
