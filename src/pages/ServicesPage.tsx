import React, { useState, useEffect } from 'react';
import { Service } from '../types';
import { api } from '../services/api';
import {
  Scissors,
  Plus,
  Search,
  Clock,
  IndianRupee,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('Hair Styling & Cuts');
  const [description, setDescription] = useState<string>('');
  const [price, setPrice] = useState<number>(500);
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [genderTarget, setGenderTarget] = useState<'all' | 'female' | 'male'>('all');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await api.getServices({
        category: categoryFilter,
        search: searchQuery,
      });
      if (res.success) {
        setServices(res.services);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [categoryFilter, searchQuery]);

  const categories = [
    'All',
    'Hair Styling & Cuts',
    'Hair Care',
    'Hair Coloring & Highlights',
    'Skin & Facials',
    'Spa & Massage',
    'Nail Care & Pedicure',
    'Men Grooming',
  ];

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setCategory('Hair Styling & Cuts');
    setDescription('');
    setPrice(650);
    setDurationMinutes(45);
    setTaxRate(18);
    setGenderTarget('all');
    setIsActive(true);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (srv: Service) => {
    setEditingId(srv._id);
    setName(srv.name);
    setCategory(srv.category);
    setDescription(srv.description || '');
    setPrice(srv.price);
    setDurationMinutes(srv.durationMinutes);
    setTaxRate(srv.taxRate || 18);
    setGenderTarget(srv.genderTarget || 'all');
    setIsActive(srv.isActive !== false);
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price <= 0 || durationMinutes <= 0) {
      setFormError('Name, valid price, and duration are required.');
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        category,
        description: description.trim(),
        price: Number(price),
        durationMinutes: Number(durationMinutes),
        taxRate: Number(taxRate),
        genderTarget,
        isActive,
      };

      if (editingId) {
        await api.updateService(editingId, payload);
      } else {
        await api.createService(payload);
      }

      setShowModal(false);
      fetchServices();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save service');
    }
  };

  const handleToggleActive = async (srv: Service) => {
    try {
      await api.updateService(srv._id, { isActive: !srv.isActive });
      fetchServices();
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;
    try {
      await api.deleteService(serviceToDelete._id);
      setServiceToDelete(null);
      fetchServices();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Filter and Add Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search treatments, hair, skin..."
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
          <span>Add New Service</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {categories.map((cat) => (
          <button type="button"
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
              categoryFilter === cat
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            {loading ? 'Loading catalog services...' : 'No services found.'}
          </div>
        ) : (
          services.map((srv) => (
            <div
              key={srv._id}
              className={`bg-white rounded-xl border p-4 shadow-2xs flex flex-col justify-between space-y-3 transition-colors ${
                srv.isActive ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200/60 bg-slate-50/50 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-sky-700 tracking-wider">
                      {srv.category}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug mt-0.5">{srv.name}</h4>
                  </div>
                  <span className="text-sm font-bold text-slate-900 font-mono tabular-nums shrink-0">
                    ₹{srv.price.toLocaleString('en-IN')}
                  </span>
                </div>

                {srv.description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {srv.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {srv.durationMinutes} mins
                  </span>
                  <span>·</span>
                  <span>GST: {srv.taxRate}%</span>
                  <span>·</span>
                  <span className="capitalize font-sans text-slate-600">{srv.genderTarget}</span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleActive(srv)}
                  className={`flex items-center gap-1 font-medium ${
                    srv.isActive ? 'text-emerald-700 hover:text-emerald-800' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {srv.isActive ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" /> Inactive
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(srv)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceToDelete(srv)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                    title="Delete Service"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT SERVICE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingId ? 'Edit Salon Service' : 'Add New Salon Treatment'}
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
                <label className="font-semibold text-slate-700 block mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Keratin Protein Smoothing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                    {categories.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Duration (Min) *</label>
                  <input
                    type="number"
                    required
                    min="5"
                    step="5"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">GST Tax Rate %</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Clientele</label>
                  <select
                    value={genderTarget}
                    onChange={(e: any) => setGenderTarget(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <option value="all">Unisex</option>
                    <option value="female">Women</option>
                    <option value="male">Men</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description / Benefits</label>
                <textarea
                  rows={2}
                  placeholder="Steps, products used, scalp benefits..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="activeToggle" className="text-slate-700 font-medium cursor-pointer">
                  Available for booking & billing
                </label>
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
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE SERVICE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(serviceToDelete)}
        title="Delete Service"
        message={`Are you sure you want to delete service "${serviceToDelete?.name}"?`}
        confirmLabel="Delete Service"
        onConfirm={confirmDeleteService}
        onCancel={() => setServiceToDelete(null)}
      />
    </div>
  );
};
