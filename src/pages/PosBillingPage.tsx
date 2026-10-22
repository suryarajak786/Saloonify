import React, { useState, useEffect, useRef } from 'react';
import { Customer, Service, Staff, Product, Invoice, Settings, Appointment } from '../types';
import { api } from '../services/api';
import {
  Search,
  Plus,
  Trash2,
  Printer,
  Receipt,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  ShoppingBag,
  Scissors,
  CreditCard,
  QrCode,
  Banknote,
  RotateCcw,
  MessageSquare,
  User,
  Phone,
  Sparkles,
  ExternalLink,
  Check,
  X,
  History
} from 'lucide-react';
import { PrintableInvoice } from '../components/PrintableInvoice';
import { WhatsAppReceiptModal } from '../components/WhatsAppReceiptModal';

interface PosBillingPageProps {
  initialAppointment?: Appointment | null;
  onClearInitialAppointment?: () => void;
}

interface CartItem {
  itemId: string;
  itemType: 'service' | 'product';
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  taxRate: number;
}

export const PosBillingPage: React.FC<PosBillingPageProps> = ({
  initialAppointment,
  onClearInitialAppointment
}) => {
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  // POS Customer state with search & autocomplete
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerNameInput, setCustomerNameInput] = useState<string>('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // POS Cart & Staff State
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [appointmentId, setAppointmentId] = useState<string>('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [overallDiscountType, setOverallDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [overallDiscountValue, setOverallDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'mixed'>('upi');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [billingNotes, setBillingNotes] = useState<string>('');

  // Catalog Filter
  const [catalogType, setCatalogType] = useState<'services' | 'products'>('services');
  const [catalogCategory, setCatalogCategory] = useState<string>('All');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [historySearch, setHistorySearch] = useState<string>('');

  // Modals & Feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savedInvoiceForPrint, setSavedInvoiceForPrint] = useState<Invoice | null>(null);
  const [whatsAppModalInvoice, setWhatsAppModalInvoice] = useState<Invoice | null>(null);
  const [showSuccessSaleModal, setShowSuccessSaleModal] = useState<boolean>(false);
  const [justCompletedInvoice, setJustCompletedInvoice] = useState<Invoice | null>(null);

  // Load Initial Data
  const loadData = async () => {
    try {
      const [custRes, servRes, prodRes, stfRes, settRes, invRes] = await Promise.all([
        api.getCustomers(),
        api.getServices({ activeOnly: true }),
        api.getInventory(),
        api.getStaff(),
        api.getSettings(),
        api.getInvoices()
      ]);

      if (custRes.success) setCustomers(custRes.customers);
      if (servRes.success) setServices(servRes.services);
      if (prodRes.success) setProducts(prodRes.products);
      if (stfRes.success) setStaffList(stfRes.staff);
      if (settRes.success) setSettings(settRes.settings);
      if (invRes.success) setInvoices(invRes.invoices);
    } catch (err: any) {
      console.error('Error loading POS data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Pre-fill from initial appointment if passed
  useEffect(() => {
    if (initialAppointment && customers.length && services.length) {
      const matchedCust = customers.find(c => c._id === initialAppointment.customerId);
      setSelectedCustomerId(initialAppointment.customerId);
      setCustomerNameInput(matchedCust?.name || initialAppointment.customerName || '');
      setCustomerPhoneInput(matchedCust?.phone || initialAppointment.customerPhone || '');
      setSelectedStaffId(initialAppointment.staffId);
      setAppointmentId(initialAppointment._id);

      const items: CartItem[] = initialAppointment.services.map((s) => {
        const fullService = services.find((srv) => srv._id === s.serviceId);
        return {
          itemId: s.serviceId,
          itemType: 'service',
          name: s.name,
          category: fullService?.category || 'Hair Styling',
          quantity: 1,
          unitPrice: s.price,
          discountType: 'percentage',
          discountValue: 0,
          taxRate: fullService?.taxRate || 18,
        };
      });

      setCartItems(items);
      setActiveTab('pos');
      if (onClearInitialAppointment) {
        onClearInitialAppointment();
      }
    }
  }, [initialAppointment, customers, services]);

  // Close customer dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter matching customers for autocomplete
  const matchingCustomers = customers.filter((c) => {
    const qName = customerNameInput.trim().toLowerCase();
    const qPhone = customerPhoneInput.replace(/\D/g, '');
    const cleanCPhone = (c.phone || '').replace(/\D/g, '');

    if (!qName && !qPhone) return false;
    const nameMatch = qName && (c.name || '').toLowerCase().includes(qName);
    const phoneMatch = qPhone && cleanCPhone.includes(qPhone);
    return nameMatch || phoneMatch;
  });

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c._id);
    setCustomerNameInput(c.name);
    setCustomerPhoneInput(c.phone);
    setShowCustomerDropdown(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId('');
    setCustomerNameInput('');
    setCustomerPhoneInput('');
    setShowCustomerDropdown(false);
  };

  // Calculations (Mirroring backend authoritative formula)
  const calculateTotals = () => {
    let grossTotal = 0;
    let itemDiscountsTotal = 0;
    let taxableTotal = 0;
    let taxTotal = 0;

    cartItems.forEach((it) => {
      const lineGross = it.quantity * it.unitPrice;
      grossTotal += lineGross;

      let itemDisc = 0;
      if (it.discountType === 'fixed') {
        itemDisc = Math.min(it.discountValue || 0, lineGross);
      } else {
        itemDisc = (lineGross * Math.min(Math.max(it.discountValue || 0, 0), 100)) / 100;
      }
      itemDiscountsTotal += itemDisc;

      const lineTaxable = Math.max(0, lineGross - itemDisc);
      taxableTotal += lineTaxable;
      const rate = it.taxRate || 18;
      taxTotal += (lineTaxable * rate) / 100;
    });

    const preTaxSubtotal = Math.max(0, grossTotal - itemDiscountsTotal);
    let billDiscount = 0;
    if (overallDiscountType === 'fixed') {
      billDiscount = Math.min(overallDiscountValue || 0, preTaxSubtotal);
    } else {
      billDiscount = (preTaxSubtotal * Math.min(Math.max(overallDiscountValue || 0, 0), 100)) / 100;
    }

    const finalDiscount = itemDiscountsTotal + billDiscount;
    const finalTaxable = Math.max(0, grossTotal - finalDiscount);
    const exactGrandTotal = finalTaxable + taxTotal;
    const grandTotal = Math.round(exactGrandTotal);
    const roundOff = Number((grandTotal - exactGrandTotal).toFixed(2));

    return {
      subtotal: grossTotal,
      discountAmount: Number(finalDiscount.toFixed(2)),
      taxableAmount: Number(finalTaxable.toFixed(2)),
      totalTax: Number(taxTotal.toFixed(2)),
      cgstTotal: Number((taxTotal / 2).toFixed(2)),
      sgstTotal: Number((taxTotal / 2).toFixed(2)),
      grandTotal,
      roundOff,
    };
  };

  const totals = calculateTotals();

  // Cart operations
  const handleAddToCart = (item: Service | Product, type: 'service' | 'product') => {
    const existingIndex = cartItems.findIndex((c) => c.itemId === item._id && c.itemType === type);
    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          itemId: item._id,
          itemType: type,
          name: item.name,
          category: item.category,
          quantity: 1,
          unitPrice: type === 'service' ? (item as Service).price : (item as Product).sellingPrice,
          discountType: 'percentage',
          discountValue: 0,
          taxRate: item.taxRate || 18,
        },
      ]);
    }
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const updated = [...cartItems];
    updated[index].quantity = newQty;
    setCartItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(cartItems.filter((_, idx) => idx !== index));
  };

  const handleResetPos = () => {
    handleClearCustomer();
    setSelectedStaffId('');
    setAppointmentId('');
    setCartItems([]);
    setOverallDiscountValue(0);
    setPaidAmount('');
    setBillingNotes('');
    setFeedback(null);
  };

  // Submit Invoice to Backend (Automatic Customer Storage & WhatsApp Integration)
  const handleSubmitInvoice = async () => {
    const name = customerNameInput.trim();
    const phone = customerPhoneInput.trim();

    if (!selectedCustomerId && (!name || !phone)) {
      setFeedback({
        type: 'error',
        message: 'Please provide Customer Name and Mobile Number, or select an existing customer from the list.'
      });
      return;
    }

    const cleanPhoneDigits = phone.replace(/\D/g, '');
    if (phone && cleanPhoneDigits.length < 7) {
      setFeedback({
        type: 'error',
        message: 'Please enter a valid mobile number with at least 10 digits.'
      });
      return;
    }

    if (cartItems.length === 0) {
      setFeedback({ type: 'error', message: 'Cart is empty. Please select services or retail products to bill.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback(null);

      const effectivePaidAmount = paidAmount !== '' ? Number(paidAmount) : totals.grandTotal;

      const payload = {
        customerId: selectedCustomerId || undefined,
        customerName: name,
        customerPhone: phone,
        staffId: selectedStaffId || undefined,
        appointmentId: appointmentId || undefined,
        items: cartItems,
        overallDiscountValue,
        overallDiscountType,
        paymentMethod,
        paidAmount: effectivePaidAmount,
        notes: billingNotes,
      };

      const res = await api.createInvoice(payload);
      if (res.success) {
        setJustCompletedInvoice(res.invoice);
        setShowSuccessSaleModal(true);
        handleResetPos();
        loadData(); // reload invoices and updated customer stats
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to generate and store tax invoice.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Catalog
  const categories =
    catalogType === 'services'
      ? ['All', ...Array.from(new Set(services.map((s) => s.category)))]
      : ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredCatalog =
    catalogType === 'services'
      ? services.filter((s) => {
          const matchCat = catalogCategory === 'All' || s.category === catalogCategory;
          const matchQ =
            !catalogSearch ||
            s.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
            s.category.toLowerCase().includes(catalogSearch.toLowerCase());
          return matchCat && matchQ;
        })
      : products.filter((p) => {
          const matchCat = catalogCategory === 'All' || p.category === catalogCategory;
          const matchQ =
            !catalogSearch ||
            p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
            p.category.toLowerCase().includes(catalogSearch.toLowerCase()) ||
            (p.barcode && p.barcode.includes(catalogSearch));
          return matchCat && matchQ;
        });

  // Filter History Invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (!historySearch) return true;
    const q = historySearch.toLowerCase();
    return (
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
      (inv.customerPhone && inv.customerPhone.includes(q))
    );
  });

  const selectedCustomerObj = customers.find(c => c._id === selectedCustomerId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Tab Switcher & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'pos'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Billing Terminal / POS
          </button>
          <button type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            Invoice History ({invoices.length})
          </button>
        </div>

        {appointmentId && (
          <span className="text-xs bg-sky-50 text-sky-800 font-medium px-2.5 py-1 rounded-md border border-sky-200">
            Billing for Appointment #{appointmentId}
          </span>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center justify-between ${
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
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold px-1">
            &times;
          </button>
        </div>
      )}

      {activeTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Item Catalog (7 cols) */}
          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            {/* Catalog Type & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setCatalogType('services');
                    setCatalogCategory('All');
                  }}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                    catalogType === 'services'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5 text-sky-600" />
                  Services ({services.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCatalogType('products');
                    setCatalogCategory('All');
                  }}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                    catalogType === 'products'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-sky-600" />
                  Retail Products ({products.length})
                </button>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${catalogType}...`}
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatalogCategory(cat)}
                  className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    catalogCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredCatalog.length === 0 ? (
                <div className="col-span-full py-12 text-center text-xs text-slate-400 italic">
                  No {catalogType} found matching your criteria.
                </div>
              ) : (
                filteredCatalog.map((item) => {
                  const price = catalogType === 'services' ? (item as Service).price : (item as Product).sellingPrice;
                  const inCartCount = cartItems
                    .filter((c) => c.itemId === item._id && c.itemType === (catalogType === 'services' ? 'service' : 'product'))
                    .reduce((sum, c) => sum + c.quantity, 0);

                  return (
                    <div
                      key={item._id}
                      onClick={() => handleAddToCart(item, catalogType === 'services' ? 'service' : 'product')}
                      className={`relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group hover:shadow-md ${
                        inCartCount > 0
                          ? 'border-sky-500 bg-sky-50/40 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {inCartCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-sky-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                          {inCartCount}
                        </span>
                      )}

                      <div>
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
                          {item.category}
                        </span>
                        <h4 className="font-semibold text-xs text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-2">
                          {item.name}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          ₹{price.toLocaleString('en-IN')}
                        </span>
                        <span className="p-1 rounded-md bg-slate-100 text-slate-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Customer Details & Cart (5 cols) */}
          <div id="pos-cart" className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            {/* 1. CUSTOMER DETAILS IN BILLING (Requirements 1 & 2) */}
            <div className="space-y-2 border-b border-slate-200 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-600" />
                  Customer Details
                </span>
                {selectedCustomerObj ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
                      Existing Customer · {selectedCustomerObj.totalVisits || 0} visits
                    </span>
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      className="text-[10px] text-slate-400 hover:text-slate-700 font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400">Search existing or type new</span>
                )}
              </div>

              {/* Autocomplete Input Container */}
              <div ref={customerDropdownRef} className="relative space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Customer Name Field */}
                  <div className="relative">
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Customer Name *</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Priya Sharma"
                        value={customerNameInput}
                        onChange={(e) => {
                          setCustomerNameInput(e.target.value);
                          setShowCustomerDropdown(true);
                          if (selectedCustomerId) setSelectedCustomerId('');
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Customer Phone Field */}
                  <div className="relative">
                    <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Mobile Number *</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="tel"
                        placeholder="98765 43210"
                        value={customerPhoneInput}
                        onChange={(e) => {
                          setCustomerPhoneInput(e.target.value);
                          setShowCustomerDropdown(true);
                          if (selectedCustomerId) setSelectedCustomerId('');
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Dropdown Suggestions */}
                {showCustomerDropdown && (customerNameInput.trim() || customerPhoneInput.trim()) && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {matchingCustomers.length > 0 ? (
                      <div>
                        <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Matching Customers ({matchingCustomers.length})
                        </div>
                        {matchingCustomers.map((c) => (
                          <div
                            key={c._id}
                            onClick={() => handleSelectCustomer(c)}
                            className="px-3 py-2 hover:bg-sky-50/70 cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <div>
                              <span className="font-semibold text-slate-900 block">{c.name}</span>
                              <span className="font-mono text-[11px] text-slate-500">{c.phone}</span>
                            </div>
                            <div className="text-right text-[10px] text-slate-400">
                              <span className="block font-medium text-slate-600">{c.totalVisits || 0} visits</span>
                              {c.lastVisitDate && <span>Last: {c.lastVisitDate}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-500">
                        <p className="font-medium text-slate-700">New Customer</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          "{customerNameInput || 'Guest'}" ({customerPhoneInput || 'No phone'}) will be automatically saved to database upon bill completion.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Staff / Stylist Assignment */}
              <div className="pt-1">
                <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Stylist / Attendant (Optional)</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">-- Assign Stylist (Optional) --</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cart Items List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900">Current Bill Items ({cartItems.length})</span>
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetPos}
                    className="text-[11px] text-rose-600 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear Cart
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                {cartItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 italic">
                    Cart is empty. Click services or products on the left to add items.
                  </div>
                ) : (
                  cartItems.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs gap-2">
                      <div className="flex-1 truncate">
                        <div className="font-semibold text-slate-800 truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ₹{item.unitPrice} each · GST {item.taxRate}%
                        </div>
                      </div>

                      {/* Qty Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(idx, item.quantity - 1)}
                          className="w-5 h-5 rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-mono font-semibold tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(idx, item.quantity + 1)}
                          className="w-5 h-5 rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>

                      <div className="w-16 text-right font-mono font-bold text-slate-900 tabular-nums shrink-0">
                        ₹{(item.quantity * item.unitPrice).toLocaleString('en-IN')}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-300 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bill Level Discount */}
            <div className="pt-2 border-t border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 font-medium">Invoice Discount</span>
                <div className="flex items-center gap-1">
                  <select
                    value={overallDiscountType}
                    onChange={(e: any) => setOverallDiscountType(e.target.value)}
                    className="p-1 text-xs border border-slate-200 rounded-md bg-slate-50"
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">₹</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={overallDiscountValue || ''}
                    onChange={(e) => setOverallDiscountValue(Number(e.target.value))}
                    className="w-16 p-1 text-xs text-right border border-slate-200 rounded-md bg-slate-50 font-mono"
                  />
                </div>
              </div>

              {/* Subtotal, Tax and Total summary */}
              <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 text-xs border border-slate-100">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono tabular-nums">₹{totals.subtotal.toLocaleString('en-IN')}</span>
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Total Discount:</span>
                    <span className="font-mono tabular-nums">-₹{totals.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Value:</span>
                  <span className="font-mono tabular-nums">₹{totals.taxableAmount.toLocaleString('en-IN')}</span>
                </div>
                {totals.totalTax > 0 && (
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>GST (CGST + SGST):</span>
                    <span className="font-mono tabular-nums">₹{totals.totalTax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                  <span>Payable Total:</span>
                  <span className="font-mono text-sky-700 tabular-nums">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Payment Method</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'upi', label: 'UPI / QR', icon: QrCode },
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'card', label: 'Card / POS', icon: CreditCard },
                    { id: 'mixed', label: 'Split', icon: Receipt },
                  ].map((pm) => {
                    const Icon = pm.icon;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id as any)}
                        className={`p-2 rounded-lg border text-center flex flex-col items-center gap-1 transition-all text-[11px] font-medium ${
                          paymentMethod === pm.id
                            ? 'border-sky-500 bg-sky-50 text-sky-800 font-bold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Paid (Optional partial payment) */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Received Amount (₹) <span className="text-slate-400 font-normal">(Leave blank for exact total)</span>
                </label>
                <input
                  type="number"
                  placeholder={`Exact: ₹${totals.grandTotal}`}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>

              {/* Action: Settle & Issue Invoice */}
              <button
                type="button"
                onClick={handleSubmitInvoice}
                disabled={isSubmitting || cartItems.length === 0}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 mt-3 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Saving Bill & Customer Data...</span>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>Complete Sale & Save Bill (₹{totals.grandTotal.toLocaleString('en-IN')})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* INVOICE HISTORY TAB */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <h3 className="font-bold text-sm text-slate-800">Recorded Bills & Tax Invoices</h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search bill #, customer, phone..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-4 font-semibold">Invoice #</th>
                  <th className="py-2.5 px-4 font-semibold">Date & Time</th>
                  <th className="py-2.5 px-4 font-semibold">Customer</th>
                  <th className="py-2.5 px-4 font-semibold">Stylist</th>
                  <th className="py-2.5 px-4 font-semibold">Items</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Taxable</th>
                  <th className="py-2.5 px-4 font-semibold text-right">GST</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Grand Total</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Payment</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-sans text-xs">
                      No invoices recorded yet. Create your first bill in the Billing Terminal tab!
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-bold text-sky-700">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-4 text-slate-600 font-sans">
                        {new Date(inv.date).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-900">
                        {inv.customerName}
                        <span className="block text-[10px] text-slate-400 font-mono">{inv.customerPhone}</span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 font-sans">{inv.staffName || '-'}</td>
                      <td className="py-2.5 px-4 text-slate-600 font-sans max-w-[180px] truncate">
                        {inv.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">₹{inv.taxableAmount.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-500">₹{inv.totalTax.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900 tabular-nums">
                        ₹{inv.grandTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 text-center font-sans">
                        <span className="uppercase text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {inv.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setWhatsAppModalInvoice(inv)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                            title="Send WhatsApp Receipt"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSavedInvoiceForPrint(inv)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-md transition-colors"
                            title="Print / View Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* POST-SALE SUCCESS DIALOG WITH WHATSAPP BUTTON (Requirement 4 & 5) */}
      {showSuccessSaleModal && justCompletedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Bill Saved Successfully!</h3>
              <p className="text-xs text-slate-500">
                Invoice <span className="font-mono font-bold text-sky-700">{justCompletedInvoice.invoiceNumber}</span> has been stored in the database. Customer details have been automatically updated.
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Client:</span>
                <span className="font-semibold text-slate-800">{justCompletedInvoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-mono font-semibold text-slate-800">{justCompletedInvoice.customerPhone}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                <span className="text-slate-700">Total Billed:</span>
                <span className="font-mono text-emerald-700">₹{justCompletedInvoice.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessSaleModal(false);
                  setWhatsAppModalInvoice(justCompletedInvoice);
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send WhatsApp Receipt to Customer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSuccessSaleModal(false);
                  setSavedInvoiceForPrint(justCompletedInvoice);
                }}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>View / Print Tax Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSuccessSaleModal(false)}
                className="w-full py-1.5 text-center text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                Start New Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE STICKY BILL SUMMARY BAR */}
      {cartItems.length > 0 && activeTab === 'pos' && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-30 bg-slate-900 text-white p-3 rounded-xl shadow-2xl flex items-center justify-between border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
              {cartItems.length}
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Billed Total</span>
              <span className="text-xs font-bold text-white font-mono">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('pos-cart');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg shadow-xs transition-colors"
          >
            Review & Pay →
          </button>
        </div>
      )}

      {/* WHATSAPP RECEIPT MODAL */}
      {whatsAppModalInvoice && (
        <WhatsAppReceiptModal
          invoice={whatsAppModalInvoice}
          settings={
            settings || {
              salonName: 'Saloonify Luxury Salon & Spa',
              tagline: 'Premium Hair, Beauty & Wellness Care',
              phone: '+91 98765 43210',
              email: 'contact@saloonify.com',
              address: '101 Elegance Arcade, Commercial Road',
              city: 'Bangalore',
              state: 'Karnataka',
              pincode: '560001',
              gstin: '',
              currencySymbol: '₹',
              defaultGstRate: 18,
              invoicePrefix: 'INV-',
              invoiceFooter: 'Thank you for choosing Saloonify! We look forward to serving you again.',
              termsAndConditions: 'Goods and services once billed cannot be exchanged or refunded.',
              operatingHours: {
                open: '09:00',
                close: '21:00',
                workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
              },
            }
          }
          isOpen={Boolean(whatsAppModalInvoice)}
          onClose={() => setWhatsAppModalInvoice(null)}
        />
      )}

      {/* PRINTABLE INVOICE MODAL */}
      {savedInvoiceForPrint && (
        <PrintableInvoice
          invoice={savedInvoiceForPrint}
          settings={
            settings || {
              salonName: 'Saloonify Luxury Salon & Spa',
              tagline: 'Premium Hair, Beauty & Wellness Care',
              phone: '+91 98765 43210',
              email: 'contact@saloonify.com',
              address: '101 Elegance Arcade, Commercial Road',
              city: 'Bangalore',
              state: 'Karnataka',
              pincode: '560001',
              gstin: '',
              currencySymbol: '₹',
              defaultGstRate: 18,
              invoicePrefix: 'INV-',
              invoiceFooter: 'Thank you for choosing Saloonify! We look forward to serving you again.',
              termsAndConditions: 'Goods and services once billed cannot be exchanged or refunded.',
              operatingHours: {
                open: '09:00',
                close: '21:00',
                workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
              },
            }
          }
          onClose={() => setSavedInvoiceForPrint(null)}
          onOpenWhatsApp={(inv) => setWhatsAppModalInvoice(inv)}
        />
      )}
    </div>
  );
};
