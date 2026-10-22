import React, { useState, useEffect } from 'react';
import { User, Invitation } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users2,
  UserPlus,
  Mail,
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  KeyRound,
  Copy,
  Check,
  Ticket,
  Clock,
  UserCheck,
  Lock,
  Phone,
  Power
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';

  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  // Form states
  const [inviteName, setInviteName] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [invitePhone, setInvitePhone] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'staff'>('staff');

  const [createName, setCreateName] = useState<string>('');
  const [createEmail, setCreateEmail] = useState<string>('');
  const [createPassword, setCreatePassword] = useState<string>('');
  const [createPhone, setCreatePhone] = useState<string>('');
  const [createRole, setCreateRole] = useState<'admin' | 'manager' | 'staff'>('staff');

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editRole, setEditRole] = useState<'admin' | 'manager' | 'staff'>('staff');

  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [tempPasswordInput, setTempPasswordInput] = useState<string>('');
  const [generatedTempPassword, setGeneratedTempPassword] = useState<string | null>(null);

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant?: 'danger' | 'warning' | 'primary';
    action: () => Promise<void>;
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, invitesRes] = await Promise.all([
        api.getUsers(),
        api.getInvitations()
      ]);
      if (usersRes.success) setUsers(usersRes.users);
      if (invitesRes.success) setInvitations(invitesRes.invitations);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load user accounts.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleCopy = (text: string, token: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // 1. Send Invitation
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      triggerNotification('error', 'Name and email are required.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.inviteUser({
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        phone: invitePhone.trim() || undefined,
        role: inviteRole,
      });

      triggerNotification('success', res.message || 'Invitation sent successfully!');
      setShowInviteModal(false);
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      setInviteRole('staff');
      await loadData();
      setActiveTab('invitations');
    } catch (err: any) {
      triggerNotification('error', err.message || 'Failed to send invitation.');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Direct User Creation
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createEmail.trim() || !createPassword) {
      triggerNotification('error', 'Name, email, and password are required.');
      return;
    }

    if (createPassword.length < 6) {
      triggerNotification('error', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.createUser({
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        phone: createPhone.trim() || undefined,
        role: createRole,
      });

      triggerNotification('success', res.message || 'User account created successfully.');
      setShowCreateModal(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreatePhone('');
      setCreateRole('staff');
      await loadData();
    } catch (err: any) {
      triggerNotification('error', err.message || 'Failed to create user account.');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Edit User
  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditPhone(u.phone || '');
    setEditRole((u.role as any) || 'staff');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setActionLoading(true);
      const res = await api.updateUser(editingUser.id || editingUser._id!, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        role: editRole,
      });

      triggerNotification('success', res.message || 'User details updated.');
      setShowEditModal(false);
      setEditingUser(null);
      await loadData();
    } catch (err: any) {
      triggerNotification('error', err.message || 'Failed to update user.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Toggle Status (Activate / Deactivate)
  const handleToggleStatus = (targetUser: User) => {
    const userId = targetUser.id || targetUser._id!;
    const newStatus = targetUser.isActive === false ? true : false;

    setConfirmAction({
      title: newStatus ? 'Reactivate Account' : 'Deactivate Account',
      message: newStatus
        ? `Reactivate account for ${targetUser.name}? They will be permitted to log in.`
        : `Deactivate account for ${targetUser.name}? They will immediately be blocked from logging in.`,
      confirmLabel: newStatus ? 'Reactivate' : 'Deactivate',
      variant: newStatus ? 'primary' : 'warning',
      action: async () => {
        try {
          const res = await api.toggleUserStatus(userId, newStatus);
          triggerNotification('success', res.message || `Account ${newStatus ? 'activated' : 'deactivated'}.`);
          await loadData();
        } catch (err: any) {
          triggerNotification('error', err.message || 'Failed to update account status.');
        }
      },
    });
  };

  // 5. Admin Reset Password
  const openResetModal = (u: User) => {
    setResetTargetUser(u);
    setTempPasswordInput('');
    setGeneratedTempPassword(null);
    setShowResetModal(true);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;

    try {
      setActionLoading(true);
      const res = await api.adminResetPassword(
        resetTargetUser.id || resetTargetUser._id!,
        tempPasswordInput.trim() || undefined
      );

      setGeneratedTempPassword(res.temporaryPassword);
      triggerNotification('success', `Password reset for ${resetTargetUser.name}.`);
    } catch (err: any) {
      triggerNotification('error', err.message || 'Failed to reset password.');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Delete User
  const handleDeleteUser = (u: User) => {
    setConfirmAction({
      title: 'Delete User Account',
      message: `Are you sure you want to permanently delete user account "${u.name}" (${u.email})? This action cannot be undone.`,
      confirmLabel: 'Delete Account',
      variant: 'danger',
      action: async () => {
        try {
          const res = await api.deleteUser(u.id || u._id!);
          triggerNotification('success', res.message || 'User account removed.');
          await loadData();
        } catch (err: any) {
          triggerNotification('error', err.message || 'Failed to delete user.');
        }
      },
    });
  };

  // 7. Revoke Invitation
  const handleRevokeInvitation = (invId: string) => {
    setConfirmAction({
      title: 'Revoke Invitation',
      message: 'Revoke this invitation? The recipient will not be able to activate with this token.',
      confirmLabel: 'Revoke Invite',
      variant: 'danger',
      action: async () => {
        try {
          const res = await api.revokeInvitation(invId);
          triggerNotification('success', res.message || 'Invitation revoked.');
          await loadData();
        } catch (err: any) {
          triggerNotification('error', err.message || 'Failed to revoke invitation.');
        }
      },
    });
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.isActive !== false) ||
      (statusFilter === 'deactivated' && u.isActive === false);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between shadow-xs border ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Contract */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">User & Role Management</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
              RBAC Protected
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Administer salon personnel, invitations, credentials, and role authorizations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            title="Refresh user directory"
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          {(isAdmin || isManager) && (
            <>
              <button
                type="button"
                onClick={() => {
                  setInviteRole('staff');
                  setShowInviteModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-all"
              >
                <Mail className="w-3.5 h-3.5 text-sky-600" />
                <span>Invite Account</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreateRole('staff');
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Direct Account Creation</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users2 className="w-4 h-4" />
          <span>Active Accounts ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invitations')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'invitations'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Pending Invitations ({invitations.filter(i => i.status === 'pending').length})</span>
        </button>
      </div>

      {/* TAB 1: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search user name, email, or mobile..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-sky-500 text-xs"
              >
                <option value="all">All Roles</option>
                <option value="admin">Owner / Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-sky-500 text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="deactivated">Deactivated Only</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
                <span>Loading PostgreSQL user directory...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No users match the selected search or filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">User / Personnel</th>
                      <th className="py-3 px-4 font-semibold">Contact Email & Phone</th>
                      <th className="py-3 px-4 font-semibold">Role & Permissions</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Last Login</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => {
                      const isSelf = currentUser?.id === u.id || currentUser?.id === u._id;
                      const isActive = u.isActive !== false;

                      return (
                        <tr key={u.id || u._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sky-700 text-xs border border-slate-200 shrink-0">
                                {u.avatar ? (
                                  <img src={u.avatar} alt={u.name} className="w-full h-full object-cover rounded-full" />
                                ) : (
                                  u.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                                  {u.name}
                                  {isSelf && (
                                    <span className="px-1.5 py-0.2 rounded-sm bg-sky-100 text-sky-800 text-[9px] font-bold">
                                      YOU
                                    </span>
                                  )}
                                </span>
                                <span className="text-[11px] text-slate-400">ID: {(u.id || u._id || '').slice(0, 12)}...</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono text-slate-700">{u.email}</span>
                              {u.phone && <span className="text-slate-400 text-[11px]">{u.phone}</span>}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                <Shield className="w-3 h-3 text-amber-600" />
                                Owner / Admin
                              </span>
                            ) : u.role === 'manager' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                                <ShieldCheck className="w-3 h-3 text-sky-600" />
                                Manager
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                <UserCheck className="w-3 h-3 text-slate-500" />
                                Staff / Stylist
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                Deactivated
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never logged in'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(u)}
                                    title="Edit user details"
                                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openResetModal(u)}
                                    title="Reset user password"
                                    className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                  </button>

                                  {!isSelf && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatus(u)}
                                      title={isActive ? 'Deactivate account' : 'Reactivate account'}
                                      className={`p-1.5 rounded-lg transition-colors ${
                                        isActive
                                          ? 'text-slate-500 hover:text-rose-700 hover:bg-rose-50'
                                          : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
                                      }`}
                                    >
                                      <Power className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {!isSelf && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u)}
                                      title="Delete user account"
                                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INVITATIONS */}
      {activeTab === 'invitations' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {invitations.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No invitations have been generated yet. Use the "Invite Account" button above to send one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Invited Personnel</th>
                      <th className="py-3 px-4 font-semibold">Target Email</th>
                      <th className="py-3 px-4 font-semibold">Role</th>
                      <th className="py-3 px-4 font-semibold">Invitation Code / Link</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Expires</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invitations.map((inv) => {
                      const isPending = inv.status === 'pending';
                      const isExpired = new Date(inv.expiresAt).getTime() < Date.now();

                      return (
                        <tr key={inv._id || inv.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">{inv.name}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{inv.email}</td>
                          <td className="py-3.5 px-4">
                            <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                              {inv.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-700">
                                {inv.token}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(inv.token, inv.token)}
                                title="Copy invitation code"
                                className="p-1 text-slate-400 hover:text-slate-700"
                              >
                                {copiedToken === inv.token ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {inv.status === 'accepted' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Accepted
                              </span>
                            ) : isExpired ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                Expired
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {new Date(inv.expiresAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleRevokeInvitation(inv._id || inv.id!)}
                                className="text-rose-600 hover:text-rose-800 font-semibold text-[11px]"
                              >
                                Revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: INVITE USER ACCOUNT */}
      {/* ==================================================== */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">Invite Team Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="ramesh@salon.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mobile Phone (Optional)</label>
                <input
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assign Role *</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                >
                  <option value="staff">Staff / Stylist (Appointments & POS access)</option>
                  {isAdmin && <option value="manager">Manager (Operations, Schedules, Invoicing)</option>}
                  {isAdmin && <option value="admin">Owner / Administrator (Full Privileges)</option>}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  The invitee will receive a secure token to set their password upon activating.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs"
                >
                  {actionLoading ? 'Creating Invitation...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: DIRECT USER ACCOUNT CREATION */}
      {/* ==================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">Create Personnel Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Ananya Sen"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="ananya@salon.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mobile Phone (Optional)</label>
                <input
                  type="tel"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assign Role *</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                >
                  <option value="staff">Staff / Stylist</option>
                  {isAdmin && <option value="manager">Manager</option>}
                  {isAdmin && <option value="admin">Owner / Administrator</option>}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs"
                >
                  {actionLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: EDIT USER DETAILS & ROLE */}
      {/* ==================================================== */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">Update User Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email (Immutable)</label>
                <input
                  type="text"
                  disabled
                  value={editingUser.email}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Phone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Role & Permissions</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                >
                  <option value="staff">Staff / Stylist</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Owner / Administrator</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 4: ADMIN RESET PASSWORD */}
      {/* ==================================================== */}
      {showResetModal && resetTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-sm">Reset Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-600">
                Reset password for <strong className="text-slate-900">{resetTargetUser.name}</strong> ({resetTargetUser.email}).
              </p>

              {generatedTempPassword ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="text-emerald-800 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Password successfully updated!</span>
                  </div>
                  <div className="font-mono bg-white p-2.5 rounded-lg border border-emerald-200 text-slate-900 font-bold select-all flex items-center justify-between">
                    <span>{generatedTempPassword}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(generatedTempPassword, 'temp_pass')}
                      className="text-xs text-sky-600 hover:text-sky-800"
                    >
                      {copiedToken === 'temp_pass' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Provide this temporary password to {resetTargetUser.name}. They will be able to sign in immediately.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      New Temporary Password (Optional)
                    </label>
                    <input
                      type="text"
                      value={tempPasswordInput}
                      onChange={(e) => setTempPasswordInput(e.target.value)}
                      placeholder="Leave blank to auto-generate a secure password"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowResetModal(false)}
                      className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs"
                    >
                      {actionLoading ? 'Resetting...' : 'Set & Confirm Password'}
                    </button>
                  </div>
                </>
              )}

              {generatedTempPassword && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs"
                  >
                    Done
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION ACTION MODAL */}
      <ConfirmModal
        isOpen={Boolean(confirmAction)}
        title={confirmAction?.title}
        message={confirmAction?.message || ''}
        confirmLabel={confirmAction?.confirmLabel}
        confirmVariant={confirmAction?.variant || 'danger'}
        onConfirm={async () => {
          if (confirmAction) {
            await confirmAction.action();
            setConfirmAction(null);
          }
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};
