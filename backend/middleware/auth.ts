import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'saloonify-super-secret-jwt-key-2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
    salonId?: string;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({ success: false, message: 'Session expired or invalid. Please sign in again.' });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
    } catch {
      // ignore invalid token in optional auth
    }
  }
  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    // Allow 'admin' or 'owner' interchangeably
    const userRole = req.user.role === 'owner' ? 'admin' : req.user.role;
    const normalizedAllowed = allowedRoles.map(r => r === 'owner' ? 'admin' : r);

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Requires ${allowedRoles.join(' or ')} privileges.`
      });
    }
    next();
  };
}

export function generateToken(user: { _id?: string; id?: string; email: string; role: string; name: string; salonId?: string }) {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      salonId: user.salonId || 'sal_default',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

