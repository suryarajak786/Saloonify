import React, { useState, useEffect } from 'react';
import { Invoice, Settings } from '../types';
import { api } from '../services/api';
import { MessageSquare, Copy, Check, ExternalLink, Send, AlertCircle, Sparkles, X, ShieldCheck } from 'lucide-react';

interface WhatsAppReceiptModalProps {
  invoice: Invoice;
  settings: Settings;
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppReceiptModal: React.FC<WhatsAppReceiptModalProps> = ({
  invoice,
  settings,
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [messageText, setMessageText] = useState<string>('');
  const [waLink, setWaLink] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [apiConfigured, setApiConfigured] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [sendingApi, setSendingApi] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !invoice) return;

    const loadReceiptData = async () => {
      try {
        setLoading(true);
        setApiStatus(null);
        const res = await api.getWhatsAppReceipt(invoice._id);
        if (res.success) {
          setMessageText(res.messageText);
          setWaLink(res.waLink);
          setRecipientPhone(res.recipientPhone);
          setApiConfigured(res.apiConfigured);
        }
      } catch (err: any) {
        console.error('Failed to load WhatsApp receipt:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReceiptData();
  }, [isOpen, invoice]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!messageText) return;
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    if (!waLink) return;
    window.open(waLink, '_blank', 'noopener,noreferrer');
  };

  const handleSendViaApi = async () => {
    try {
      setSendingApi(true);
      setApiStatus(null);
      const res = await api.sendWhatsAppReceipt(invoice._id);
      if (res.success) {
        setApiStatus({ type: 'success', message: res.message || 'WhatsApp message delivered to customer!' });
      } else {
        setApiStatus({
          type: 'error',
          message: res.message || 'Official API message could not be delivered. Please use the WhatsApp button below.'
        });
      }
    } catch (err: any) {
      setApiStatus({
        type: 'error',
        message: err.message || 'Failed to dispatch WhatsApp API message.'
      });
    } finally {
      setSendingApi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/40 rounded-xl">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Send WhatsApp Digital Receipt</h3>
              <p className="text-emerald-100 text-xs mt-0.5">
                Invoice {invoice.invoiceNumber} · {invoice.customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Customer & Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 font-medium">Customer Mobile:</span>{' '}
              <span className="font-bold text-slate-800 font-mono text-sm">{invoice.customerPhone || 'Not provided'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Bill Saved in DB</span>
            </div>
          </div>

          {/* WhatsApp Chat Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Prefilled Message Preview
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200 animate-pulse">
                Preparing formatted receipt...
              </div>
            ) : (
              <div className="p-4 bg-[#EFEAE2] rounded-xl border border-slate-300 shadow-inner max-h-64 overflow-y-auto">
                <div className="bg-white p-3.5 rounded-lg rounded-tl-none shadow-xs border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed select-text">
                  {messageText}
                </div>
              </div>
            )}
          </div>

          {/* API feedback if triggered */}
          {apiStatus && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                apiStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{apiStatus.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <a
              href={waLink || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all ${
                !waLink ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in WhatsApp (Click to Chat & Send)</span>
            </a>

            {apiConfigured && (
              <button
                type="button"
                onClick={handleSendViaApi}
                disabled={sendingApi}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingApi ? 'Sending via Official API...' : 'Send Automatically via WhatsApp Cloud API'}</span>
              </button>
            )}

            <div className="flex justify-between items-center pt-2 text-[11px] text-slate-400">
              <span>Opens WhatsApp Web or mobile app with prefilled message.</span>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-600 hover:text-slate-900 font-semibold px-2 py-1 rounded hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
