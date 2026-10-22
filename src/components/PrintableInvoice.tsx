import React, { useState } from 'react';
import { Invoice, Settings } from '../types';
import { Printer, X, FileText, CheckCircle2, MessageSquare } from 'lucide-react';

interface PrintableInvoiceProps {
  invoice: Invoice;
  settings: Settings;
  onClose: () => void;
  onOpenWhatsApp?: (invoice: Invoice) => void;
}

export const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({ invoice, settings, onClose, onOpenWhatsApp }) => {
  const [format, setFormat] = useState<'a4' | 'thermal'>('a4');

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(invoice.date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = new Date(invoice.date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-800">Invoice {invoice.invoiceNumber}</span>
            <div className="flex items-center bg-slate-200/70 p-1 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setFormat('a4')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  format === 'a4' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4 Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setFormat('thermal')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  format === 'thermal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Thermal Receipt (80mm)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenWhatsApp && (
              <button
                type="button"
                onClick={() => onOpenWhatsApp(invoice)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
                title="Send WhatsApp Receipt"
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp Receipt
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white text-xs font-medium rounded-lg hover:bg-sky-700 transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="printable-invoice" className="p-8 max-h-[80vh] overflow-y-auto bg-white text-slate-900">
          {format === 'a4' ? (
            /* ===================================================
               STANDARD A4 GST TAX INVOICE
               =================================================== */
            <div className="max-w-3xl mx-auto border border-slate-200 p-8 rounded-lg bg-white">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <img
                      src="/src/assets/images/saloonify_logo_mark_1792068954558.jpg"
                      alt="Saloonify"
                      className="w-8 h-8 rounded-md object-contain"
                    />
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{settings.salonName || 'Saloonify Luxury Salon'}</h1>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{settings.tagline || 'Style, Care & Elegance Redefined'}</p>
                  <p className="text-xs text-slate-600">{settings.address}, {settings.city}, {settings.state} - {settings.pincode}</p>
                  <p className="text-xs text-slate-600">Phone: {settings.phone} · Email: {settings.email}</p>
                  {settings.gstin && (
                    <p className="text-xs font-semibold text-slate-800 mt-1">GSTIN: {settings.gstin}</p>
                  )}
                </div>

                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-sky-50 text-sky-700 text-xs font-bold rounded tracking-wider uppercase mb-2">
                    TAX INVOICE
                  </span>
                  <div className="text-sm font-bold text-slate-900 font-mono">{invoice.invoiceNumber}</div>
                  <div className="text-xs text-slate-500 mt-1">Date: <span className="text-slate-800 font-medium">{formattedDate}</span></div>
                  <div className="text-xs text-slate-500">Time: <span className="text-slate-800 font-medium">{formattedTime}</span></div>
                </div>
              </div>

              {/* Bill To & Service Details */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50/70 p-4 rounded-lg mb-6 border border-slate-100 text-xs">
                <div>
                  <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Billed To (Customer)</p>
                  <p className="text-sm font-bold text-slate-900">{invoice.customerName}</p>
                  <p className="text-slate-600 mt-0.5">Phone: {invoice.customerPhone}</p>
                  {invoice.customerAddress && (
                    <p className="text-slate-600 mt-0.5">{invoice.customerAddress}</p>
                  )}
                </div>

                <div>
                  <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Service & Attendant</p>
                  <p className="text-sm font-medium text-slate-900">Stylist: {invoice.staffName || 'General Staff'}</p>
                  <p className="text-slate-600 mt-0.5">Payment Method: <span className="uppercase font-semibold text-slate-800">{invoice.paymentMethod}</span></p>
                  <div className="flex items-center gap-1 text-emerald-600 font-semibold mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Payment Status: {invoice.paymentStatus.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-xs text-left border-collapse mb-6">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2 px-3 font-semibold text-center w-8">#</th>
                    <th className="py-2 px-3 font-semibold">Description / Service</th>
                    <th className="py-2 px-3 font-semibold text-center">Type</th>
                    <th className="py-2 px-3 font-semibold text-center w-12">Qty</th>
                    <th className="py-2 px-3 font-semibold text-right">Price (₹)</th>
                    <th className="py-2 px-3 font-semibold text-right">Disc</th>
                    <th className="py-2 px-3 font-semibold text-right">Taxable (₹)</th>
                    <th className="py-2 px-3 font-semibold text-right">GST %</th>
                    <th className="py-2 px-3 font-semibold text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-center text-slate-400 font-sans">{index + 1}</td>
                      <td className="py-2 px-3 font-sans font-medium text-slate-900">{item.name}</td>
                      <td className="py-2 px-3 text-center capitalize text-slate-500 font-sans">{item.itemType}</td>
                      <td className="py-2 px-3 text-center tabular-nums">{item.quantity}</td>
                      <td className="py-2 px-3 text-right tabular-nums">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-500">
                        {item.discountAmount > 0 ? `-₹${item.discountAmount}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">₹{item.taxableAmount.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-600">{item.taxRate}%</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">₹{item.totalAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Breakdown */}
              <div className="flex justify-between items-start border-t border-slate-200 pt-4 mb-6 text-xs">
                <div className="w-1/2 pr-6">
                  {invoice.notes && (
                    <div className="mb-4 bg-slate-50 p-2.5 rounded text-slate-600">
                      <span className="font-semibold block text-slate-700 mb-0.5">Notes:</span>
                      {invoice.notes}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700">GST Breakdown:</p>
                    <p>CGST (Central Tax): <span className="font-mono text-slate-800">₹{invoice.cgstTotal.toFixed(2)}</span></p>
                    <p>SGST (State Tax): <span className="font-mono text-slate-800">₹{invoice.sgstTotal.toFixed(2)}</span></p>
                    <p>Total Tax (18%): <span className="font-mono text-slate-800">₹{invoice.totalTax.toFixed(2)}</span></p>
                  </div>
                </div>

                <div className="w-1/2 max-w-xs space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-medium text-slate-800">₹{invoice.subtotal.toLocaleString('en-IN')}</span>
                  </div>

                  {invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Total Discount:</span>
                      <span className="font-mono">-₹{invoice.discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Value:</span>
                    <span className="font-mono text-slate-800">₹{invoice.taxableAmount.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>CGST + SGST:</span>
                    <span className="font-mono text-slate-800">+₹{invoice.totalTax.toFixed(2)}</span>
                  </div>

                  {invoice.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Round-Off:</span>
                      <span className="font-mono">{invoice.roundOff > 0 ? `+₹${invoice.roundOff}` : `-₹${Math.abs(invoice.roundOff)}`}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
                    <span>Grand Total:</span>
                    <span className="font-mono text-sky-700">₹{invoice.grandTotal.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-xs text-slate-600 pt-1 border-t border-dashed border-slate-200">
                    <span>Paid via {invoice.paymentMethod.toUpperCase()}:</span>
                    <span className="font-mono font-bold text-slate-800">₹{invoice.paidAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Footer Terms */}
              <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-500 space-y-1">
                <p className="font-medium text-slate-700">{settings.invoiceFooter || 'Thank you for choosing Saloonify!'}</p>
                <p>{settings.termsAndConditions || 'Services once billed cannot be refunded.'}</p>
                <p className="text-[9px] text-slate-400 mt-2">Computer-generated tax invoice. No signature required.</p>
              </div>
            </div>
          ) : (
            /* ===================================================
               COMPACT THERMAL RECEIPT (80mm)
               =================================================== */
            <div className="max-w-[320px] mx-auto border border-dashed border-slate-300 p-4 bg-white text-slate-900 font-mono text-xs">
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <h2 className="font-bold text-sm tracking-tight text-slate-900">{settings.salonName || 'SALOONIFY'}</h2>
                <p className="text-[10px] text-slate-500">{settings.tagline || 'Salon & Spa'}</p>
                <p className="text-[10px] text-slate-600">{settings.city}, {settings.state}</p>
                <p className="text-[10px] text-slate-600">Ph: {settings.phone}</p>
                {settings.gstin && <p className="text-[10px] text-slate-600">GST: {settings.gstin}</p>}
              </div>

              <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Bill: {invoice.invoiceNumber}</span>
                  <span>{formattedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cust: {invoice.customerName}</span>
                  <span>{invoice.customerPhone.slice(-10)}</span>
                </div>
                <div>Attendant: {invoice.staffName || 'Staff'}</div>
              </div>

              {/* Items */}
              <div className="py-2 border-b border-dashed border-slate-300">
                <div className="flex justify-between font-bold text-[10px] mb-1">
                  <span>ITEM</span>
                  <span>QTY  AMT</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  {invoice.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="pr-2 leading-tight">
                        <span className="font-sans font-medium text-slate-900">{item.name}</span>
                      </div>
                      <span className="shrink-0 tabular-nums">
                        {item.quantity}x ₹{item.totalAmount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="py-2 border-b border-dashed border-slate-300 text-[11px] space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>₹{invoice.subtotal}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Discount</span>
                    <span>-₹{invoice.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>GST (Tax)</span>
                  <span>₹{invoice.totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>TOTAL PAYABLE</span>
                  <span>₹{invoice.grandTotal}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Paid ({invoice.paymentMethod.toUpperCase()})</span>
                  <span>₹{invoice.paidAmount}</span>
                </div>
              </div>

              <div className="pt-3 text-center text-[9px] text-slate-500 space-y-1">
                <p>*** THANK YOU! VISIT AGAIN ***</p>
                <p>Saloonify POS System</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
