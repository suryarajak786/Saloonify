import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db, getDbStatus } from '../database.js';
import { authenticateToken, optionalAuth, requireRole, generateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Database connection status
router.get('/database/status', async (req: Request, res: Response) => {
  try {
    const status = getDbStatus();
    return res.json({ success: true, status });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 1. AUTHENTICATION & MULTI-USER MANAGEMENT
// ==========================================

router.get('/auth/setup-status', async (req: Request, res: Response) => {
  try {
    const userCount = await db.users.countDocuments();
    return res.json({
      success: true,
      needsSetup: userCount === 0,
      userCount
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Initial salon setup (Legacy compatibility)
router.post('/auth/setup-first-admin', async (req: Request, res: Response) => {
  try {
    const userCount = await db.users.countDocuments();
    if (userCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Salon administrator has already been registered. Please log in with your credentials.'
      });
    }

    const { name, email, password, phone, salonName, address, gstin } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create primary salon
    const salon = await db.salons.create({
      name: (salonName && salonName.trim()) ? salonName.trim() : 'Saloonify Luxury Salon & Spa',
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
      gstin: gstin ? gstin.trim() : '',
    });

    const newAdmin = await db.users.create({
      salonId: salon._id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'admin',
      phone: phone ? phone.trim() : '',
      avatar: '',
      isActive: true,
    });

    await db.salons.update(salon._id, { ownerId: newAdmin._id });

    if (salonName && salonName.trim()) {
      await db.settings.update({ salonName: salonName.trim() });
    }

    const token = generateToken(newAdmin);
    return res.status(201).json({
      success: true,
      message: 'Salon and primary administrator account successfully created!',
      token,
      user: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        phone: newAdmin.phone,
        avatar: newAdmin.avatar,
        salonId: salon._id,
        salonName: salon.name,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Public Owner/Admin Registration
router.post('/auth/register-owner', async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, salonName, salonAddress, gstin } = req.body;

    if (!name || !email || !password || !salonName) {
      return res.status(400).json({
        success: false,
        message: 'Owner name, business email, password, and salon name are required.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Check if email already registered
    const existing = await db.users.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in instead.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 1. Create Salon
    const salon = await db.salons.create({
      name: salonName.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      address: salonAddress ? salonAddress.trim() : '',
      gstin: gstin ? gstin.trim() : '',
    });

    // 2. Create Owner Account
    const newOwner = await db.users.create({
      salonId: salon._id,
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: 'admin',
      phone: phone ? phone.trim() : '',
      avatar: '',
      isActive: true,
    });

    // Link owner to salon
    await db.salons.update(salon._id, { ownerId: newOwner._id });

    // Initialize or sync salon settings
    await db.settings.update({
      salonName: salon.name,
      phone: salon.phone || '',
      email: salon.email || '',
      address: salon.address || '',
      gstin: salon.gstin || '',
    });

    const token = generateToken(newOwner);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Saloonify.',
      token,
      user: {
        id: newOwner._id,
        name: newOwner.name,
        email: newOwner.email,
        role: newOwner.role,
        phone: newOwner.phone,
        avatar: newOwner.avatar,
        salonId: salon._id,
        salonName: salon.name,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Sign In
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await db.users.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Check if account is active
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact your salon administrator.'
      });
    }

    // Update last login
    await db.users.findByIdAndUpdate(user._id, { lastLogin: new Date().toISOString() });

    // Fetch salon details
    const salon = user.salonId ? await db.salons.findById(user.salonId) : await db.salons.getDefault();

    const token = generateToken({
      _id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      salonId: user.salonId || salon?._id || 'sal_default'
    });

    const userSafe = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      salonId: user.salonId || salon?._id,
      salonName: salon?.name || 'Saloonify Salon',
      isActive: user.isActive !== false,
      lastLogin: new Date().toISOString(),
    };

    return res.json({ success: true, token, user: userSafe });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Forgot Password - Initiate Reset
router.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your registered email address.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await db.users.findOne({ email: cleanEmail });

    if (!user) {
      // Return 200 with standard response to avoid email enumeration
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset code has been generated.',
      });
    }

    // Generate 6-digit numeric reset token
    const resetToken = `${Math.floor(100000 + Math.random() * 900000)}`;
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    await db.passwordResets.create({
      userId: user._id,
      email: cleanEmail,
      token: resetToken,
      expiresAt,
    });

    return res.json({
      success: true,
      message: 'Password reset code generated successfully.',
      resetToken, // Returned so user can paste code directly in UI
      expiresAt,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Reset Password - Verify Token & Set New Password
router.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset code and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must contain at least 6 characters.' });
    }

    const resetRecord = await db.passwordResets.findByToken(token.trim());
    if (!resetRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset code.' });
    }

    if (new Date(resetRecord.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Password reset code has expired. Please request a new one.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.users.updatePassword(resetRecord.userId, hashedPassword);
    await db.passwordResets.markUsed(resetRecord._id);

    return res.json({
      success: true,
      message: 'Your password has been reset successfully! You can now log in.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Inspect Invitation by Token
router.get('/auth/invite/:token', async (req: Request, res: Response) => {
  try {
    const invitation = await db.invitations.findByToken(req.params.token.trim());
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found or invalid.' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This invitation has already been ${invitation.status}.`
      });
    }

    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'This invitation has expired. Please request a new invite.' });
    }

    const salon = await db.salons.findById(invitation.salonId);

    return res.json({
      success: true,
      invitation: {
        token: invitation.token,
        name: invitation.name,
        email: invitation.email,
        phone: invitation.phone,
        role: invitation.role,
        salonName: salon?.name || 'Saloonify Salon',
        expiresAt: invitation.expiresAt,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Accept Invitation & Activate Account
router.post('/auth/accept-invite', async (req: Request, res: Response) => {
  try {
    const { token, password, name } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Invitation code and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const invitation = await db.invitations.findByToken(token.trim());
    if (!invitation || invitation.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Invalid, already used, or expired invitation.' });
    }

    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invitation has expired.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if user already exists
    let user = await db.users.findOne({ email: invitation.email });
    if (user) {
      await db.users.updatePassword(user._id, hashedPassword);
      await db.users.findByIdAndUpdate(user._id, {
        salonId: invitation.salonId,
        role: invitation.role,
        isActive: true,
        name: (name && name.trim()) ? name.trim() : user.name,
      });
      user = await db.users.findOne({ email: invitation.email });
    } else {
      user = await db.users.create({
        salonId: invitation.salonId,
        name: (name && name.trim()) ? name.trim() : invitation.name,
        email: invitation.email,
        password: hashedPassword,
        role: invitation.role,
        phone: invitation.phone || '',
        avatar: '',
        isActive: true,
      });
    }

    await db.invitations.updateStatus(invitation._id, 'accepted');

    const salon = await db.salons.findById(invitation.salonId);
    const sessionToken = generateToken({
      _id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      salonId: user.salonId
    });

    return res.status(201).json({
      success: true,
      message: 'Account successfully activated! Welcome to the team.',
      token: sessionToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        salonId: user.salonId,
        salonName: salon?.name || 'Saloonify Salon',
        isActive: true,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Current Authenticated User Profile
router.get('/auth/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.users.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const salon = user.salonId ? await db.salons.findById(user.salonId) : await db.salons.getDefault();

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        salonId: user.salonId,
        salonName: salon?.name || 'Saloonify Salon',
        isActive: user.isActive !== false,
        lastLogin: user.lastLogin,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// USER & STAFF ACCOUNT MANAGEMENT (Admin / Manager)
// ==========================================

// GET all users in salon
router.get('/users', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const salonId = req.user!.salonId;
    const users = await db.users.find(salonId ? { salonId } : undefined);
    return res.json({ success: true, users });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST Invite new staff/manager account
router.post('/users/invite', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, role } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required to send an invitation.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const assignedRole = (role && ['admin', 'manager', 'staff'].includes(role)) ? role : 'staff';

    // Manager can only invite staff
    if (req.user!.role === 'manager' && assignedRole !== 'staff') {
      return res.status(403).json({ success: false, message: 'Managers are only permitted to invite Staff accounts.' });
    }

    // Check if user already exists
    const existingUser = await db.users.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `An account already exists for ${cleanEmail} (${existingUser.name}).`
      });
    }

    const salonId = req.user!.salonId || 'sal_default';
    const invitation = await db.invitations.create({
      salonId,
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      role: assignedRole,
      createdBy: req.user!.id,
    });

    return res.status(201).json({
      success: true,
      message: `Invitation generated for ${name.trim()} (${assignedRole}).`,
      invitation
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST Direct account creation by Admin / Manager
router.post('/users', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must contain at least 6 characters.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const assignedRole = (role && ['admin', 'manager', 'staff'].includes(role)) ? role : 'staff';

    if (req.user!.role === 'manager' && assignedRole !== 'staff') {
      return res.status(403).json({ success: false, message: 'Managers may only create Staff accounts.' });
    }

    const existing = await db.users.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const salonId = req.user!.salonId || 'sal_default';

    const newUser = await db.users.create({
      salonId,
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: assignedRole,
      phone: phone ? phone.trim() : '',
      avatar: '',
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: `User account created successfully for ${newUser.name}.`,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        isActive: true,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT Update user details or role (Admin only)
router.put('/users/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, role } = req.body;
    const targetUser = await db.users.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Protect against self-demotion if last admin
    if (req.user!.id === req.params.id && role && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'You cannot remove your own Admin privileges.' });
    }

    const updates: any = {};
    if (name) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (role && ['admin', 'manager', 'staff'].includes(role)) updates.role = role;

    const updated = await db.users.findByIdAndUpdate(req.params.id, updates);
    return res.json({ success: true, message: 'User updated successfully.', user: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT Toggle active/deactivated status (Admin only)
router.put('/users/:id/status', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { isActive } = req.body;
    if (req.user!.id === req.params.id) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own administrative account.' });
    }

    const updated = await db.users.findByIdAndUpdate(req.params.id, { isActive: Boolean(isActive) });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      message: `Account has been ${isActive ? 'activated' : 'deactivated'}.`,
      user: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST Admin-initiated password reset
router.post('/users/:id/reset-password', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { temporaryPassword } = req.body;
    const targetUser = await db.users.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const newPass = (temporaryPassword && temporaryPassword.trim().length >= 6)
      ? temporaryPassword.trim()
      : `Saloonify@${Math.floor(1000 + Math.random() * 9000)}`;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPass, salt);

    await db.users.updatePassword(req.params.id, hashedPassword);

    return res.json({
      success: true,
      message: `Password reset successfully for ${targetUser.name}.`,
      temporaryPassword: newPass,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE User account (Admin only)
router.delete('/users/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.id === req.params.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own administrative account.' });
    }

    const deleted = await db.users.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, message: 'User account removed.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET active invitations
router.get('/invitations', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const salonId = req.user!.salonId;
    const invitations = await db.invitations.findBySalon(salonId);
    return res.json({ success: true, invitations });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE Revoke invitation
router.delete('/invitations/:id', authenticateToken, requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    await db.invitations.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Invitation revoked.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


// ==========================================
// 2. DASHBOARD SUMMARY STATS
// ==========================================

router.get('/dashboard/stats', async (req: Request, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const [invoices, appointments, customers, services, products, expenses] = await Promise.all([
      db.invoices.find(),
      db.appointments.find(),
      db.customers.find(),
      db.services.find(),
      db.products.find(),
      db.expenses.find()
    ]);

    // Today's invoices
    const todayInvoices = invoices.filter((inv: any) => inv.date && inv.date.startsWith(todayStr));
    const todaySales = todayInvoices.reduce((sum: number, inv: any) => sum + (inv.grandTotal || 0), 0);

    // Today's appointments
    const todayAppointments = appointments.filter((apt: any) => apt.appointmentDate === todayStr);
    const completedToday = todayAppointments.filter((apt: any) => apt.status === 'completed').length;
    const pendingToday = todayAppointments.filter((apt: any) => ['booked', 'confirmed', 'in_progress'].includes(apt.status)).length;

    // Recent invoices (sorted by date descending)
    const sortedInvoices = [...invoices].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentInvoices = sortedInvoices.slice(0, 5);

    // Upcoming appointments
    const upcomingAppointments = appointments
      .filter((apt: any) => apt.appointmentDate >= todayStr && ['booked', 'confirmed', 'in_progress'].includes(apt.status))
      .sort((a: any, b: any) => `${a.appointmentDate} ${a.startTime}`.localeCompare(`${b.appointmentDate} ${b.startTime}`))
      .slice(0, 5);

    // Popular services based on invoice items
    const serviceSalesCount: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const inv of invoices) {
      if (Array.isArray(inv.items)) {
        for (const item of inv.items) {
          if (item.itemType === 'service') {
            const key = item.name || 'Unknown';
            if (!serviceSalesCount[key]) {
              serviceSalesCount[key] = { name: key, count: 0, revenue: 0 };
            }
            serviceSalesCount[key].count += item.quantity || 1;
            serviceSalesCount[key].revenue += item.totalAmount || 0;
          }
        }
      }
    }
    const popularServices = Object.values(serviceSalesCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 7-day sales trend
    const salesTrend: { date: string; dayName: string; sales: number; count: number }[] = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dStr = d.toISOString().split('T')[0];
      const dayName = days[d.getDay()];
      const dayInvoices = invoices.filter((inv: any) => inv.date && inv.date.startsWith(dStr));
      const sales = dayInvoices.reduce((sum: number, inv: any) => sum + (inv.grandTotal || 0), 0);
      salesTrend.push({ date: dStr, dayName, sales, count: dayInvoices.length });
    }

    // Low stock items
    const lowStockItems = products.filter((p: any) => (p.stockQuantity || 0) <= (p.minStockThreshold || 5));

    return res.json({
      success: true,
      stats: {
        todaySales,
        todayInvoicesCount: todayInvoices.length,
        todayAppointmentsCount: todayAppointments.length,
        completedToday,
        pendingToday,
        totalCustomers: customers.length,
        totalServices: services.length,
        lowStockCount: lowStockItems.length,
        lowStockItems: lowStockItems.slice(0, 4),
        recentInvoices,
        upcomingAppointments,
        popularServices,
        salesTrend,
        dbStatus: db.getConnectionStatus()
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 3. CUSTOMER MANAGEMENT
// ==========================================

router.get('/customers', async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    let customers = await db.customers.find(typeof search === 'string' ? search : undefined);

    if (search && typeof search === 'string') {
      const q = search.toLowerCase().trim();
      customers = customers.filter((c: any) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    }

    customers.sort((a: any, b: any) => (b.totalSpent || 0) - (a.totalSpent || 0));
    return res.json({ success: true, customers });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/customers/:id', async (req: Request, res: Response) => {
  try {
    const customer = await db.customers.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Fetch related appointments and invoices
    const [appointments, invoices] = await Promise.all([
      db.appointments.find({ customerId: req.params.id }),
      db.invoices.find({ customerId: req.params.id })
    ]);

    appointments.sort((a: any, b: any) => new Date(`${b.appointmentDate} ${b.startTime}`).getTime() - new Date(`${a.appointmentDate} ${a.startTime}`).getTime());
    invoices.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({
      success: true,
      customer,
      appointments,
      invoices
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/customers', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, gender, birthdate, anniversary, address, notes, preferences } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone number are required.' });
    }

    // Check duplicate phone
    const cleanPhone = phone.trim();
    const existing = await db.customers.findOne({ phone: cleanPhone });
    if (existing) {
      return res.status(400).json({ success: false, message: `A customer with phone ${cleanPhone} already exists (${existing.name}).` });
    }

    const newCustomer = await db.customers.create({
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.trim() : '',
      gender: gender || 'female',
      birthdate: birthdate || '',
      anniversary: anniversary || '',
      address: address ? address.trim() : '',
      notes: notes ? notes.trim() : '',
      preferences: preferences ? preferences.trim() : '',
      totalVisits: 0,
      totalSpent: 0,
      lastVisitDate: ''
    });

    return res.status(201).json({ success: true, customer: newCustomer });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/customers/:id', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, gender, birthdate, anniversary, address, notes, preferences } = req.body;
    const existing = await db.customers.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // If phone changed, check duplicates
    if (phone && phone.trim() !== existing.phone) {
      const duplicate = await db.customers.findOne({ phone: phone.trim() });
      if (duplicate && duplicate._id !== req.params.id) {
        return res.status(400).json({ success: false, message: `Phone number ${phone.trim()} is already used by another customer.` });
      }
    }

    const updated = await db.customers.findByIdAndUpdate(req.params.id, {
      ...(name && { name: name.trim() }),
      ...(phone && { phone: phone.trim() }),
      ...(email !== undefined && { email: email.trim() }),
      ...(gender && { gender }),
      ...(birthdate !== undefined && { birthdate }),
      ...(anniversary !== undefined && { anniversary }),
      ...(address !== undefined && { address: address.trim() }),
      ...(notes !== undefined && { notes: notes.trim() }),
      ...(preferences !== undefined && { preferences: preferences.trim() }),
    });

    return res.json({ success: true, customer: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/customers/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await db.customers.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }
    return res.json({ success: true, message: 'Customer deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 4. SERVICES AND PRICING
// ==========================================

router.get('/services', async (req: Request, res: Response) => {
  try {
    const { category, search, activeOnly } = req.query;
    let services = await db.services.find(
      typeof category === 'string' ? category : undefined,
      typeof search === 'string' ? search : undefined,
      activeOnly === 'true'
    );

    if (activeOnly === 'true') {
      services = services.filter((s: any) => s.isActive !== false);
    }

    if (category && typeof category === 'string' && category !== 'All') {
      services = services.filter((s: any) => s.category === category);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase().trim();
      services = services.filter((s: any) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.category && s.category.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
      );
    }

    services.sort((a: any, b: any) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    return res.json({ success: true, services });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/services', async (req: Request, res: Response) => {
  try {
    const { name, category, description, price, durationMinutes, taxRate, isActive, genderTarget } = req.body;
    if (!name || price === undefined || !durationMinutes) {
      return res.status(400).json({ success: false, message: 'Name, price, and duration are required.' });
    }

    const newService = await db.services.create({
      name: name.trim(),
      category: category || 'Hair Styling & Cuts',
      description: description ? description.trim() : '',
      price: Number(price),
      durationMinutes: Number(durationMinutes),
      taxRate: taxRate !== undefined ? Number(taxRate) : 18,
      isActive: isActive !== false,
      genderTarget: genderTarget || 'all'
    });

    return res.status(201).json({ success: true, service: newService });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/services/:id', async (req: Request, res: Response) => {
  try {
    const { name, category, description, price, durationMinutes, taxRate, isActive, genderTarget } = req.body;
    const updated = await db.services.findByIdAndUpdate(req.params.id, {
      ...(name && { name: name.trim() }),
      ...(category && { category }),
      ...(description !== undefined && { description: description.trim() }),
      ...(price !== undefined && { price: Number(price) }),
      ...(durationMinutes !== undefined && { durationMinutes: Number(durationMinutes) }),
      ...(taxRate !== undefined && { taxRate: Number(taxRate) }),
      ...(isActive !== undefined && { isActive }),
      ...(genderTarget && { genderTarget })
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Service not found.' });
    }

    return res.json({ success: true, service: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/services/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await db.services.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Service not found.' });
    }
    return res.json({ success: true, message: 'Service removed successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5. APPOINTMENT MANAGEMENT
// ==========================================

router.get('/appointments', async (req: Request, res: Response) => {
  try {
    const { date, staffId, customerId, status } = req.query;
    let appointments = await db.appointments.find({});

    if (date && typeof date === 'string') {
      appointments = appointments.filter((a: any) => a.appointmentDate === date);
    }
    if (staffId && typeof staffId === 'string' && staffId !== 'all') {
      appointments = appointments.filter((a: any) => a.staffId === staffId);
    }
    if (customerId && typeof customerId === 'string') {
      appointments = appointments.filter((a: any) => a.customerId === customerId);
    }
    if (status && typeof status === 'string' && status !== 'all') {
      appointments = appointments.filter((a: any) => a.status === status);
    }

    appointments.sort((a: any, b: any) => `${a.appointmentDate} ${a.startTime}`.localeCompare(`${b.appointmentDate} ${b.startTime}`));
    return res.json({ success: true, appointments });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/appointments', async (req: Request, res: Response) => {
  try {
    const { customerId, staffId, serviceIds, appointmentDate, startTime, notes, allowOverlap } = req.body;

    if (!customerId || !staffId || !serviceIds || !serviceIds.length || !appointmentDate || !startTime) {
      return res.status(400).json({ success: false, message: 'Customer, staff, services, date, and start time are required.' });
    }

    const customer = await db.customers.findById(customerId);
    if (!customer) return res.status(404).json({ success: false, message: 'Selected customer not found.' });

    const staffMember = await db.staff.findById(staffId);
    if (!staffMember) return res.status(404).json({ success: false, message: 'Selected staff member not found.' });

    // Fetch service records to determine duration and total amount
    const allServices = await db.services.find();
    const selectedServices = allServices.filter((s: any) => serviceIds.includes(s._id));

    if (!selectedServices.length) {
      return res.status(400).json({ success: false, message: 'No valid services selected.' });
    }

    const totalDurationMinutes = selectedServices.reduce((sum: number, s: any) => sum + (s.durationMinutes || 30), 0);
    const totalAmount = selectedServices.reduce((sum: number, s: any) => sum + (s.price || 0), 0);

    // Calculate end time
    const [startH, startM] = startTime.split(':').map(Number);
    const totalStartM = startH * 60 + startM;
    const totalEndM = totalStartM + totalDurationMinutes;
    const endH = Math.floor(totalEndM / 60) % 24;
    const endM = totalEndM % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    // Conflict detection for the same staff member unless override is explicitly allowed
    if (!allowOverlap) {
      const existingSameDay = await db.appointments.find({
        date: appointmentDate,
        staffId
      });

      const activeAppointments = existingSameDay.filter((apt: any) => apt.status !== 'cancelled' && apt.status !== 'no_show');

      for (const apt of activeAppointments) {
        const [aptStartH, aptStartM] = apt.startTime.split(':').map(Number);
        const [aptEndH, aptEndM] = apt.endTime.split(':').map(Number);
        const aptStartTotal = aptStartH * 60 + aptStartM;
        const aptEndTotal = aptEndH * 60 + aptEndM;

        // Check time interval overlap: (StartA < EndB) and (EndA > StartB)
        if (totalStartM < aptEndTotal && totalEndM > aptStartTotal) {
          return res.status(409).json({
            success: false,
            message: `Schedule conflict: ${staffMember.name} is already booked from ${apt.startTime} to ${apt.endTime} for ${apt.customerName}.`,
            conflict: apt
          });
        }
      }
    }

    // Generate unique appointment number
    const count = await db.appointments.countDocuments();
    const appointmentNumber = `APT-${1000 + count + 1}`;

    const newAppointment = await db.appointments.create({
      appointmentNumber,
      customerId,
      customerName: customer.name,
      customerPhone: customer.phone,
      staffId,
      staffName: staffMember.name,
      services: selectedServices.map((s: any) => ({
        serviceId: s._id,
        name: s.name,
        price: s.price,
        durationMinutes: s.durationMinutes
      })),
      appointmentDate,
      startTime,
      endTime,
      status: 'booked',
      notes: notes || '',
      totalAmount
    });

    return res.status(201).json({ success: true, appointment: newAppointment });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/appointments/:id', async (req: Request, res: Response) => {
  try {
    const { status, appointmentDate, startTime, staffId, notes, allowOverlap } = req.body;
    const existing = await db.appointments.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    let staffName = existing.staffName;
    if (staffId && staffId !== existing.staffId) {
      const staffMember = await db.staff.findById(staffId);
      if (staffMember) staffName = staffMember.name;
    }

    const updated = await db.appointments.findByIdAndUpdate(req.params.id, {
      ...(status && { status }),
      ...(appointmentDate && { appointmentDate }),
      ...(startTime && { startTime }),
      ...(staffId && { staffId, staffName }),
      ...(notes !== undefined && { notes })
    });

    return res.json({ success: true, appointment: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/appointments/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await db.appointments.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }
    return res.json({ success: true, message: 'Appointment removed.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 6. BILLING AND POINT OF SALE (POS)
// ==========================================

router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, paymentMethod, customerId, search } = req.query;
    let invoices = await db.invoices.find({});

    if (startDate && typeof startDate === 'string') {
      invoices = invoices.filter((inv: any) => inv.date && inv.date >= startDate);
    }
    if (endDate && typeof endDate === 'string') {
      const endOfDay = `${endDate}T23:59:59.999Z`;
      invoices = invoices.filter((inv: any) => inv.date && inv.date <= endOfDay);
    }
    if (paymentMethod && typeof paymentMethod === 'string' && paymentMethod !== 'all') {
      invoices = invoices.filter((inv: any) => inv.paymentMethod === paymentMethod);
    }
    if (customerId && typeof customerId === 'string') {
      invoices = invoices.filter((inv: any) => inv.customerId === customerId);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase().trim();
      invoices = invoices.filter((inv: any) =>
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
        (inv.customerPhone && inv.customerPhone.includes(q))
      );
    }

    invoices.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return res.json({ success: true, invoices });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await db.invoices.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }
    const settings = (await db.settings.get()) || {};
    return res.json({ success: true, invoice, settings });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/invoices', async (req: Request, res: Response) => {
  try {
    const {
      customerId: inputCustomerId,
      customerName: inputCustomerName,
      customerPhone: inputCustomerPhone,
      customerEmail: inputCustomerEmail,
      customerAddress: inputCustomerAddress,
      staffId,
      appointmentId,
      items,
      overallDiscountValue = 0,
      overallDiscountType = 'percentage',
      paymentMethod = 'cash',
      paidAmount,
      notes = ''
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'At least one service or product item is required to generate a bill.' });
    }

    // 1. Resolve or Automatically Store Customer Record
    let customer: any = null;
    const cleanPhone = inputCustomerPhone ? inputCustomerPhone.replace(/[\s\-\(\)]/g, '').trim() : '';

    if (inputCustomerId) {
      customer = await db.customers.findById(inputCustomerId);
    }

    // If not found by ID or no ID given, search by phone number to prevent duplicates
    if (!customer && cleanPhone) {
      customer = await db.customers.findOne({ phone: cleanPhone });
      if (!customer) {
        // Also check raw phone in case of formatting variations
        customer = await db.customers.findOne({ phone: inputCustomerPhone.trim() });
      }
    }

    // If still no customer found, but phone/name provided, automatically create customer in database!
    if (!customer) {
      if (!cleanPhone && !inputCustomerName) {
        return res.status(400).json({
          success: false,
          message: 'Customer name or valid mobile number is required to generate the bill.'
        });
      }

      const initialName = (inputCustomerName || '').trim() || 'Guest Customer';
      const initialPhone = (inputCustomerPhone || '').trim() || cleanPhone || 'Not Provided';

      customer = await db.customers.create({
        name: initialName,
        phone: initialPhone,
        email: (inputCustomerEmail || '').trim(),
        address: (inputCustomerAddress || '').trim(),
        totalVisits: 0,
        totalSpent: 0,
        lastVisitDate: new Date().toISOString().split('T')[0]
      });
      console.log(`[Saloonify Billing] Automatically stored new customer: ${customer.name} (${customer.phone}) with ID: ${customer._id}`);
    } else {
      // Customer already exists: update name/email/address if new values provided
      const updates: any = {};
      if (inputCustomerName && inputCustomerName.trim() && inputCustomerName.trim() !== customer.name) {
        updates.name = inputCustomerName.trim();
      }
      if (inputCustomerEmail && inputCustomerEmail.trim() && !customer.email) {
        updates.email = inputCustomerEmail.trim();
      }
      if (inputCustomerAddress && inputCustomerAddress.trim() && !customer.address) {
        updates.address = inputCustomerAddress.trim();
      }
      if (Object.keys(updates).length > 0) {
        customer = await db.customers.findByIdAndUpdate(customer._id, updates);
        console.log(`[Saloonify Billing] Updated existing customer details: ${customer.name}`);
      }
    }

    let staffName = '';
    if (staffId) {
      const staffMember = await db.staff.findById(staffId);
      if (staffMember) staffName = staffMember.name;
    }

    // 2. Authoritative Server-Side Calculation
    let totalGross = 0;
    let totalItemDiscount = 0;
    const computedItems: any[] = [];

    for (const it of items) {
      const qty = Math.max(1, Number(it.quantity) || 1);
      const unitPrice = Math.max(0, Number(it.unitPrice) || 0);
      const lineGross = qty * unitPrice;
      totalGross += lineGross;

      // Item discount
      let itemDiscAmount = 0;
      if (it.discountType === 'fixed') {
        itemDiscAmount = Math.min(Number(it.discountValue) || 0, lineGross);
      } else {
        const pct = Math.min(Math.max(Number(it.discountValue) || 0, 0), 100);
        itemDiscAmount = (lineGross * pct) / 100;
      }
      totalItemDiscount += itemDiscAmount;

      const taxableAmount = Math.max(0, lineGross - itemDiscAmount);
      const taxRate = it.taxRate !== undefined ? Number(it.taxRate) : 18;
      const halfRate = taxRate / 2;
      const cgstAmount = Number(((taxableAmount * halfRate) / 100).toFixed(2));
      const sgstAmount = Number(((taxableAmount * halfRate) / 100).toFixed(2));
      const totalAmount = Number((taxableAmount + cgstAmount + sgstAmount).toFixed(2));

      computedItems.push({
        itemId: it.itemId || it._id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        itemType: it.itemType || 'service',
        name: it.name || 'Service',
        category: it.category || 'General',
        quantity: qty,
        unitPrice,
        discountType: it.discountType || 'percentage',
        discountValue: Number(it.discountValue) || 0,
        discountAmount: itemDiscAmount,
        taxableAmount,
        taxRate,
        cgstRate: halfRate,
        cgstAmount,
        sgstRate: halfRate,
        sgstAmount,
        totalAmount
      });
    }

    // Overall discount calculation
    let additionalDiscount = 0;
    const preTaxSubtotal = Math.max(0, totalGross - totalItemDiscount);
    if (overallDiscountType === 'fixed') {
      additionalDiscount = Math.min(Number(overallDiscountValue) || 0, preTaxSubtotal);
    } else {
      const pct = Math.min(Math.max(Number(overallDiscountValue) || 0, 0), 100);
      additionalDiscount = (preTaxSubtotal * pct) / 100;
    }

    const totalDiscount = totalItemDiscount + additionalDiscount;
    const finalTaxable = Math.max(0, totalGross - totalDiscount);

    // Sum item taxes
    const cgstTotal = Number(computedItems.reduce((acc, it) => acc + it.cgstAmount, 0).toFixed(2));
    const sgstTotal = Number(computedItems.reduce((acc, it) => acc + it.sgstAmount, 0).toFixed(2));
    const totalTax = Number((cgstTotal + sgstTotal).toFixed(2));

    const exactGrandTotal = finalTaxable + totalTax;
    const grandTotal = Math.round(exactGrandTotal);
    const roundOff = Number((grandTotal - exactGrandTotal).toFixed(2));

    const finalPaidAmount = paidAmount !== undefined ? Number(paidAmount) : grandTotal;
    const dueAmount = Math.max(0, grandTotal - finalPaidAmount);
    const paymentStatus = dueAmount === 0 ? 'paid' : (finalPaidAmount > 0 ? 'partial' : 'unpaid');

    // 3. Prevent duplicate invoices and generate sequential invoice number
    const totalInvoices = await db.invoices.countDocuments();
    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String(totalInvoices + 1).padStart(4, '0')}`;

    const newInvoice = await db.invoices.create({
      invoiceNumber,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address || '',
      staffId: staffId || '',
      staffName,
      appointmentId: appointmentId || '',
      date: new Date().toISOString(),
      items: computedItems,
      subtotal: totalGross,
      discountAmount: Number(totalDiscount.toFixed(2)),
      taxableAmount: Number(finalTaxable.toFixed(2)),
      cgstTotal,
      sgstTotal,
      totalTax,
      grandTotal,
      roundOff,
      paymentMethod,
      paymentStatus,
      paidAmount: finalPaidAmount,
      dueAmount,
      notes: (notes || '').trim()
    });

    // 4. Save normalized invoice items and initial payment record
    try {
      await db.invoiceItems.createMany(newInvoice.id, computedItems);
      if (finalPaidAmount > 0) {
        await db.payments.create({
          invoiceId: newInvoice.id,
          customerId: customer._id,
          amount: finalPaidAmount,
          paymentMethod,
          paymentStatus: paymentStatus === 'unpaid' ? 'pending' : 'completed',
          paymentDate: newInvoice.date,
          notes: `Payment for invoice ${invoiceNumber}`,
        });
      }
    } catch (saveDetailErr: any) {
      console.warn('[Saloonify Billing] Notice saving normalized items/payment:', saveDetailErr.message);
    }

    // 5. Update customer stats safely in database
    await db.customers.findByIdAndUpdate(customer._id, {
      totalVisits: (Number(customer.totalVisits) || 0) + 1,
      totalSpent: (Number(customer.totalSpent) || 0) + grandTotal,
      lastVisitDate: new Date().toISOString().split('T')[0]
    });

    // Deduct stock for any retail product items sold
    for (const it of computedItems) {
      if (it.itemType === 'product' && it.itemId) {
        const prod = await db.products.findById(it.itemId);
        if (prod) {
          const prev = prod.stockQuantity || 0;
          const next = Math.max(0, prev - (it.quantity || 1));
          await db.products.findByIdAndUpdate(prod._id, { stockQuantity: next });
          await db.inventoryMovements.create({
            productId: prod._id,
            productName: prod.name,
            type: 'sale',
            quantity: it.quantity || 1,
            previousStock: prev,
            newStock: next,
            date: new Date().toISOString(),
            performedBy: staffName || 'POS Terminal',
            notes: `Invoice ${invoiceNumber}`
          });
        }
      }
    }

    // If linked to an appointment, mark it completed
    if (appointmentId) {
      await db.appointments.findByIdAndUpdate(appointmentId, { status: 'completed' });
    }

    // Prepare WhatsApp receipt link
    const settings = (await db.settings.get()) || {};
    const messageText = formatWhatsAppReceiptText(newInvoice, settings);
    const waCleanPhone = cleanPhoneForWhatsApp(newInvoice.customerPhone);
    const waLink = `https://wa.me/${waCleanPhone}?text=${encodeURIComponent(messageText)}`;

    return res.status(201).json({
      success: true,
      invoice: newInvoice,
      customer,
      whatsApp: {
        phone: waCleanPhone,
        messageText,
        waLink,
        apiConfigured: Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
      }
    });
  } catch (err: any) {
    console.error('[Saloonify Billing Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Helper: Format WhatsApp Receipt
function formatWhatsAppReceiptText(invoice: any, settings: any): string {
  const salonName = settings?.salonName || 'Saloonify Luxury Salon & Spa';
  const tagline = settings?.tagline || '';
  const currency = settings?.currencySymbol || '₹';
  const invNumber = invoice.invoiceNumber;
  const invDate = new Date(invoice.date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const customerName = invoice.customerName || 'Valued Customer';

  const itemsList = (invoice.items || []).map((it: any, idx: number) => {
    const qty = it.quantity > 1 ? ` (x${it.quantity})` : '';
    const price = it.totalAmount || (it.quantity * it.unitPrice);
    return `${idx + 1}. *${it.name}*${qty} — ${currency}${price.toFixed(2)}`;
  }).join('\n');

  let text = `✨ *${salonName.toUpperCase()}* ✨\n`;
  if (tagline) text += `_${tagline}_\n`;
  text += `═══════════════════════\n`;
  text += `🧾 *TAX INVOICE & RECEIPT*\n`;
  text += `🔢 *Invoice:* ${invNumber}\n`;
  text += `📅 *Date:* ${invDate}\n`;
  text += `👤 *Client:* ${customerName}\n`;
  if (invoice.customerPhone) text += `📱 *Mobile:* ${invoice.customerPhone}\n`;
  if (invoice.staffName) text += `✂️ *Stylist:* ${invoice.staffName}\n`;
  text += `═══════════════════════\n`;
  text += `*SERVICES & PRODUCTS:*\n${itemsList}\n`;
  text += `═══════════════════════\n`;
  text += `💵 *Subtotal:* ${currency}${invoice.subtotal.toFixed(2)}\n`;
  if (invoice.discountAmount > 0) {
    text += `🏷️ *Discount:* -${currency}${invoice.discountAmount.toFixed(2)}\n`;
  }
  text += `📊 *Taxable Value:* ${currency}${invoice.taxableAmount.toFixed(2)}\n`;
  if (invoice.totalTax > 0) {
    text += `🏛️ *GST Total:* ${currency}${invoice.totalTax.toFixed(2)}\n`;
  }
  text += `💰 *TOTAL AMOUNT:* *${currency}${invoice.grandTotal.toLocaleString('en-IN')}*\n`;
  text += `💳 *Payment Method:* ${String(invoice.paymentMethod || 'cash').toUpperCase()}\n`;
  text += `✅ *Payment Status:* *${String(invoice.paymentStatus || 'paid').toUpperCase()}*\n`;
  if (invoice.dueAmount > 0) {
    text += `⚠️ *Balance Due:* ${currency}${invoice.dueAmount.toFixed(2)}\n`;
  }
  text += `═══════════════════════\n`;
  text += `${settings?.invoiceFooter || 'Thank you for your visit! We look forward to seeing you again.'}\n`;
  if (settings?.phone) text += `📞 Phone: ${settings.phone}\n`;
  if (settings?.address) text += `📍 Address: ${settings.address}, ${settings.city || ''}\n`;

  return text;
}

function cleanPhoneForWhatsApp(phone: string): string {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
}

// GET WhatsApp receipt text & link for any invoice
router.get('/invoices/:id/whatsapp-receipt', async (req: Request, res: Response) => {
  try {
    const invoice = await db.invoices.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const settings = (await db.settings.get()) || {};
    const messageText = formatWhatsAppReceiptText(invoice, settings);
    const waPhone = cleanPhoneForWhatsApp(invoice.customerPhone);
    const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(messageText)}`;
    const apiConfigured = Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

    return res.json({
      success: true,
      recipientPhone: waPhone,
      customerPhone: invoice.customerPhone,
      customerName: invoice.customerName,
      messageText,
      waLink,
      apiConfigured
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST Send WhatsApp receipt via Official Meta Cloud API
router.post('/invoices/:id/send-whatsapp', async (req: Request, res: Response) => {
  try {
    const invoice = await db.invoices.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const settings = (await db.settings.get()) || {};
    const messageText = formatWhatsAppReceiptText(invoice, settings);
    const waPhone = cleanPhoneForWhatsApp(invoice.customerPhone);
    const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(messageText)}`;

    const apiToken = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!apiToken || !phoneNumberId) {
      return res.json({
        success: false,
        apiConfigured: false,
        message: 'WhatsApp Business API credentials not configured in environment. Please use the WhatsApp click-to-chat button.',
        waLink,
        messageText,
        recipientPhone: waPhone
      });
    }

    // Call official WhatsApp Cloud API
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: waPhone,
        type: 'text',
        text: { body: messageText }
      })
    });

    const result = await response.json();
    if (!response.ok) {
      console.warn('[WhatsApp API Warning]:', result);
      return res.status(response.status).json({
        success: false,
        apiConfigured: true,
        message: result.error?.message || 'Failed to deliver message via WhatsApp API.',
        waLink,
        messageText
      });
    }

    return res.json({
      success: true,
      apiConfigured: true,
      message: 'WhatsApp receipt delivered successfully via WhatsApp Cloud API!',
      details: result,
      waLink
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET normalized invoice items
router.get('/invoices/:id/items', async (req: Request, res: Response) => {
  try {
    const items = await db.invoiceItems.findByInvoiceId(req.params.id);
    return res.json({ success: true, items });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET payments for an invoice
router.get('/invoices/:id/payments', async (req: Request, res: Response) => {
  try {
    const payments = await db.payments.findByInvoiceId(req.params.id);
    return res.json({ success: true, payments });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST record an additional payment for an invoice
router.post('/invoices/:id/payments', async (req: Request, res: Response) => {
  try {
    const invoice = await db.invoices.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const { amount, paymentMethod = 'cash', transactionRef = '', notes = '' } = req.body;
    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive payment amount is required.' });
    }

    const newPayment = await db.payments.create({
      invoiceId: invoice._id,
      customerId: invoice.customerId,
      amount: paymentAmount,
      paymentMethod,
      paymentStatus: 'completed',
      transactionRef,
      paymentDate: new Date().toISOString(),
      notes,
    });

    const newPaidAmount = Number(invoice.paidAmount || 0) + paymentAmount;
    const newDueAmount = Math.max(0, Number(invoice.grandTotal || 0) - newPaidAmount);
    const newStatus = newDueAmount === 0 ? 'paid' : 'partial';

    const updatedInvoice = await db.invoices.findByIdAndUpdate(invoice._id, {
      paidAmount: newPaidAmount,
      dueAmount: newDueAmount,
      paymentStatus: newStatus,
    });

    // Update customer total spent
    if (invoice.customerId) {
      const customer = await db.customers.findById(invoice.customerId);
      if (customer) {
        await db.customers.findByIdAndUpdate(customer._id, {
          totalSpent: Number(customer.totalSpent || 0) + paymentAmount,
        });
      }
    }

    return res.status(201).json({
      success: true,
      payment: newPayment,
      invoice: updatedInvoice,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET all payments
router.get('/payments', async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.query;
    if (typeof invoiceId === 'string') {
      const payments = await db.payments.findByInvoiceId(invoiceId);
      return res.json({ success: true, payments });
    }
    const invoices = await db.invoices.find();
    const paymentsList: any[] = [];
    for (const inv of invoices.slice(0, 50)) {
      const p = await db.payments.findByInvoiceId(inv._id);
      paymentsList.push(...p);
    }
    return res.json({ success: true, payments: paymentsList });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 7. STAFF MANAGEMENT
// ==========================================

router.get('/staff', async (req: Request, res: Response) => {
  try {
    const [staffList, appointments, invoices] = await Promise.all([
      db.staff.find(),
      db.appointments.find(),
      db.invoices.find()
    ]);

    const enrichedStaff = staffList.map((stf: any) => {
      const staffApts = appointments.filter((a: any) => a.staffId === stf._id);
      const completedApts = staffApts.filter((a: any) => a.status === 'completed').length;
      const staffInvoices = invoices.filter((i: any) => i.staffId === stf._id);
      const totalRevenue = staffInvoices.reduce((sum: number, i: any) => sum + (i.grandTotal || 0), 0);
      return {
        ...stf,
        totalAppointments: staffApts.length,
        completedAppointments: completedApts,
        totalRevenue
      };
    });

    return res.json({ success: true, staff: enrichedStaff });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/staff', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, role, specialties, commissionPercentage, schedule, avatar } = req.body;
    if (!name || !phone || !role) {
      return res.status(400).json({ success: false, message: 'Name, phone, and role are required.' });
    }

    const newStaff = await db.staff.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      role: role.trim(),
      specialties: Array.isArray(specialties) ? specialties : [],
      commissionPercentage: Number(commissionPercentage) || 0,
      avatar: avatar || '',
      isActive: true,
      schedule: schedule || {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        shiftStart: '10:00',
        shiftEnd: '19:00'
      }
    });

    return res.status(201).json({ success: true, staff: newStaff });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/staff/:id', async (req: Request, res: Response) => {
  try {
    const updated = await db.staff.findByIdAndUpdate(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }
    return res.json({ success: true, staff: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/staff/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await db.staff.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }
    return res.json({ success: true, message: 'Staff member deleted.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 8. INVENTORY AND EXPENSES
// ==========================================

router.get('/inventory', async (req: Request, res: Response) => {
  try {
    const { search, category } = req.query;
    let products = await db.products.find(
      typeof category === 'string' ? category : undefined,
      typeof search === 'string' ? search : undefined
    );

    if (category && typeof category === 'string' && category !== 'All') {
      products = products.filter((p: any) => p.category === category);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase().trim();
      products = products.filter((p: any) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }

    products.sort((a: any, b: any) => a.name.localeCompare(b.name));
    return res.json({ success: true, products });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/inventory', async (req: Request, res: Response) => {
  try {
    const { name, sku, category, purchaseCost, sellingPrice, stockQuantity, minStockThreshold, unit, supplier, taxRate } = req.body;
    if (!name || purchaseCost === undefined || sellingPrice === undefined) {
      return res.status(400).json({ success: false, message: 'Product name, purchase cost, and selling price are required.' });
    }

    const genSku = sku ? sku.trim() : `SKU-${Date.now().toString().slice(-6)}`;
    const newProduct = await db.products.create({
      name: name.trim(),
      sku: genSku,
      category: category || 'Haircare Products',
      purchaseCost: Number(purchaseCost),
      sellingPrice: Number(sellingPrice),
      stockQuantity: Number(stockQuantity) || 0,
      minStockThreshold: Number(minStockThreshold) || 5,
      unit: unit || 'pcs',
      supplier: supplier || '',
      taxRate: taxRate !== undefined ? Number(taxRate) : 18
    });

    if (Number(stockQuantity) > 0) {
      await db.inventoryMovements.create({
        productId: newProduct._id,
        productName: newProduct.name,
        type: 'purchase',
        quantity: Number(stockQuantity),
        previousStock: 0,
        newStock: Number(stockQuantity),
        date: new Date().toISOString(),
        performedBy: 'Initial Setup',
        notes: 'Initial inventory entry'
      });
    }

    return res.status(201).json({ success: true, product: newProduct });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/inventory/:id', async (req: Request, res: Response) => {
  try {
    const updated = await db.products.findByIdAndUpdate(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    return res.json({ success: true, product: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/inventory/:id/stock', async (req: Request, res: Response) => {
  try {
    const { type, quantity, notes, performedBy } = req.body;
    const qty = Number(quantity);
    if (!type || !qty || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Valid movement type and positive quantity are required.' });
    }

    const product = await db.products.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const prevStock = product.stockQuantity || 0;
    let newStock = prevStock;

    if (type === 'purchase') {
      newStock = prevStock + qty;
    } else if (type === 'internal_use' || type === 'sale') {
      newStock = Math.max(0, prevStock - qty);
    } else if (type === 'adjustment') {
      newStock = qty; // direct adjustment to quantity
    }

    await db.products.findByIdAndUpdate(product._id, { stockQuantity: newStock });

    const movement = await db.inventoryMovements.create({
      productId: product._id,
      productName: product.name,
      type,
      quantity: qty,
      previousStock: prevStock,
      newStock,
      date: new Date().toISOString(),
      performedBy: performedBy || 'Manager',
      notes: notes || ''
    });

    return res.json({ success: true, newStock, movement });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/inventory/movements', async (req: Request, res: Response) => {
  try {
    const movements = await db.inventoryMovements.find(50);
    movements.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return res.json({ success: true, movements: movements.slice(0, 50) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// EXPENSES
router.get('/expenses', async (req: Request, res: Response) => {
  try {
    const { category, startDate, endDate } = req.query;
    let expenses = await db.expenses.find(
      typeof category === 'string' ? category : undefined,
      typeof startDate === 'string' ? startDate : undefined,
      typeof endDate === 'string' ? endDate : undefined
    );

    if (category && typeof category === 'string' && category !== 'All') {
      expenses = expenses.filter((e: any) => e.category === category);
    }
    if (startDate && typeof startDate === 'string') {
      expenses = expenses.filter((e: any) => e.date >= startDate);
    }
    if (endDate && typeof endDate === 'string') {
      expenses = expenses.filter((e: any) => e.date <= endDate);
    }

    expenses.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return res.json({ success: true, expenses });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/expenses', async (req: Request, res: Response) => {
  try {
    const { title, category, amount, date, paymentMethod, paidTo, receiptNumber, notes } = req.body;
    if (!title || !amount || !category) {
      return res.status(400).json({ success: false, message: 'Expense title, amount, and category are required.' });
    }

    const newExpense = await db.expenses.create({
      title: title.trim(),
      category,
      amount: Number(amount),
      date: date || new Date().toISOString().split('T')[0],
      paymentMethod: paymentMethod || 'cash',
      paidTo: paidTo ? paidTo.trim() : '',
      receiptNumber: receiptNumber ? receiptNumber.trim() : '',
      notes: notes ? notes.trim() : ''
    });

    return res.status(201).json({ success: true, expense: newExpense });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/expenses/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await db.expenses.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Expense record not found.' });
    return res.json({ success: true, message: 'Expense removed.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 9. REPORTS AND ANALYTICS
// ==========================================

router.get('/reports/summary', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    let [invoices, expenses, appointments, products, movements] = await Promise.all([
      db.invoices.find(),
      db.expenses.find(),
      db.appointments.find(),
      db.products.find(),
      db.inventoryMovements.find(100)
    ]);

    if (startDate && typeof startDate === 'string') {
      invoices = invoices.filter((i: any) => i.date >= startDate);
      expenses = expenses.filter((e: any) => e.date >= startDate);
      appointments = appointments.filter((a: any) => a.appointmentDate >= startDate);
    }
    if (endDate && typeof endDate === 'string') {
      const endOfDay = `${endDate}T23:59:59.999Z`;
      invoices = invoices.filter((i: any) => i.date <= endOfDay);
      expenses = expenses.filter((e: any) => e.date <= endDate);
      appointments = appointments.filter((a: any) => a.appointmentDate <= endDate);
    }

    const totalRevenue = invoices.reduce((sum: number, i: any) => sum + (i.grandTotal || 0), 0);
    const totalTaxCollected = invoices.reduce((sum: number, i: any) => sum + (i.totalTax || 0), 0);
    const totalDiscounts = invoices.reduce((sum: number, i: any) => sum + (i.discountAmount || 0), 0);
    const totalOperatingExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    // Calculate approximate Cost of Goods Sold from product movements or items
    let estimatedCostOfGoods = 0;
    for (const inv of invoices) {
      if (Array.isArray(inv.items)) {
        for (const item of inv.items) {
          if (item.itemType === 'product') {
            const prd = products.find((p: any) => p._id === item.itemId);
            if (prd) {
              estimatedCostOfGoods += (prd.purchaseCost || 0) * (item.quantity || 1);
            }
          }
        }
      }
    }

    const netProfit = totalRevenue - totalOperatingExpenses - estimatedCostOfGoods;

    // Payment methods breakdown
    const paymentMethods: Record<string, { count: number; total: number }> = {
      cash: { count: 0, total: 0 },
      upi: { count: 0, total: 0 },
      card: { count: 0, total: 0 },
      mixed: { count: 0, total: 0 }
    };
    for (const inv of invoices) {
      const pm = inv.paymentMethod || 'cash';
      if (!paymentMethods[pm]) paymentMethods[pm] = { count: 0, total: 0 };
      paymentMethods[pm].count++;
      paymentMethods[pm].total += inv.grandTotal || 0;
    }

    // Expenses breakdown by category
    const expenseByCategory: Record<string, number> = {};
    for (const exp of expenses) {
      const cat = exp.category || 'Other';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (exp.amount || 0);
    }

    // Appointment completion rate
    const totalApts = appointments.length;
    const completedApts = appointments.filter((a: any) => a.status === 'completed').length;
    const cancelledApts = appointments.filter((a: any) => ['cancelled', 'no_show'].includes(a.status)).length;
    const completionRate = totalApts > 0 ? Math.round((completedApts / totalApts) * 100) : 0;

    // Inventory Valuation
    const totalInventoryValue = products.reduce((sum: number, p: any) => sum + ((p.purchaseCost || 0) * (p.stockQuantity || 0)), 0);
    const totalRetailValue = products.reduce((sum: number, p: any) => sum + ((p.sellingPrice || 0) * (p.stockQuantity || 0)), 0);

    return res.json({
      success: true,
      report: {
        totalRevenue,
        totalTaxCollected,
        totalDiscounts,
        totalOperatingExpenses,
        estimatedCostOfGoods,
        netProfit,
        invoiceCount: invoices.length,
        paymentMethods,
        expenseByCategory,
        appointmentStats: {
          total: totalApts,
          completed: completedApts,
          cancelled: cancelledApts,
          completionRate
        },
        inventoryValuation: {
          costBasis: totalInventoryValue,
          retailValue: totalRetailValue
        }
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// CSV Export
router.get('/reports/export', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const invoices = await db.invoices.find({});
    invoices.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const headers = ['Invoice Number', 'Date', 'Customer Name', 'Phone', 'Staff', 'Subtotal (INR)', 'Discount', 'Taxable Amount', 'CGST', 'SGST', 'Grand Total (INR)', 'Payment Method', 'Status'];
    const rows = invoices.map((i: any) => [
      `"${i.invoiceNumber}"`,
      `"${i.date ? i.date.split('T')[0] : ''}"`,
      `"${i.customerName || ''}"`,
      `"${i.customerPhone || ''}"`,
      `"${i.staffName || ''}"`,
      i.subtotal || 0,
      i.discountAmount || 0,
      i.taxableAmount || 0,
      i.cgstTotal || 0,
      i.sgstTotal || 0,
      i.grandTotal || 0,
      `"${i.paymentMethod || 'cash'}"`,
      `"${i.paymentStatus || 'paid'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="saloonify_sales_report.csv"');
    return res.send(csvContent);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 10. SETTINGS
// ==========================================

router.get('/settings', async (req: Request, res: Response) => {
  try {
    const settings = await db.settings.get();
    return res.json({ success: true, settings: settings || {} });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/settings', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const settings = await db.settings.update(req.body);
    return res.json({ success: true, settings });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 11. HEALTH & SEED
// ==========================================

router.get('/health', async (req: Request, res: Response) => {
  try {
    const status = db.getConnectionStatus();
    const [users, customers, services, appointments, invoices, products, expenses] = await Promise.all([
      db.users.countDocuments(),
      db.customers.countDocuments(),
      db.services.countDocuments(),
      db.appointments.countDocuments(),
      db.invoices.countDocuments(),
      db.products.countDocuments(),
      db.expenses.countDocuments(),
    ]);

    return res.json({
      success: true,
      database: status,
      counts: {
        users,
        customers,
        services,
        appointments,
        invoices,
        products,
        expenses
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/seed', async (req: Request, res: Response) => {
  return res.status(400).json({
    success: false,
    message: 'Demo seeding is disabled. Saloonify runs directly against live MySQL persistence.'
  });
});

export default router;
