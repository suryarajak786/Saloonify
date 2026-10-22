import React, { useState, useEffect } from 'react';
import { Product, InventoryMovement } from '../types';
import { api } from '../services/api';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ArrowUpDown,
  History,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  Boxes
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'movements'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Add / Edit Product Modal
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [category, setCategory] = useState<string>('Haircare Products');
  const [purchaseCost, setPurchaseCost] = useState<number>(500);
  const [sellingPrice, setSellingPrice] = useState<number>(850);
  const [stockQuantity, setStockQuantity] = useState<number>(10);
  const [minStockThreshold, setMinStockThreshold] = useState<number>(5);
  const [unit, setUnit] = useState<string>('bottle');
  const [supplier, setSupplier] = useState<string>('');
  const [taxRate, setTaxRate] = useState<number>(18);
  const [formError, setFormError] = useState<string | null>(null);

  // Adjust Stock Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'purchase' | 'internal_use' | 'adjustment'>('purchase');
  const [adjustQty, setAdjustQty] = useState<number>(5);
  const [adjustNotes, setAdjustNotes] = useState<string>('');
  const [adjustPerformedBy, setAdjustPerformedBy] = useState<string>('Manager');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [prodRes, movRes] = await Promise.all([
        api.getInventory({ category: categoryFilter, search: searchQuery }),
        api.getInventoryMovements(),
      ]);

      if (prodRes.success) setProducts(prodRes.products);
      if (movRes.success) setMovements(movRes.movements);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [categoryFilter, searchQuery]);

  const categories = [
    'All',
    'Haircare Products',
    'Color & Bleach',
    'Skincare & Creams',
    'Nail Supplies',
    'Salon Disposables',
    'Retail Products',
  ];

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setSku('');
    setCategory('Haircare Products');
    setPurchaseCost(800);
    setSellingPrice(1200);
    setStockQuantity(10);
    setMinStockThreshold(5);
    setUnit('bottle');
    setSupplier('');
    setTaxRate(18);
    setFormError(null);
    setShowProductModal(true);
  };

  const handleOpenEdit = (prd: Product) => {
    setEditingId(prd._id);
    setName(prd.name);
    setSku(prd.sku || '');
    setCategory(prd.category);
    setPurchaseCost(prd.purchaseCost);
    setSellingPrice(prd.sellingPrice);
    setStockQuantity(prd.stockQuantity);
    setMinStockThreshold(prd.minStockThreshold);
    setUnit(prd.unit);
    setSupplier(prd.supplier || '');
    setTaxRate(prd.taxRate || 18);
    setFormError(null);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || purchaseCost < 0 || sellingPrice < 0) {
      setFormError('Product name and costs are required.');
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        sku: sku.trim() || undefined,
        category,
        purchaseCost: Number(purchaseCost),
        sellingPrice: Number(sellingPrice),
        stockQuantity: Number(stockQuantity),
        minStockThreshold: Number(minStockThreshold),
        unit,
        supplier: supplier.trim(),
        taxRate: Number(taxRate),
      };

      if (editingId) {
        await api.updateProduct(editingId, payload);
      } else {
        await api.createProduct(payload);
      }

      setShowProductModal(false);
      fetchInventory();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product');
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || adjustQty <= 0) return;

    try {
      await api.adjustStock(adjustingProduct._id, {
        type: adjustType,
        quantity: Number(adjustQty),
        notes: adjustNotes,
        performedBy: adjustPerformedBy,
      });

      setAdjustingProduct(null);
      setAdjustQty(5);
      setAdjustNotes('');
      fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock');
    }
  };

  const lowStockCount = products.filter((p) => p.stockQuantity <= p.minStockThreshold).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500">Total Products Tracked</span>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {products.length} SKUs
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500">Low Stock Warnings</span>
          <div className={`text-xl font-bold font-mono tabular-nums mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {lowStockCount} items
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500">Inventory Cost Valuation</span>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            ₹{products.reduce((acc, p) => acc + (p.purchaseCost * p.stockQuantity), 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Tabs and Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => setActiveTab('products')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'products'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Stock Inventory
          </button>
          <button type="button"
            onClick={() => setActiveTab('movements')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'movements'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Stock Audit Log ({movements.length})
          </button>
        </div>

        {activeTab === 'products' && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search SKU, product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </div>
        )}
      </div>

      {activeTab === 'products' ? (
        /* PRODUCTS TABLE */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-4 font-semibold">SKU</th>
                <th className="py-2.5 px-4 font-semibold">Product Name</th>
                <th className="py-2.5 px-4 font-semibold">Category</th>
                <th className="py-2.5 px-4 font-semibold text-right">Cost (₹)</th>
                <th className="py-2.5 px-4 font-semibold text-right">Selling (₹)</th>
                <th className="py-2.5 px-4 font-semibold text-center">Stock Level</th>
                <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {products.map((p) => {
                const isLow = p.stockQuantity <= p.minStockThreshold;
                return (
                  <tr key={p._id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-slate-500">{p.sku}</td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">
                      {p.name}
                      {p.supplier && <span className="block text-[10px] text-slate-400">{p.supplier}</span>}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600">{p.category}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-slate-600">₹{p.purchaseCost}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">₹{p.sellingPrice}</td>
                    <td className="py-3 px-4 text-center tabular-nums font-bold">
                      {p.stockQuantity} <span className="font-sans text-[10px] text-slate-400 font-normal">{p.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3" /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustingProduct(p);
                            setAdjustType('purchase');
                            setAdjustQty(5);
                          }}
                          className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold rounded text-[11px]"
                        >
                          Adjust Stock
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* AUDIT MOVEMENTS TABLE */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-4 font-semibold">Date & Time</th>
                <th className="py-2.5 px-4 font-semibold">Product</th>
                <th className="py-2.5 px-4 font-semibold text-center">Movement Type</th>
                <th className="py-2.5 px-4 font-semibold text-center">Qty</th>
                <th className="py-2.5 px-4 font-semibold text-center">Prev &rarr; New</th>
                <th className="py-2.5 px-4 font-semibold">Performed By</th>
                <th className="py-2.5 px-4 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {movements.map((mov) => (
                <tr key={mov._id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 text-slate-500 font-sans">
                    {new Date(mov.date).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-900">{mov.productName}</td>
                  <td className="py-2.5 px-4 text-center font-sans">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        mov.type === 'purchase'
                          ? 'bg-emerald-100 text-emerald-800'
                          : mov.type === 'sale'
                          ? 'bg-sky-100 text-sky-800'
                          : mov.type === 'internal_use'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {mov.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center font-bold tabular-nums">
                    {mov.type === 'purchase' ? `+${mov.quantity}` : `-${mov.quantity}`}
                  </td>
                  <td className="py-2.5 px-4 text-center tabular-nums text-slate-500">
                    {mov.previousStock} &rarr; <span className="text-slate-900 font-bold">{mov.newStock}</span>
                  </td>
                  <td className="py-2.5 px-4 font-sans text-slate-700">{mov.performedBy}</td>
                  <td className="py-2.5 px-4 font-sans text-slate-500 italic max-w-xs truncate">
                    {mov.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Adjust Stock - {adjustingProduct.name}</h3>
            <p className="text-xs text-slate-500">
              Current stock: <strong className="text-slate-800">{adjustingProduct.stockQuantity} {adjustingProduct.unit}</strong>
            </p>

            <form onSubmit={handleSaveAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason / Movement Type</label>
                <select
                  value={adjustType}
                  onChange={(e: any) => setAdjustType(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                >
                  <option value="purchase">Restock / Purchase (+)</option>
                  <option value="internal_use">Internal Salon Use / Backbar (-)</option>
                  <option value="adjustment">Manual Audit Adjustment (=)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Audit Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Dispensed for balayage treatments / Invoice LB-881"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Record Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingId ? 'Edit Product' : 'Add Inventory Product'}
              </h3>
              <button type="button" onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Olaplex No. 3 Hair Perfector"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
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
                  <label className="font-semibold text-slate-700 block mb-1">SKU / Barcode</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Purchase Cost (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Current Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Min Threshold</label>
                  <input
                    type="number"
                    min="1"
                    value={minStockThreshold}
                    onChange={(e) => setMinStockThreshold(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Packaging Unit</label>
                  <input
                    type="text"
                    placeholder="bottle, box"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Supplier / Brand</label>
                <input
                  type="text"
                  placeholder="e.g. L'Oreal Professional India"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
