import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Building2,
  User,
  Phone,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  UserPlus,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  Ticket
} from 'lucide-react';

type AuthMode = 'login' | 'register_owner' | 'forgot_password' | 'accept_invite' | 'first_setup';

export const LoginPage: React.FC = () => {
  const { login, setupFirstAdmin, registerOwner, acceptInvitation } = useAuth();

  // Mode: login, register_owner, forgot_password, accept_invite, first_setup
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [checkingSetup, setCheckingSetup] = useState<boolean>(true);

  // Common status
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // 1. Login State
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

  // 2. Owner Registration State
  const [ownerSalonName, setOwnerSalonName] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [ownerEmail, setOwnerEmail] = useState<string>('');
  const [ownerPhone, setOwnerPhone] = useState<string>('');
  const [ownerPassword, setOwnerPassword] = useState<string>('');
  const [ownerConfirmPassword, setOwnerConfirmPassword] = useState<string>('');
  const [ownerAddress, setOwnerAddress] = useState<string>('');
  const [ownerGstin, setOwnerGstin] = useState<string>('');
  const [showOwnerPassword, setShowOwnerPassword] = useState<boolean>(false);

  // 3. Forgot Password State
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [resetCode, setResetCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [generatedCodeHint, setGeneratedCodeHint] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

  // 4. Invitation Activation State
  const [inviteToken, setInviteToken] = useState<string>('');
  const [verifiedInvite, setVerifiedInvite] = useState<any | null>(null);
  const [invitePassword, setInvitePassword] = useState<string>('');
  const [inviteConfirmPassword, setInviteConfirmPassword] = useState<string>('');
  const [verifyingInvite, setVerifyingInvite] = useState<boolean>(false);
  const [showInvitePassword, setShowInvitePassword] = useState<boolean>(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await api.getSetupStatus();
        if (res.success && res.needsSetup) {
          setAuthMode('first_setup');
        } else {
          setAuthMode('login');
        }
      } catch (err: any) {
        console.warn('Could not verify setup status:', err.message);
        setAuthMode('login');
      } finally {
        setCheckingSetup(false);
      }
    }
    checkStatus();
  }, []);

  const clearMessages = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const switchMode = (mode: AuthMode) => {
    clearMessages();
    setAuthMode(mode);
  };

  // ------------------------------------
  // Form Submissions
  // ------------------------------------

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!loginEmail.trim() || !loginPassword) {
      setError('Please provide your registered email and password.');
      return;
    }

    try {
      setLoading(true);
      await login(loginEmail.trim(), loginPassword);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!ownerSalonName.trim() || !ownerName.trim() || !ownerEmail.trim() || !ownerPassword) {
      setError('Please fill in all required salon owner fields.');
      return;
    }

    if (ownerPassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (ownerPassword !== ownerConfirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    try {
      setLoading(true);
      await registerOwner({
        salonName: ownerSalonName.trim(),
        name: ownerName.trim(),
        email: ownerEmail.trim(),
        phone: ownerPhone.trim() || undefined,
        password: ownerPassword,
        salonAddress: ownerAddress.trim() || undefined,
        gstin: ownerGstin.trim() || undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Owner registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFirstSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!ownerSalonName.trim() || !ownerName.trim() || !ownerEmail.trim() || !ownerPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (ownerPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (ownerPassword !== ownerConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await setupFirstAdmin({
        salonName: ownerSalonName.trim(),
        name: ownerName.trim(),
        email: ownerEmail.trim(),
        phone: ownerPhone.trim() || undefined,
        password: ownerPassword,
      });
    } catch (err: any) {
      setError(err.message || 'Setup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!forgotEmail.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.forgotPassword(forgotEmail.trim());
      setSuccessMsg(res.message || 'Password reset code generated.');
      if (res.resetToken) {
        setGeneratedCodeHint(res.resetToken);
        setResetCode(res.resetToken);
      }
      setResetStep('confirm');
    } catch (err: any) {
      setError(err.message || 'Could not initiate password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!resetCode.trim() || !newPassword) {
      setError('Please enter the reset code and new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must contain at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.resetPassword(resetCode.trim(), newPassword);
      setSuccessMsg(res.message || 'Password reset successful! You may now sign in.');
      setResetStep('request');
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setGeneratedCodeHint(null);
      setTimeout(() => {
        setAuthMode('login');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!inviteToken.trim()) {
      setError('Please enter your invitation code.');
      return;
    }

    try {
      setVerifyingInvite(true);
      const res = await api.getInvitation(inviteToken.trim());
      if (res.success && res.invitation) {
        setVerifiedInvite(res.invitation);
        setSuccessMsg(`Invitation verified for ${res.invitation.name} (${res.invitation.role}) at ${res.invitation.salonName}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired invitation token.');
      setVerifiedInvite(null);
    } finally {
      setVerifyingInvite(false);
    }
  };

  const handleAcceptInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!invitePassword) {
      setError('Please choose a password for your account.');
      return;
    }

    if (invitePassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (invitePassword !== inviteConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await acceptInvitation({
        token: inviteToken.trim(),
        password: invitePassword,
        name: verifiedInvite?.name,
      });
    } catch (err: any) {
      setError(err.message || 'Account activation failed.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-300">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
          <span className="text-xs font-semibold tracking-wide">Starting Saloonify Operations & Database...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased relative selection:bg-sky-500 selection:text-white">
      {/* Background Accent Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-800 overflow-hidden relative z-10">
        {/* Brand Banner */}
        <div className="p-8 text-center border-b border-slate-800 bg-linear-to-b from-slate-850 to-slate-900">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl overflow-hidden border border-slate-700/80 shadow-lg bg-slate-800 flex items-center justify-center">
            <img
              src="/src/assets/images/saloonify_logo_mark_1792068954558.jpg"
              alt="Saloonify"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            Saloonify
            <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-sm bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Operations
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Multi-Role Salon & Spa Enterprise System</p>

          {/* Mode Switcher Tabs (Hidden during first setup) */}
          {authMode !== 'first_setup' && (
            <div className="flex items-center justify-center gap-1 mt-5 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  authMode === 'login'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('register_owner')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  authMode === 'register_owner'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                Register Salon
              </button>
              <button
                type="button"
                onClick={() => switchMode('accept_invite')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  authMode === 'accept_invite'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                Staff Invite
              </button>
              <button
                type="button"
                onClick={() => switchMode('forgot_password')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  authMode === 'forgot_password'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {/* Notifications */}
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1.5">Work Email / User Account</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@salon.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot_password')}
                    className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mt-2"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
                <button
                  type="button"
                  onClick={() => switchMode('register_owner')}
                  className="hover:text-slate-200 transition-colors flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5 text-sky-400" />
                  <span>Register as Salon Owner</span>
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('accept_invite')}
                  className="hover:text-slate-200 transition-colors flex items-center gap-1"
                >
                  <Ticket className="w-3.5 h-3.5 text-sky-400" />
                  <span>Activate Staff Account</span>
                </button>
              </div>
            </form>
          )}

          {/* 2. REGISTER SALON OWNER */}
          {authMode === 'register_owner' && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
                  <Building2 className="w-4 h-4" />
                  <span>Register Salon (Owner Account)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Public registration creates an isolated salon instance and owner account. Staff and managers are invited from within your salon dashboard.
                </p>
              </div>

              <form onSubmit={handleRegisterOwnerSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Salon / Business Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={ownerSalonName}
                      onChange={(e) => setOwnerSalonName(e.target.value)}
                      placeholder="e.g. Aura Luxury Salon & Spa"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">
                      Owner Full Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Owner name"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">
                      Business Email <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="owner@salon.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="tel"
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">GSTIN (Optional)</label>
                    <input
                      type="text"
                      value={ownerGstin}
                      onChange={(e) => setOwnerGstin(e.target.value)}
                      placeholder="29ABCDE1234F1Z5"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500 uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">
                      Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type={showOwnerPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        placeholder="Min 6 chars"
                        className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                        tabIndex={-1}
                      >
                        {showOwnerPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">
                      Confirm Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type={showOwnerPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={ownerConfirmPassword}
                        onChange={(e) => setOwnerConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Salon Address</label>
                  <input
                    type="text"
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                    placeholder="Street, City, State, Pincode"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mt-3"
                >
                  <span>{loading ? 'Creating Salon & Owner Account...' : 'Register Salon & Launch'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 3. FORGOT PASSWORD FLOW */}
          {authMode === 'forgot_password' && (
            <div className="space-y-4 text-xs">
              <div className="border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
                  <KeyRound className="w-4 h-4" />
                  <span>Password Reset Flow</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Request a secure verification code to reset your account credentials.
                </p>
              </div>

              {resetStep === 'request' ? (
                <form onSubmit={handleForgotRequestSubmit} className="space-y-4">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1.5">Registered Account Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="Enter your registered email"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>{loading ? 'Generating Code...' : 'Send Password Reset Code'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                  {generatedCodeHint && (
                    <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-300 text-xs">
                      <div className="font-semibold">Reset Code Generated:</div>
                      <div className="font-mono text-base font-bold tracking-widest mt-1 text-white select-all">
                        {generatedCodeHint}
                      </div>
                      <div className="text-[10px] text-sky-400/80 mt-1">
                        In production, this code is dispatched via SMS or Email.
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Verification Code</label>
                    <input
                      type="text"
                      required
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="6-digit code"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono tracking-widest text-center text-sm"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    <span>{loading ? 'Updating Password...' : 'Save New Password & Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetStep('request')}
                      className="hover:text-slate-200"
                    >
                      Request different code
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="hover:text-slate-200"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 4. ACCEPT STAFF / MANAGER INVITATION */}
          {authMode === 'accept_invite' && (
            <div className="space-y-4 text-xs">
              <div className="border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
                  <Ticket className="w-4 h-4" />
                  <span>Activate Staff / Manager Account</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter the invitation code provided by your salon administrator to set your password and join.
                </p>
              </div>

              {!verifiedInvite ? (
                <form onSubmit={handleVerifyInvitation} className="space-y-4">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1.5">Invitation Code / Token</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={inviteToken}
                        onChange={(e) => setInviteToken(e.target.value)}
                        placeholder="Paste your invitation token"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={verifyingInvite}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>{verifyingInvite ? 'Verifying Token...' : 'Verify Invitation Code'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleAcceptInviteSubmit} className="space-y-3.5">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Team Member:</span>
                      <span className="font-semibold text-white">{verifiedInvite.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Assigned Role:</span>
                      <span className="font-semibold text-sky-400 uppercase tracking-wide">
                        {verifiedInvite.role}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Salon:</span>
                      <span className="font-semibold text-white">{verifiedInvite.salonName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Registered Email:</span>
                      <span className="font-mono text-slate-300">{verifiedInvite.email}</span>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Create Account Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type={showInvitePassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={invitePassword}
                        onChange={(e) => setInvitePassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-9 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowInvitePassword(!showInvitePassword)}
                        className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                        tabIndex={-1}
                      >
                        {showInvitePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type={showInvitePassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={inviteConfirmPassword}
                        onChange={(e) => setInviteConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    <span>{loading ? 'Activating Account...' : 'Activate & Enter Dashboard'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setVerifiedInvite(null)}
                      className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Use a different code
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 5. FIRST SETUP FORM (Legacy / Clean Install) */}
          {authMode === 'first_setup' && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Initial Salon System Setup</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Create the primary administrator and salon instance to initialize your PostgreSQL database.
                </p>
              </div>

              <form onSubmit={handleFirstSetupSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Salon Name</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={ownerSalonName}
                      onChange={(e) => setOwnerSalonName(e.target.value)}
                      placeholder="e.g. Elegance Salon & Spa"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Administrator Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Primary owner / admin"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Admin Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="admin@salon.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="tel"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Confirm Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={ownerConfirmPassword}
                      onChange={(e) => setOwnerConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mt-3"
                >
                  <span>{loading ? 'Initializing Salon...' : 'Create Salon Administrator & Launch'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Footer Security Badges */}
          <div className="pt-4 border-t border-slate-800 text-[11px] text-center text-slate-500 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-sky-500" />
              Role-Enforced RBAC
            </span>
            <span>•</span>
            <span>PostgreSQL Persistence</span>
            <span>•</span>
            <span>Bcrypt Hashing</span>
          </div>
        </div>
      </div>
    </div>
  );
};
