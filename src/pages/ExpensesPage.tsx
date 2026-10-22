import React, { useState, useEffect } from 'react';
import { Expense } from '../types';
import { api } from '../services/api';
import {
  CreditCard,
  Plus,
  Trash2,
  Calendar,
  IndianRupee,
  FileSpreadsheet,
  X,
  Filter
} from 'lucide-react';

import { ConfirmModal } from '../components/ConfirmModal';

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('Salon Supplies');
  const [amount, setAmount] = useState<number>(1500);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [paidTo, setPaidTo] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const categories = [
    'All',
    'Rent',
    'Electricity & Water',
    'Staff Salaries & Advance',
    'Salon Supplies',
    'Equipment Maintenance',
    'Marketing & Promotions',
    'Snacks & Hospitality',
    'Software & Subscriptions',
    'Miscellaneous',
  ];

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.getExpenses({
        category: categoryFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.success) {
        setExpenses(res.expenses);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter, startDate, endDate]);

  const handleOpenAdd = () => {
    setTitle('');
    setCategory('Salon Supplies');
    setAmount(1500);
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('upi');
    setPaidTo('');
    setReceiptNumber('');
    setNotes('');
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) {
      setFormError('Title and valid expense amount are required.');
      return;
    }

    try {
      await api.createExpense({
        title: title.trim(),
        category,
        amount: Number(amount),
        date,
        paymentMethod,
        paidTo: paidTo.trim(),
        receiptNumber: receiptNumber.trim(),
        notes: notes.trim(),
      });

      setShowModal(false);
      fetchExpenses();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record expense');
    }
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await api.deleteExpense(expenseToDelete._id);
      setExpenseToDelete(null);
      fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Total */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
            Total Filtered Operating Expenses
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
            ₹{totalExpense.toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {expenses.length} expense transactions in period
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record New Expense</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Category:</span>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-slate-500 font-medium">Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-1 border border-slate-200 rounded-md bg-slate-50 font-mono text-[11px]"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-1 border border-slate-200 rounded-md bg-slate-50 font-mono text-[11px]"
          />
          {(startDate || endDate || categoryFilter !== 'All') && (
            <button type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setCategoryFilter('All');
              }}
              className="text-[11px] text-sky-600 hover:underline font-semibold ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <th className="py-2.5 px-4 font-semibold">Date</th>
              <th className="py-2.5 px-4 font-semibold">Expense Description</th>
              <th className="py-2.5 px-4 font-semibold">Category</th>
              <th className="py-2.5 px-4 font-semibold">Paid To</th>
              <th className="py-2.5 px-4 font-semibold">Receipt #</th>
              <th className="py-2.5 px-4 font-semibold text-center">Payment Method</th>
              <th className="py-2.5 px-4 font-semibold text-right">Amount (₹)</th>
              <th className="py-2.5 px-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 font-sans text-xs">
                  {loading ? 'Loading expenses...' : 'No expenses recorded for this filter.'}
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp._id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 text-slate-500 font-sans">{exp.date}</td>
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-900">
                    {exp.title}
                    {exp.notes && <span className="block text-[10px] text-slate-400">{exp.notes}</span>}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-600">{exp.category}</td>
                  <td className="py-2.5 px-4 font-sans text-slate-700">{exp.paidTo || '-'}</td>
                  <td className="py-2.5 px-4 text-slate-500">{exp.receiptNumber || '-'}</td>
                  <td className="py-2.5 px-4 text-center font-sans">
                    <span className="uppercase text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {exp.paymentMethod}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900 tabular-nums">
                    ₹{exp.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-4 text-right font-sans">
                    <button
                      type="button"
                      onClick={() => setExpenseToDelete(exp)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                      title="Delete Expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* RECORD EXPENSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Record Business Expense</h3>
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
                <label className="font-semibold text-slate-700 block mb-1">Expense Title / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity bill / Shampoo backbar refill"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 uppercase"
                  >
                    <option value="upi">UPI / GPay</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer / NEFT</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Paid To (Vendor)</label>
                  <input
                    type="text"
                    placeholder="e.g. BESCOM / Blue Tokai"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Receipt / Voucher #</label>
                  <input
                    type="text"
                    placeholder="e.g. EB-299381"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Additional Notes</label>
                <input
                  type="text"
                  placeholder="Optional details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
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
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE EXPENSE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(expenseToDelete)}
        title="Delete Expense Entry"
        message={`Are you sure you want to delete expense "${expenseToDelete?.title}" (₹${expenseToDelete?.amount})?`}
        confirmLabel="Delete Expense"
        onConfirm={confirmDeleteExpense}
        onCancel={() => setExpenseToDelete(null)}
      />
    </div>
  );
};
