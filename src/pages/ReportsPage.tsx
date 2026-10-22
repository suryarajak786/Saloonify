import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BarChart3,
  Download,
  IndianRupee,
  TrendingUp,
  CreditCard,
  Calendar,
  CheckCircle2,
  Package,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Filter
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.getReportsSummary(startDate || undefined, endDate || undefined);
      if (res.success) {
        setReport(res.report);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('saloonify_token');
      const res = await fetch('/api/reports/export', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        throw new Error('Failed to export reports CSV');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saloonify_sales_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Export error:', err);
    }
  };

  const handleQuickPreset = (preset: 'all' | 'this_month' | 'last_month') => {
    const now = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    }
  };

  if (loading && !report) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Calculating salon metrics and financial reports...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Filter and Export Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleQuickPreset('all')}
            className={`px-3 py-1.5 rounded-lg font-medium ${
              !startDate && !endDate ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Time
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset('this_month')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium"
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset('last_month')}
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium"
          >
            Last Month
          </button>

          <div className="flex items-center gap-1.5 ml-2 font-mono">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1 border border-slate-200 rounded-md bg-slate-50 text-[11px]"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1 border border-slate-200 rounded-md bg-slate-50 text-[11px]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Sales CSV</span>
        </button>
      </div>

      {report && (
        <div className="space-y-6">
          {/* Top 4 Financial Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Gross Revenue */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Gross Sales Revenue</span>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                ₹{report.totalRevenue.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {report.invoiceCount} invoices issued
              </span>
            </div>

            {/* Operating Expenses */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Total Operating Expenses</span>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                ₹{report.totalOperatingExpenses.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Rent, utilities, staff hospitality
              </span>
            </div>

            {/* GST Tax Collected */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Total GST Collected</span>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                ₹{report.totalTaxCollected.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                CGST 9% + SGST 9% liability
              </span>
            </div>

            {/* Net Operating Profit */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500">Net Operating Profit</span>
              <div
                className={`text-2xl font-bold font-mono tabular-nums mt-1 ${
                  report.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                ₹{report.netProfit.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Revenue - Expenses - Cost of Goods
              </span>
            </div>
          </div>

          {/* Breakdown Section: Payment Methods & Expenses by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Methods */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Settlement by Payment Mode</h3>
              <p className="text-xs text-slate-500 mb-4">Breakdown of collections across UPI, Cash, Card</p>

              <div className="space-y-3">
                {Object.entries(report.paymentMethods || {}).map(([method, data]: any) => {
                  const percent =
                    report.totalRevenue > 0
                      ? Math.round((data.total / report.totalRevenue) * 100)
                      : 0;
                  return (
                    <div key={method} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="uppercase font-semibold text-slate-700">{method}</span>
                        <div className="text-right font-mono">
                          <span className="font-bold text-slate-900 tabular-nums">
                            ₹{data.total.toLocaleString('en-IN')}
                          </span>
                          <span className="text-slate-400 text-[11px] ml-2 font-sans">
                            ({data.count} bills · {percent}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className="bg-sky-500 h-full rounded-full transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expenses by Category */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Operating Expenses by Category</h3>
              <p className="text-xs text-slate-500 mb-4">Cost center distribution</p>

              <div className="space-y-3">
                {Object.entries(report.expenseByCategory || {}).map(([cat, amount]: any) => {
                  const percent =
                    report.totalOperatingExpenses > 0
                      ? Math.round((amount / report.totalOperatingExpenses) * 100)
                      : 0;
                  return (
                    <div key={cat} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-700">{cat}</span>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          ₹{amount.toLocaleString('en-IN')} <span className="text-slate-400 font-sans font-normal text-[11px]">({percent}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className="bg-slate-700 h-full rounded-full transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Operational Efficiency Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Appointment Completion Metrics</h3>
              <p className="text-xs text-slate-500 mb-4">Booking fulfillment rate and cancellation stats</p>

              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full border-4 border-sky-500 flex flex-col items-center justify-center shrink-0">
                  <span className="text-xl font-bold text-slate-900 font-mono">
                    {report.appointmentStats.completionRate}%
                  </span>
                  <span className="text-[10px] text-slate-500">Fulfilled</span>
                </div>

                <div className="space-y-2 text-xs flex-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Bookings:</span>
                    <span className="font-mono font-bold text-slate-900">{report.appointmentStats.total}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Completed & Settled:</span>
                    <span className="font-mono font-bold">{report.appointmentStats.completed}</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>Cancelled / No-shows:</span>
                    <span className="font-mono font-bold">{report.appointmentStats.cancelled}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Inventory Asset Valuation</h3>
              <p className="text-xs text-slate-500 mb-4">Stock on shelves at cost price vs retail value</p>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">Cost Basis (Procurement Value):</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums text-sm">
                    ₹{report.inventoryValuation.costBasis.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-600">Retail Selling Valuation:</span>
                  <span className="font-mono font-bold text-sky-700 tabular-nums text-sm">
                    ₹{report.inventoryValuation.retailValue.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-emerald-700 font-semibold pt-1">
                  <span>Gross Inventory Margin Potential:</span>
                  <span className="font-mono">
                    ₹{(report.inventoryValuation.retailValue - report.inventoryValuation.costBasis).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
