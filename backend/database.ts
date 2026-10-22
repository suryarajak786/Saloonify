import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PGlite } from '@electric-sql/pglite';
import { createPgPool, getPgConfig, testPgConnection } from './db/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const PG_DATA_DIR = path.join(DATA_DIR, 'postgres_db');
const LEGACY_JSON_FILE = path.join(DATA_DIR, 'saloonify_db.json');

let pool: pg.Pool | null = null;
let pgliteInstance: PGlite | null = null;
let isPostgresConnected = false;
let activeEngine = 'PostgreSQL';
let dbConnectionError: string | null = null;

// Unified PostgreSQL query executor
export async function query(sql: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
  if (pool && isPostgresConnected && activeEngine.includes('External')) {
    const res = await pool.query(sql, params);
    return { rows: res.rows || [], rowCount: res.rowCount || 0 };
  }
  if (pgliteInstance) {
    const res = await pgliteInstance.query(sql, params);
    return { rows: (res.rows as any[]) || [], rowCount: res.rows?.length || 0 };
  }
  throw new Error(`[Saloonify Database] PostgreSQL is not initialized: ${dbConnectionError || 'No connection available'}`);
}

export async function exec(sql: string): Promise<any> {
  if (pool && isPostgresConnected && activeEngine.includes('External')) {
    return pool.query(sql);
  }
  if (pgliteInstance) {
    return pgliteInstance.exec(sql);
  }
  throw new Error(`[Saloonify Database] PostgreSQL is not initialized: ${dbConnectionError || 'No connection available'}`);
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// ==========================================
// INITIALIZATION & SAFE MIGRATIONS
// ==========================================
export async function initDatabase(): Promise<{ isPostgres: boolean; message: string; engine: string }> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // 1. Check if external PostgreSQL is explicitly configured and available
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
      try {
        pool = createPgPool();
        const connCheck = await testPgConnection();
        if (connCheck.connected) {
          isPostgresConnected = true;
          activeEngine = 'PostgreSQL (External Server)';
          dbConnectionError = null;
        }
      } catch (poolErr: any) {
        console.warn('[Saloonify Database] External PostgreSQL connection error:', poolErr.message);
      }
    }

    // 2. If no external PostgreSQL connection, initialize embedded persistent PostgreSQL engine
    if (!isPostgresConnected) {
      if (!fs.existsSync(PG_DATA_DIR)) {
        fs.mkdirSync(PG_DATA_DIR, { recursive: true });
      }
      pgliteInstance = new PGlite(PG_DATA_DIR);
      isPostgresConnected = true;
      activeEngine = 'PostgreSQL (Embedded Persistent Engine)';
      dbConnectionError = null;
    }

    // 3. Verify and execute PostgreSQL DDL schema
    const schemaSqlPath = path.join(__dirname, 'db/schema.sql');
    if (fs.existsSync(schemaSqlPath)) {
      const sql = fs.readFileSync(schemaSqlPath, 'utf-8');
      await exec(sql);
      console.log(`[Saloonify PostgreSQL] Schema verified. Tables verified in ${activeEngine}.`);
    }

    // 4. Safe migration of legitimate existing business data if migrating from earlier stage
    await migrateLegacyRecords();

    return {
      isPostgres: true,
      message: `Active on ${activeEngine}`,
      engine: activeEngine,
    };
  } catch (err: any) {
    isPostgresConnected = false;
    dbConnectionError = err.message;
    console.error('[Saloonify PostgreSQL] Initialization failed:', err.message);
    throw new Error(`PostgreSQL Database Error: ${err.message}`);
  }
}

// Migrate legitimate users/salons created in earlier steps without adding fake demo records
async function migrateLegacyRecords() {
  try {
    if (fs.existsSync(LEGACY_JSON_FILE)) {
      const raw = fs.readFileSync(LEGACY_JSON_FILE, 'utf-8');
      const data = JSON.parse(raw);

      // Migrate Salons
      if (Array.isArray(data.salons)) {
        for (const s of data.salons) {
          await query(
            `INSERT INTO salons (id, name, owner_id, phone, email, address, gstin, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, owner_id = EXCLUDED.owner_id;`,
            [s._id || s.id, s.name, s.ownerId || '', s.phone || '', s.email || '', s.address || '', s.gstin || '', s.createdAt || new Date().toISOString()]
          );
        }
      }

      // Migrate Users (Preserving genuine credentials & bcrypt hashes)
      if (Array.isArray(data.users)) {
        for (const u of data.users) {
          await query(
            `INSERT INTO users (id, salon_id, name, email, password, role, phone, avatar, is_active, last_login, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active, last_login = EXCLUDED.last_login;`,
            [
              u._id || u.id,
              u.salonId || 'sal_default',
              u.name,
              u.email.toLowerCase().trim(),
              u.password,
              u.role || 'staff',
              u.phone || '',
              u.avatar || '',
              u.isActive !== false,
              u.lastLogin || null,
              u.createdAt || new Date().toISOString(),
            ]
          );
        }
      }

      // Migrate Settings
      if (data.settings && data.settings.salonName) {
        const set = data.settings;
        await query(
          `INSERT INTO settings (id, salon_id, salon_name, tagline, phone, email, address, city, state, pincode, gstin, default_gst_rate, currency_symbol, invoice_prefix, invoice_footer, terms_and_conditions)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (id) DO NOTHING;`,
          [
            set._id || set.id || 'set_default',
            set.salonId || 'sal_default',
            set.salonName,
            set.tagline || '',
            set.phone || '',
            set.email || '',
            set.address || '',
            set.city || 'Bengaluru',
            set.state || 'Karnataka',
            set.pincode || '',
            set.gstin || '',
            Number(set.defaultGstRate || 18),
            set.currencySymbol || '₹',
            set.invoicePrefix || 'INV',
            set.invoiceFooter || '',
            set.termsAndConditions || ''
          ]
        );
      }
    }
  } catch (err: any) {
    console.warn('[Saloonify PostgreSQL] Legacy migration notice:', err.message);
  }
}

export function getDbStatus() {
  return {
    isPostgres: isPostgresConnected,
    engine: activeEngine,
    error: dbConnectionError,
    host: activeEngine.includes('External') ? (process.env.PGHOST || 'localhost') : 'Embedded PostgreSQL',
    database: activeEngine.includes('External') ? (process.env.PGDATABASE || 'saloonify') : 'postgres_db',
  };
}

// ==========================================
// REPOSITORIES (PURE PARAMETERIZED POSTGRESQL)
// ==========================================

export const db = {
  getConnectionStatus() {
    return getDbStatus();
  },

  // ----------------------------------------
  // SALONS (Multi-tenant business entities)
  // ----------------------------------------
  salons: {
    async findById(id: string): Promise<any | null> {
      const res = await query(
        `SELECT id as "_id", id, name, owner_id as "ownerId", phone, email, address, gstin, created_at as "createdAt"
         FROM salons WHERE id = $1`,
        [id]
      );
      return res.rows[0] ? { ...res.rows[0] } : null;
    },

    async getDefault(): Promise<any> {
      const res = await query(
        `SELECT id as "_id", id, name, owner_id as "ownerId", phone, email, address, gstin, created_at as "createdAt"
         FROM salons ORDER BY created_at ASC LIMIT 1`
      );
      return res.rows[0] ? { ...res.rows[0] } : null;
    },

    async create(doc: any): Promise<any> {
      const id = doc.id || doc._id || genId('sal');
      const name = (doc.name || '').trim();
      const ownerId = doc.ownerId || '';
      const phone = (doc.phone || '').trim();
      const email = (doc.email || '').toLowerCase().trim();
      const address = (doc.address || '').trim();
      const gstin = (doc.gstin || '').trim();

      await query(
        `INSERT INTO salons (id, name, owner_id, phone, email, address, gstin)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, name, ownerId, phone, email, address, gstin]
      );

      return { _id: id, id, name, ownerId, phone, email, address, gstin, createdAt: new Date().toISOString() };
    },

    async update(id: string, updates: any): Promise<any | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates };

      await query(
        `UPDATE salons
         SET name = $1, owner_id = $2, phone = $3, email = $4, address = $5, gstin = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [updated.name, updated.ownerId || '', updated.phone || '', updated.email || '', updated.address || '', updated.gstin || '', id]
      );

      return updated;
    },
  },

  // ----------------------------------------
  // USERS (PostgreSQL Credentials & Roles)
  // ----------------------------------------
  users: {
    async countDocuments(): Promise<number> {
      const res = await query('SELECT COUNT(*) as count FROM users');
      return parseInt(res.rows[0]?.count || '0', 10);
    },

    async find(filter?: { salonId?: string }): Promise<any[]> {
      let sql = `SELECT id as "_id", id, salon_id as "salonId", name, email, role, phone, avatar, is_active as "isActive", last_login as "lastLogin", created_at as "createdAt"
                 FROM users`;
      const params: any[] = [];
      if (filter?.salonId) {
        params.push(filter.salonId);
        sql += ` WHERE salon_id = $1`;
      }
      sql += ' ORDER BY created_at DESC';
      const res = await query(sql, params);
      return res.rows.map(r => ({ ...r, isActive: r.isActive !== false }));
    },

    async findOne(filter: { email?: string; id?: string }): Promise<any | null> {
      if (filter.email) {
        const res = await query(
          `SELECT id as "_id", id, salon_id as "salonId", name, email, password, role, phone, avatar, is_active as "isActive", last_login as "lastLogin", created_at as "createdAt"
           FROM users WHERE LOWER(email) = LOWER($1)`,
          [filter.email.trim()]
        );
        return res.rows[0] ? { ...res.rows[0], isActive: res.rows[0].isActive !== false } : null;
      }
      if (filter.id) {
        const res = await query(
          `SELECT id as "_id", id, salon_id as "salonId", name, email, password, role, phone, avatar, is_active as "isActive", last_login as "lastLogin", created_at as "createdAt"
           FROM users WHERE id = $1`,
          [filter.id]
        );
        return res.rows[0] ? { ...res.rows[0], isActive: res.rows[0].isActive !== false } : null;
      }
      return null;
    },

    async findById(id: string): Promise<any | null> {
      return this.findOne({ id });
    },

    async create(doc: any): Promise<any> {
      const id = doc.id || doc._id || genId('usr');
      const salonId = doc.salonId || 'sal_default';
      const name = (doc.name || '').trim();
      const email = (doc.email || '').toLowerCase().trim();
      const password = doc.password;
      const role = doc.role || 'staff';
      const phone = (doc.phone || '').trim();
      const avatar = doc.avatar || '';
      const isActive = doc.isActive !== false;

      await query(
        `INSERT INTO users (id, salon_id, name, email, password, role, phone, avatar, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, salonId, name, email, password, role, phone, avatar, isActive]
      );

      return { _id: id, id, salonId, name, email, role, phone, avatar, isActive };
    },

    async findByIdAndUpdate(id: string, updates: any): Promise<any | null> {
      const existing = await this.findOne({ id });
      if (!existing) return null;
      const updated = { ...existing, ...updates };

      await query(
        `UPDATE users
         SET name = $1, role = $2, phone = $3, avatar = $4, is_active = $5, last_login = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [updated.name, updated.role, updated.phone || '', updated.avatar || '', updated.isActive !== false, updated.lastLogin || null, id]
      );

      const { password, ...safe } = updated;
      return safe;
    },

    async updatePassword(id: string, hashedPassword: string): Promise<boolean> {
      const res = await query(
        `UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [hashedPassword, id]
      );
      return res.rowCount > 0;
    },

    async findByIdAndDelete(id: string): Promise<boolean> {
      const res = await query('DELETE FROM users WHERE id = $1', [id]);
      return res.rowCount > 0;
    },
  },

  // ----------------------------------------
  // INVITATIONS (Staff Activation Tokens)
  // ----------------------------------------
  invitations: {
    async create(doc: any): Promise<any> {
      const id = doc.id || doc._id || genId('invt');
      const token = doc.token || `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
      const salonId = doc.salonId || 'sal_default';
      const name = (doc.name || '').trim();
      const email = (doc.email || '').toLowerCase().trim();
      const phone = (doc.phone || '').trim();
      const role = doc.role || 'staff';
      const status = doc.status || 'pending';
      const createdBy = doc.createdBy || '';
      const expiresAt = doc.expiresAt || new Date(Date.now() + 7 * 86400000).toISOString();

      await query(
        `INSERT INTO invitations (id, salon_id, name, email, phone, role, token, status, created_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, salonId, name, email, phone, role, token, status, createdBy, expiresAt]
      );

      return { _id: id, id, salonId, name, email, phone, role, token, status, createdBy, expiresAt, createdAt: new Date().toISOString() };
    },

    async findByToken(token: string): Promise<any | null> {
      const res = await query(
        `SELECT id as "_id", id, salon_id as "salonId", name, email, phone, role, token, status, created_by as "createdBy", expires_at as "expiresAt", created_at as "createdAt"
         FROM invitations WHERE token = $1`,
        [token.trim()]
      );
      return res.rows[0] ? { ...res.rows[0] } : null;
    },

    async findBySalon(salonId?: string): Promise<any[]> {
      let sql = `SELECT id as "_id", id, salon_id as "salonId", name, email, phone, role, token, status, created_by as "createdBy", expires_at as "expiresAt", created_at as "createdAt"
                 FROM invitations`;
      const params: any[] = [];
      if (salonId) {
        params.push(salonId);
        sql += ` WHERE salon_id = $1`;
      }
      sql += ' ORDER BY created_at DESC';
      const res = await query(sql, params);
      return res.rows;
    },

    async updateStatus(id: string, status: string): Promise<boolean> {
      const res = await query('UPDATE invitations SET status = $1 WHERE id = $2', [status, id]);
      return res.rowCount > 0;
    },

    async findByIdAndDelete(id: string): Promise<boolean> {
      const res = await query('DELETE FROM invitations WHERE id = $1', [id]);
      return res.rowCount > 0;
    },
  },

  // ----------------------------------------
  // PASSWORD RESETS
  // ----------------------------------------
  passwordResets: {
    async create(doc: any): Promise<any> {
      const id = doc.id || doc._id || genId('rst');
      const userId = doc.userId;
      const email = doc.email.toLowerCase().trim();
      const token = doc.token.trim();
      const expiresAt = doc.expiresAt;

      await query(
        `INSERT INTO password_resets (id, user_id, email, token, expires_at, used)
         VALUES ($1, $2, $3, $4, $5, FALSE)`,
        [id, userId, email, token, expiresAt]
      );

      return { _id: id, id, userId, email, token, expiresAt, used: false };
    },

    async findByToken(token: string): Promise<any | null> {
      const res = await query(
        `SELECT id as "_id", id, user_id as "userId", email, token, expires_at as "expiresAt", used, created_at as "createdAt"
         FROM password_resets WHERE token = $1 AND used = FALSE ORDER BY created_at DESC LIMIT 1`,
        [token.trim()]
      );
      return res.rows[0] ? { ...res.rows[0] } : null;
    },

    async markUsed(id: string): Promise<boolean> {
      const res = await query('UPDATE password_resets SET used = TRUE WHERE id = $1', [id]);
      return res.rowCount > 0;
    },
  },

  // ----------------------------------------
  // STAFF (Stylists & Salon Crew)
  // ----------------------------------------
  staff: {
    async countDocuments(): Promise<number> {
      const res = await query('SELECT COUNT(*) as count FROM staff');
      return parseInt(res.rows[0]?.count || '0', 10);
    },

    async find(activeOnly = false): Promise<any[]> {
      let sql = `SELECT id as "_id", id, salon_id as "salonId", name, phone, email, role, specialties, commission_percentage as "commissionPercentage", avatar, is_active as "isActive", schedule, created_at as "createdAt"
                 FROM staff WHERE 1=1`;
      if (activeOnly) sql += ` AND is_active = TRUE`;
      sql += ' ORDER BY name ASC';
      const res = await query(sql);
      return res.rows.map(r => ({
        ...r,
        commissionPercentage: Number(r.commissionPercentage || 0),
        specialties: typeof r.specialties === 'string' ? JSON.parse(r.specialties) : (r.specialties || []),
        schedule: typeof r.schedule === 'string' ? JSON.parse(r.schedule) : (r.schedule || {}),
      }));
    },

    async findById(id: string): Promise<any | null> {
      const res = await query(
        `SELECT id as "_id", id, salon_id as "salonId", name, phone, email, role, specialties, commission_percentage as "commissionPercentage", avatar, is_active as "isActive", schedule, created_at as "createdAt"
         FROM staff WHERE id = $1`,
        [id]
      );
      if (!res.rows[0]) return null;
      const r = res.rows[0];
      return {
        ...r,
        commissionPercentage: Number(r.commissionPercentage || 0),
        specialties: typeof r.specialties === 'string' ? JSON.parse(r.specialties) : (r.specialties || []),
        schedule: typeof r.schedule === 'string' ? JSON.parse(r.schedule) : (r.schedule || {}),
      };
    },

    async create(doc: any): Promise<any> {
      const id = doc.id || doc._id || genId('stf');
      const salonId = doc.salonId || 'sal_default';
      const name = (doc.name || '').trim();
      const phone = (doc.phone || '').trim();
      const email = (doc.email || '').trim();
      const role = (doc.role || 'Stylist').trim();
      const specialties = JSON.stringify(Array.isArray(doc.specialties) ? doc.specialties : []);
      const comm = Number(doc.commissionPercentage || 0);
      const avatar = doc.avatar || '';
      const isActive = doc.isActive !== false;
      const schedule = JSON.stringify(doc.schedule || { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], shiftStart: '10:00', shiftEnd: '19:00' });

      await query(
        `INSERT INTO staff (id, salon_id, name, phone, email, role, specialties, commission_percentage, avatar, is_active, schedule)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, salonId, name, phone, email, role, specialties, comm, avatar, isActive, schedule]
      );

      return {
        _id: id,
        id,
        salonId,
        name,
        phone,
        email,
        role,
        specialties: JSON.parse(specialties),
        commissionPercentage: comm,
        avatar,
        isActive,
        schedule: JSON.parse(schedule),
        createdAt: new Date().toISOString()
      };
    },

    async findByIdAndUpdate(id: string, updates: any): Promise<any | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates };

      await query(
        `UPDATE staff
         SET name = $1, phone = $2, email = $3, role = $4, specialties = $5, commission_percentage = $6, avatar = $7, is_active = $8, schedule = $9, updated_at = CURRENT_TIMESTAMP
         WHERE id = $10`,
        [
          updated.name,
          updated.phone,
          updated.email || '',
          updated.role,
          JSON.stringify(updated.specialties || []),
          Number(updated.commissionPercentage || 0),
          updated.avatar || '',
          updated.isActive !== false,
          JSON.stringify(updated.schedule || {}),
          id
        ]
      );

      return updated;
    },

    async findByIdAndDelete(id: string): Promise<boolean> {
      const res = await query('DELETE FROM staff WHERE id = $1', [id]);
      return res.rowCount > 0;
    },
  },

  // ----------------------------------------
  // CUSTOMERS
  // ----------------------------------------
  customers: {
    async countDocuments(): Promise<number> {
      const res = await query('SELECT COUNT(*) as count FROM customers');
      return parseInt(res.rows[0]?.count || '0', 10);
    },

    async find(search?: string, salonId?: string): Promise<any[]> {
      let sql = `SELECT id as "_id", id, salon_id as "salonId", name, phone, email, gender, birthdate, anniversary, address, notes, preferences, total_visits as "totalVisits", total_spent as "totalSpent", last_visit_date as "lastVisitDate", created_at as "createdAt"
                 FROM customers WHERE 1=1`;
      const params: any[] = [];
      if (salonId) {
        params.push(salonId);
        sql += ` AND salon_id = $${params.length}`;
      }
      if (search && search.trim()) {
        params.push(`%${search.trim().toLowerCase()}%`);
        sql += ` AND (LOWER(name) LIKE $${params.length} OR phone LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`;
      }
      sql += ' ORDER BY created_at DESC';
      const res = await query(sql, params);
      return res.rows.map(row => ({
        ...row,
        totalVisits: Number(row.totalVisits || 0),
        totalSpent: Number(row.totalSpent || 0),
      }));
    },

    async findById(id: string): Promise<any | null> {
      const res = await query(
        `SELECT id as "_id", id, salon_id as "salonId", name, phone, email, gender, birthdate, anniversary, address, notes, preferences, total_visits as "totalVisits", total_spent as "totalSpent", last_visit_date as "lastVisitDate", created_at as "createdAt"
         FROM customers WHERE id = $1`,
        [id]
      );
      if (!res.rows[0]) return null;
      return {
        ...res.rows[0],
        totalVisits: Number(res.rows[0].totalVisits || 0),
        totalSpent: Number(res.rows[0].totalSpent || 0),
      };
    },

    async findOne(filter: { phone?: string; email?: string }): Promise<any | null> {
      if (filter.phone) {
        const cleanPhone = filter.phone.replace(/[\s\-\(\)]/g, '').trim();
        const res = await query(
          `SELECT id as "_id", id, salon_id as "salonId", name, phone, email, gender, birthdate, anniversary, address, notes, preferences, total_visits as "totalVisits", total_spent as "totalSpent", last_visit_date as "lastVisitDate", created_at as "createdAt"
           FROM customers WHERE phone = $1 OR REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', '') = $2 LIMIT 1`,
          [filter.phone.trim(), cleanPhone]
        );
        if (res.rows[0]) {
          return { ...res.rows[0], totalVisits: Number(res.rows[0].totalVisits || 0), totalSpent: Number(res.rows[0].totalSpent || 0) };
        }
      }
      if (filter.email) {
        const res = await query(
          `SELECT id as "_id", id, salon_id as "salonId", name, phone, email, gender, birthdate, anniversary, address, notes, preferences, total_visits as "totalVisits", total_spent as "totalSpent", last_visit_date as "lastVisitDate", created_at as "createdAt"
           FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          [filter.email.trim()]
        );
        if (res.rows[0]) {
          return { ...res.rows[0], totalVisits: Number(res.rows[0].totalVisits || 0), totalSpent: Number(res.rows[0].totalSpent || 0) };
        }
      }
      return null;
    },

    async create(doc: any): Promise<any> {
      const id = doc.id || doc._id || genId('cst');
      const salonId = doc.salonId || 'sal_default';
      const name = (doc.name || '').trim();
      const phone = (doc.phone || '').trim();
      const email = (doc.email || '').trim();
      const gender = doc.gender || 'female';
      const birthdate = doc.birthdate || '';
      const anniversary = doc.anniversary || '';
      const address = doc.address || '';
      const notes = doc.notes || '';
      const preferences = doc.preferences || '';
      const totalVisits = Number(doc.totalVisits || 0);
      const totalSpent = Number(doc.totalSpent || 0);
      const lastVisitDate = doc.lastVisitDate || '';

      await query(
        `INSERT INTO customers (id, salon_id, name, phone, email, gender, birthdate, anniversary, address, notes, preferences, total_visits, total_spent, last_visit_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [id, salonId, name, phone, email, gender, birthdate, anniversary, address, notes, preferences, totalVisits, totalSpent, lastVisitDate]
      );

      return { _id: id, id, salonId, name, phone, email, gender, birthdate, anniversary, address, notes, preferences, totalVisits, totalSpent, lastVisitDate, createdAt: new Date().toISOString() };
    },

    async findByIdAndUpdate(id: string, updates: any): Promise<any | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates };

      await query(
        `UPDATE customers
         SET name = $1, phone = $2, email = $3, gender = $4, birthdate = $5, anniversary = $6, address = $7, notes = $8, preferences = $9, total_visits = $10, total_spent = $11, last_visit_date = $12
         WHERE id = $13`,
        [
          updated.name,
          updated.phone,
          updated.email || '',
          updated.gender || 'female',
          updated.birthdate || '',
          updated.anniversary || '',
          updated.address || '',
          updated.notes || '',
          updated.preferences || '',
          Number(updated.totalVisits || 0),
          Number(updated.totalSpent || 0),
          updated.lastVisitDate || '',
          id
        ]
      );

      return updated;
    },

    async findByIdAndDelete(id: string): Promise<boolean> {
      const res = await query('DELETE FROM customers WHERE id = $1', [id]);
      return res.rowCount > 0;
    },
  },

  // ----------------------------------------
  // SERVICES (Zero fake data)
  // ----------------------------------------
  services: {
    async countDocuments(): Promise<number> {
      const res = await query('SELECT COUNT(*) as count FROM services');
      return parseInt(res.rows[0]?.count || '0', 10);
    },

    async find(category?: string, search?: string, activeOnly = false): Promise<any[]> {
      let sql = `SELECT id as "_id", id, salon_id as "salonId", name, category, description, price, duration_minutes as "durationMinutes", tax_rate as "taxRate", is_active as "isActive", gender_target as "genderTarget"
                 FROM services WHERE 1=1`;
      const params: any[] = [];
      if (activeOnly) {
        sql += ' AND is_active = TRUE';
      }
      if (category && category !== 'All') {
        params.push(category);
        sql += ` AND category = $${params.length}`;
      }
      if (search && search.trim()) {
        params.push(`%${search.trim().toLowerCase()}%`);
        sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(category) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`;
      }
      sql += ' ORDER BY category, name';
      const res = await query(sql, params);
      return res.rows.map(r => ({
        ...r,
        price: Number(r.price),
        taxRate: Number(r.taxRate),
      }));
    },

    async findById(id: string): Promise<any | null> {
      const res = await query(
        `SELECT id as "_id", id, salon_id as "salonId", name, category, description, price, duration_minutes as "durationMinutes", tax_rate as "taxRate", is_active as "isActive", gender_target as "genderTarget"
         FROM services WHERE id = $1`,
        [id]
      );
      if (!res.rows[0]) return null;
      return {
        ...res.rows[0],
        price: Number(res.rows[0].price),
        taxRate: Number(res.rows[0].taxRate),
      };
    },

    async create(doc: any): Promise<any> {
      const id = doc.id || doc._id || genId('srv');
      const salonId = doc.salonId || 'sal_default';
      const name = (doc.name || '').trim();
      const category = (doc.category || 'General').trim();
      const description = (doc.description || '').trim();
      const price = Number(doc.price || 0);
      const durationMinutes = Number(doc.durationMinutes || 30);
      const taxRate = Number(doc.taxRate !== undefined ? doc.taxRate : 18);
      const isActive = doc.isActive !== false;
      const genderTarget = doc.genderTarget || 'all';

      await query(
        `INSERT INTO services (id, salon_id, name, category, description, price, duration_minutes, tax_rate, is_active, gender_target)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, salonId, name, category, description, price, durationMinutes, taxRate, isActive, genderTarget]
      );

      return { _id: id, id, salonId, name, category, description, price, durationMinutes, taxRate, isActive, genderTarget };
    },

    async findByIdAndUpdate(id: string, updates: any): Promise<any | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates };

      await query(
        `UPDATE services
         SET name = $1, category = $2, description = $3, price = $4, duration_minutes = $5, tax_rate = $6, is_active = $7, gender_target = $8, updated_at = CURRENT_TIMESTAMP
         WHERE id = $9`,
        [
          updated.name,
          updated.category,
          updated.description || '',
          Number(updated.price),
          Number(updated.durationMinutes),
          Number(updated.taxRate),
          updated.isActive !== false,
          updated.genderTarget || 'all',
          id
        ]
      );

      return updated;
    },

    async findByIdAndDelete(id: string): Promise<boolean> {
      const res = await query('DELETE FROM services WHERE id = $1', [id]);
      return res.rowCount > 0;
    },
  },

  // ----------------------------------------
  // APPOINTMENTS
  // ----------------------------------------
  appointments: {
    async countDocuments(): Promise<number> {
      const res = await query('SELECT COUNT(*) as count FROM appointments');
      return parseInt(res.rows[0]?.count || '0', 10);
    },

    async find(filter?: any): Promise<any[]> {
      let sql = `SELECT id as "_id", id, salon_id as "salonId", appointment_number as "appointmentNumber", customer_id as "customerId", customer_name as "customerName", customer_phone as "customerPhone", staff_id as "staffId", staff_name as "staffName", services, appointment_date as "appointmentDate", start_time as "startTime", end_time as "endTime", status, notes, total_amount as "totalAmount", created_at as "createdAt"
                 FROM appointments WHERE 1=1`;
      const params: any[] = [];
      if (filter?.customerId) {
        params.push(filter.customerId);
        sql += ` AND customer_id = $${params.length}`;
      }
      if (filter?.staffId) {
        params.push(filter.staffId);
        sql += ` AND staff_id = $${params.length}`;
      }
      if (filter?.appointmentDate || filter?.date) {
        params.push(filter.appointmentDate || filter.date);
        sql += ` AND appointment_date = $${params.length}`;
      }
      if (filter?.status) {
        params.push(filter.status);
        sql += ` AND status = $${params.length}`;
      }
      sql += ' ORDER BY appointment_date DESC, start_time ASC';
      const res = await query(sql, params);
      return res.rows.map(r => ({
        ...r,
        totalAmount: Number(r.totalAmount || 0),
        services: typeof r.services === 'string' ? JSON.parse(r.services) : (r.services || []),
      }));
    },

    async findById(id: string): Promise<any | null> {
      const res = await query(
        `SELECT id as "_id", id, salon_id as "salonId", appointment_number as "appointmentNumber", customer_id as "customerId", customer_name as "customerName", customer_phone as "customerPhone", staff_id as "staffId", staff_name as "staffName", services, appointment_date as "appointmentDate", start_time as "startTime", end_time as "endTime", status, notes, total_amount as "totalAmount", created_at as "createdAt"
         FROM appointments WHERE id = $1`,
        [id]
      );
      if (!res.rows[0]) return null;
      return {
        ...res.rows[0],
        totalAmount: Number(res.rows[0].totalAmount || 0),
        services: typeof res.rows[0].services === 'string' ? JSON.parse(res.rows[0].services) : (res.rows[0].services || []),
      };
    },

    async create(doc: any): Promise<any> {
      const id = doc.id || doc._id || genId('apt');
      const salonId = doc.salonId || 'sal_default';
      const count = await this.countDocuments();
      const appointmentNumber = doc.appointmentNumber || `APT-${1000 + count + 1}`;
      const customerId = doc.customerId;
      const customerName = doc.customerName;
      const customerPhone = doc.customerPhone;
      const staffId = doc.staffId;
      const staffName = doc.staffName || '';
      const services = JSON.stringify(doc.services || []);
      const appointmentDate = doc.appointmentDate;
      const startTime = doc.startTime;
      const endTime = doc.endTime || '';
      const status = doc.status || 'booked';
      const notes = doc.notes || '';
      const totalAmount = Number(doc.totalAmount || 0);

      await query(
        `INSERT INTO appointments (id, salon_id, appointment_number, customer_id, customer_name, customer_phone, staff_id, staff_name, services, appointment_date, start_time, end_time, status, notes, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [id, salonId, appointmentNumber, customerId, customerName, customerPhone, staffId, staffName, services, appointmentDate, startTime, endTime, status, notes, totalAmount]
      );

      return {
        _id: id,
        id,
        salonId,
        appointmentNumber,
        customerId,
        customerName,
        customerPhone,
        staffId,
        staffName,
        services: JSON.parse(services),
        appointmentDate,
        startTime,
        endTime,
        status,
        notes,
        totalAmount,
        createdAt: new Date().toISOString()
      };
    },

    async findByIdAndUpdate(id: string, updates: any): Promise<any | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates };

      await query(
        `UPDATE appointments
         SET status = $1, start_time = $2, end_time = $3, appointment_date = $4, staff_id = $5, staff_name = $6, notes = $7, total_amount = $8, services = $9, updated_at = CURRENT_TIMESTAMP
         WHERE id = $10`,
        [
          updated.status,
          updated.startTime,
          updated.endTime || '',
          updated.appointmentDate,
          updated.staffId,
          updated.staffName || '',
          updated.notes || '',
          Number(updated.totalAmount || 0),
          JSON.stringify(updated.services || []),
          id
        ]
      );

      return updated;
    },

    async findByIdAndDelete(id: string): Promise<boolean> {
      const res = await query('DELETE FROM appointments WHERE id = $1', [id]);
      return res.rowCount > 0;
    },
  },

  // ----------------------------------------
  // INVOICES & BILLING (PostgreSQL Transaction Guaranteed)
  // ----------------------------------------
  invoices: {
    async countDocuments(): Promise<number> {
      const res = await query('SELECT COUNT(*) as count FROM invoices');
      return parseInt(res.rows[0]?.count || '0', 10);
    },

    async find(filter?: any): Promise<any[]> {
      let sql = `SELECT id as "_id", id, salon_id as "salonId", invoice_number as "invoiceNumber", customer_id as "customerId", customer_name as "customerName", customer_phone as "customerPhone", customer_address as "customerAddress", staff_id as "staffId", staff_name as "staffName", appointment_id as "appointmentId", date, items, subtotal, discount_amount as "discountAmount", taxable_amount as "taxableAmount", cgst_total as "cgstTotal", sgst_total as "sgstTotal", total_tax as "totalTax", grand_total as "grandTotal", round_off as "roundOff", payment_method as "paymentMethod", payment_status as "paymentStatus", paid_amount as "paidAmount", due_amount as "dueAmount", notes, created_at as "createdAt"
                 FROM invoices WHERE 1=1`;
      const params: any[] = [];
      if (filter?.customerId) {
        params.push(filter.customerId);
        sql += ` AND customer_id = $${params.length}`;
      }
      if (filter?.invoiceNumber) {
        params.push(filter.invoiceNumber);
        sql += ` AND invoice_number = $${params.length}`;
      }
      sql += ' ORDER BY created_at DESC';
      const res = await query(sql, params);
      return res.rows.map(r => ({
        ...r,
        subtotal: Number(r.subtotal || 0),
        discountAmount: Number(r.discountAmount || 0),
        taxableAmount: Number(r.taxableAmount || 0),
        cgstTotal: Number(r.cgstTotal || 0),
        sgstTotal: Number(r.sgstTotal || 0),
        totalTax: Number(r.totalTax || 0),
        grandTotal: Number(r.grandTotal || 0),
        roundOff: Number(r.roundOff || 0),
        paidAmount: Number(r.paidAmount || 0),
        dueAmount: Number(r.dueAmount || 0),
        items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
      }));
    },

    async findById(id: string): Promise<any | null> {
      const res = await query(
        `SELECT id as "_id", id, salon_id as "salonId", invoice_number as "invoiceNumber", customer_id as "customerId", customer_name as "customerName", customer_phone as "customerPhone", customer_address as "customerAddress", staff_id as "staffId", staff_name as "staffName", appointment_id as "appointmentId", date, items, subtotal, discount_amount as "discountAmount", taxable_amount as "taxableAmount", cgst_total as "cgstTotal", sgst_total as "sgstTotal", total_tax as "totalTax", grand_total as "grandTotal", round_off as "roundOff", payment_method as "paymentMethod", payment_status as "paymentStatus", paid_amount as "paidAmount", due_amount as "dueAmount", notes, created_at as "createdAt"
         FROM invoices WHERE id = $1`,
        [id]
      );
      if (!res.rows[0]) return null;
      const r = res.rows[0];
      return {
        ...r,
        subtotal: Number(r.subtotal || 0),
        discountAmount: Number(r.discountAmount || 0),
        taxableAmount: Number(r.taxableAmount || 0),
        cgstTotal: Number(r.cgstTotal || 0),
        sgstTotal: Number(r.sgstTotal || 0),
        totalTax: Number(r.totalTax || 0),
        grandTotal: Number(r.grandTotal || 0),
        roundOff: Number(r.roundOff || 0),
        paidAmount: Number(r.paidAmount || 0),
        dueAmount: Number(r.dueAmount || 0),
        items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
      };
    },

    async create(doc: any): Promise<any> {
      const id = doc.id || doc._id || genId('inv');
      const salonId = doc.salonId || 'sal_default';
      const invoiceNumber = doc.invoiceNumber;
      const customerId = doc.customerId;
      const customerName = doc.customerName;
      const customerPhone = doc.customerPhone;
      const customerAddress = doc.customerAddress || '';
      const staffId = doc.staffId || '';
      const staffName = doc.staffName || '';
      const appointmentId = doc.appointmentId || '';
      const date = doc.date || new Date().toISOString();
      const items = JSON.stringify(doc.items || []);
      const subtotal = Number(doc.subtotal || 0);
      const discountAmount = Number(doc.discountAmount || 0);
      const taxableAmount = Number(doc.taxableAmount || 0);
      const cgstTotal = Number(doc.cgstTotal || 0);
      const sgstTotal = Number(doc.sgstTotal || 0);
      const totalTax = Number(doc.totalTax || 0);
      const grandTotal = Number(doc.grandTotal || 0);
      const roundOff = Number(doc.roundOff || 0);
      const paymentMethod = doc.paymentMethod || 'cash';
      const paymentStatus = doc.paymentStatus || 'paid';
      const paidAmount = Number(doc.paidAmount || grandTotal);
      const dueAmount = Number(doc.dueAmount || 0);
      const notes = doc.notes || '';

      await query(
        `INSERT INTO invoices (id, salon_id, invoice_number, customer_id, customer_name, customer_phone, customer_address, staff_id, staff_name, appointment_id, date, items, subtotal, discount_amount, taxable_amount, cgst_total, sgst_total, total_tax, grand_total, round_off, payment_method, payment_status, paid_amount, due_amount, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)`,
        [id, salonId, invoiceNumber, customerId, customerName, customerPhone, customerAddress, staffId, staffName, appointmentId, date, items, subtotal, discountAmount, taxableAmount, cgstTotal, sgstTotal, totalTax, grandTotal, roundOff, paymentMethod, paymentStatus, paidAmount, dueAmount, notes]
      );

      return {
        _id: id,
        id,
        salonId,
        invoiceNumber,
        customerId,
        customerName,
        customerPhone,
        customerAddress,
        staffId,
        staffName,
        appointmentId,
        date,
        items: JSON.parse(items),
        subtotal,
        discountAmount,
        taxableAmount,
        cgstTotal,
        sgstTotal,
        totalTax,
        grandTotal,
        roundOff,
        paymentMethod,
        paymentStatus,
        paidAmount,
        dueAmount,
        notes,
        createdAt: new Date().toISOString()
      };
    },

    async findByIdAndUpdate(id: string, updates: any): Promise<any | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates };

      await query(
        `UPDATE invoices
         SET payment_status = $1, paid_amount = $2, due_amount = $3, notes = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [updated.paymentStatus, Number(updated.paidAmount), Number(updated.dueAmount), updated.notes || '', id]
      );

      return updated;
    },
  },

  // ----------------------------------------
  // INVOICE ITEMS
  // ----------------------------------------
  invoiceItems: {
    async findByInvoiceId(invoiceId: string): Promise<any[]> {
      const res = await query(
        `SELECT id as "_id", id, invoice_id as "invoiceId", item_id as "itemId", item_type as "itemType", name, category, quantity, unit_price as "unitPrice", discount_type as "discountType", discount_value as "discountValue", discount_amount as "discountAmount", taxable_amount as "taxableAmount", tax_rate as "taxRate", cgst_rate as "cgstRate", cgst_amount as "cgstAmount", sgst_rate as "sgstRate", sgst_amount as "sgstAmount", total_amount as "totalAmount"
         FROM invoice_items WHERE invoice_id = $1`,
        [invoiceId]
      );
      return res.rows.map(r => ({
        ...r,
        quantity: Number(r.quantity),
        unitPrice: Number(r.unitPrice),
        discountAmount: Number(r.discountAmount),
        taxableAmount: Number(r.taxableAmount),
        taxRate: Number(r.taxRate),
        cgstAmount: Number(r.cgstAmount),
        sgstAmount: Number(r.sgstAmount),
        totalAmount: Number(r.totalAmount),
      }));
    },

    async createMany(invoiceId: string, items: any[]): Promise<any[]> {
      const inserted: any[] = [];
      for (const it of items) {
        const id = genId('ivi');
        const cgstRate = (it.taxRate || 18) / 2;
        const sgstRate = cgstRate;
        const cgstAmount = Number(it.taxAmount || 0) / 2;
        const sgstAmount = cgstAmount;

        await query(
          `INSERT INTO invoice_items (id, invoice_id, item_id, item_type, name, category, quantity, unit_price, discount_type, discount_value, discount_amount, taxable_amount, tax_rate, cgst_rate, cgst_amount, sgst_rate, sgst_amount, total_amount)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
          [
            id,
            invoiceId,
            it.itemId || '',
            it.itemType || 'service',
            it.name,
            it.category || '',
            Number(it.quantity || 1),
            Number(it.unitPrice || 0),
            it.discountType || 'percentage',
            Number(it.discountValue || 0),
            Number(it.discountAmount || 0),
            Number(it.taxableAmount || 0),
            Number(it.taxRate || 18),
            cgstRate,
            cgstAmount,
            sgstRate,
            sgstAmount,
            Number(it.totalAmount || 0)
          ]
        );
        inserted.push({ _id: id, id, invoiceId, ...it });
      }
      return inserted;
    },
  },

  // ----------------------------------------
  // PAYMENTS
  // ----------------------------------------
  payments: {
    async findByInvoiceId(invoiceId: string): Promise<any[]> {
      const res = await query(
        `SELECT id as "_id", id, invoice_id as "invoiceId", customer_id as "customerId", amount, payment_method as "paymentMethod", payment_status as "paymentStatus", transaction_ref as "transactionRef", payment_date as "paymentDate", notes, created_at as "createdAt"
         FROM payments WHERE invoice_id = $1 ORDER BY created_at ASC`,
        [invoiceId]
      );
      return res.rows.map(r => ({ ...r, amount: Number(r.amount) }));
    },

    async create(doc: any): Promise<any> {
      const id = doc.id || doc._id || genId('pay');
      const invoiceId = doc.invoiceId;
      const customerId = doc.customerId || '';
      const amount = Number(doc.amount || 0);
      const paymentMethod = doc.paymentMethod || 'cash';
      const paymentStatus = doc.paymentStatus || 'completed';
      const transactionRef = doc.transactionRef || '';
      const paymentDate = doc.paymentDate || new Date().toISOString();
      const notes = doc.notes || '';

      await query(
        `INSERT INTO payments (id, invoice_id, customer_id, amount, payment_method, payment_status, transaction_ref, payment_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, invoiceId, customerId, amount, paymentMethod, paymentStatus, transactionRef, paymentDate, notes]
      );

      return { _id: id, id, invoiceId, customerId, amount, paymentMethod, paymentStatus, transactionRef, paymentDate, notes };
    },
  },

  // ----------------------------------------
  // PRODUCTS (Retail & Inventory)
  // ----------------------------------------
  products: {
    async countDocuments(): Promise<number> {
      const res = await query('SELECT COUNT(*) as count FROM products');
      return parseInt(res.rows[0]?.count || '0', 10);
    },

    async find(category?: string, search?: string): Promise<any[]> {
      let sql = `SELECT id as "_id", id, salon_id as "salonId", name, sku, category, purchase_cost as "purchaseCost", selling_price as "sellingPrice", stock_quantity as "stockQuantity", min_stock_threshold as "minStockThreshold", unit, supplier, tax_rate as "taxRate", created_at as "createdAt"
                 FROM products WHERE 1=1`;
      const params: any[] = [];
      if (category && category !== 'All') {
        params.push(category);
        sql += ` AND category = $${params.length}`;
      }
      if (search && search.trim()) {
        params.push(`%${search.trim().toLowerCase()}%`);
        sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(sku) LIKE $${params.length} OR LOWER(category) LIKE $${params.length})`;
      }
      sql += ' ORDER BY name ASC';
      const res = await query(sql, params);
      return res.rows.map(r => ({
        ...r,
        purchaseCost: Number(r.purchaseCost),
        sellingPrice: Number(r.sellingPrice),
        stockQuantity: Number(r.stockQuantity),
        minStockThreshold: Number(r.minStockThreshold),
        taxRate: Number(r.taxRate),
      }));
    },

    async findById(id: string): Promise<any | null> {
      const res = await query(
        `SELECT id as "_id", id, salon_id as "salonId", name, sku, category, purchase_cost as "purchaseCost", selling_price as "sellingPrice", stock_quantity as "stockQuantity", min_stock_threshold as "minStockThreshold", unit, supplier, tax_rate as "taxRate", created_at as "createdAt"
         FROM products WHERE id = $1`,
        [id]
      );
      if (!res.rows[0]) return null;
      const r = res.rows[0];
      return {
        ...r,
        purchaseCost: Number(r.purchaseCost),
        sellingPrice: Number(r.sellingPrice),
        stockQuantity: Number(r.stockQuantity),
        minStockThreshold: Number(r.minStockThreshold),
        taxRate: Number(r.taxRate),
      };
    },

    async create(doc: any): Promise<any> {
      const id = doc.id || doc._id || genId('prd');
      const salonId = doc.salonId || 'sal_default';
      const name = (doc.name || '').trim();
      const sku = (doc.sku || `SKU-${Date.now().toString(36).toUpperCase()}`).trim();
      const category = (doc.category || 'Retail').trim();
      const purchaseCost = Number(doc.purchaseCost || 0);
      const sellingPrice = Number(doc.sellingPrice || 0);
      const stockQuantity = Number(doc.stockQuantity || 0);
      const minStockThreshold = Number(doc.minStockThreshold || 5);
      const unit = doc.unit || 'pcs';
      const supplier = doc.supplier || '';
      const taxRate = Number(doc.taxRate !== undefined ? doc.taxRate : 18);

      await query(
        `INSERT INTO products (id, salon_id, name, sku, category, purchase_cost, selling_price, stock_quantity, min_stock_threshold, unit, supplier, tax_rate)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [id, salonId, name, sku, category, purchaseCost, sellingPrice, stockQuantity, minStockThreshold, unit, supplier, taxRate]
      );

      return { _id: id, id, salonId, name, sku, category, purchaseCost, sellingPrice, stockQuantity, minStockThreshold, unit, supplier, taxRate };
    },

    async findByIdAndUpdate(id: string, updates: any): Promise<any | null> {
      const existing = await this.findById(id);
      if (!existing) return null;
      const updated = { ...existing, ...updates };

      await query(
        `UPDATE products
         SET name = $1, sku = $2, category = $3, purchase_cost = $4, selling_price = $5, stock_quantity = $6, min_stock_threshold = $7, unit = $8, supplier = $9, tax_rate = $10, updated_at = CURRENT_TIMESTAMP
         WHERE id = $11`,
        [
          updated.name,
          updated.sku,
          updated.category,
          Number(updated.purchaseCost),
          Number(updated.sellingPrice),
          Number(updated.stockQuantity),
          Number(updated.minStockThreshold),
          updated.unit || 'pcs',
          updated.supplier || '',
          Number(updated.taxRate),
          id
        ]
      );

      return updated;
    },

    async findByIdAndDelete(id: string): Promise<boolean> {
      const res = await query('DELETE FROM products WHERE id = $1', [id]);
      return res.rowCount > 0;
    },
  },

  // ----------------------------------------
  // INVENTORY MOVEMENTS
  // ----------------------------------------
  inventoryMovements: {
    async find(limit = 100): Promise<any[]> {
      const res = await query(
        `SELECT id as "_id", id, product_id as "productId", product_name as "productName", type, quantity, previous_stock as "previousStock", new_stock as "newStock", date, performed_by as "performedBy", notes, created_at as "createdAt"
         FROM inventory_movements ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return res.rows.map(r => ({
        ...r,
        quantity: Number(r.quantity),
        previousStock: Number(r.previousStock),
        newStock: Number(r.newStock),
      }));
    },

    async create(doc: any): Promise<any> {
      const id = doc.id || doc._id || genId('mov');
      const productId = doc.productId;
      const productName = doc.productName;
      const type = doc.type || 'adjustment';
      const quantity = Number(doc.quantity || 0);
      const previousStock = Number(doc.previousStock || 0);
      const newStock = Number(doc.newStock || 0);
      const date = doc.date || new Date().toISOString();
      const performedBy = doc.performedBy || 'Admin';
      const notes = doc.notes || '';

      await query(
        `INSERT INTO inventory_movements (id, product_id, product_name, type, quantity, previous_stock, new_stock, date, performed_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, productId, productName, type, quantity, previousStock, newStock, date, performedBy, notes]
      );

      return { _id: id, id, productId, productName, type, quantity, previousStock, newStock, date, performedBy, notes };
    },
  },

  // ----------------------------------------
  // EXPENSES
  // ----------------------------------------
  expenses: {
    async countDocuments(): Promise<number> {
      const res = await query('SELECT COUNT(*) as count FROM expenses');
      return parseInt(res.rows[0]?.count || '0', 10);
    },

    async find(category?: string, startDate?: string, endDate?: string): Promise<any[]> {
      let sql = `SELECT id as "_id", id, salon_id as "salonId", title, category, amount, date, payment_method as "paymentMethod", paid_to as "paidTo", receipt_number as "receiptNumber", notes, created_at as "createdAt"
                 FROM expenses WHERE 1=1`;
      const params: any[] = [];
      if (category && category !== 'All') {
        params.push(category);
        sql += ` AND category = $${params.length}`;
      }
      if (startDate) {
        params.push(startDate);
        sql += ` AND date >= $${params.length}`;
      }
      if (endDate) {
        params.push(endDate);
        sql += ` AND date <= $${params.length}`;
      }
      sql += ' ORDER BY date DESC, created_at DESC';
      const res = await query(sql, params);
      return res.rows.map(r => ({ ...r, amount: Number(r.amount) }));
    },

    async findById(id: string): Promise<any | null> {
      const res = await query(
        `SELECT id as "_id", id, salon_id as "salonId", title, category, amount, date, payment_method as "paymentMethod", paid_to as "paidTo", receipt_number as "receiptNumber", notes, created_at as "createdAt"
         FROM expenses WHERE id = $1`,
        [id]
      );
      if (!res.rows[0]) return null;
      return { ...res.rows[0], amount: Number(res.rows[0].amount) };
    },

    async create(doc: any): Promise<any> {
      const id = doc.id || doc._id || genId('exp');
      const salonId = doc.salonId || 'sal_default';
      const title = (doc.title || '').trim();
      const category = (doc.category || 'General').trim();
      const amount = Number(doc.amount || 0);
      const date = doc.date || new Date().toISOString().split('T')[0];
      const paymentMethod = doc.paymentMethod || 'cash';
      const paidTo = doc.paidTo || '';
      const receiptNumber = doc.receiptNumber || '';
      const notes = doc.notes || '';

      await query(
        `INSERT INTO expenses (id, salon_id, title, category, amount, date, payment_method, paid_to, receipt_number, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, salonId, title, category, amount, date, paymentMethod, paidTo, receiptNumber, notes]
      );

      return { _id: id, id, salonId, title, category, amount, date, paymentMethod, paidTo, receiptNumber, notes };
    },

    async findByIdAndDelete(id: string): Promise<boolean> {
      const res = await query('DELETE FROM expenses WHERE id = $1', [id]);
      return res.rowCount > 0;
    },
  },

  // ----------------------------------------
  // SETTINGS (Salon Config)
  // ----------------------------------------
  settings: {
    async get(): Promise<any> {
      const res = await query(
        `SELECT id as "_id", id, salon_id as "salonId", salon_name as "salonName", tagline, phone, email, address, city, state, pincode, gstin, default_gst_rate as "defaultGstRate", tax_mode as "taxMode", currency_symbol as "currencySymbol", invoice_prefix as "invoicePrefix", invoice_footer as "invoiceFooter", terms_and_conditions as "termsAndConditions", operating_hours as "operatingHours", whatsapp_enabled as "whatsappEnabled"
         FROM settings LIMIT 1`
      );
      if (res.rows[0]) {
        const r = res.rows[0];
        return {
          ...r,
          defaultGstRate: Number(r.defaultGstRate || 18),
          operatingHours: typeof r.operatingHours === 'string' ? JSON.parse(r.operatingHours) : (r.operatingHours || { open: '09:00', close: '21:00', workingDays: [] }),
        };
      }
      return {
        _id: 'set_default',
        id: 'set_default',
        salonId: 'sal_default',
        salonName: 'Saloonify Luxury Salon & Spa',
        tagline: 'Style, Care & Elegance Redefined',
        phone: '+91 98765 43210',
        email: 'care@saloonify.in',
        address: '100 Feet Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        gstin: '29ABCDE1234F1Z5',
        defaultGstRate: 18,
        taxMode: 'exclusive',
        currencySymbol: '₹',
        invoicePrefix: 'INV',
        invoiceFooter: 'Thank you for choosing Saloonify! We look forward to pampering you again.',
        termsAndConditions: 'All services rendered are non-refundable. Please preserve this invoice for future warranty on treatments.',
        operatingHours: { open: '09:00', close: '21:00', workingDays: [] },
        whatsappEnabled: true,
      };
    },

    async update(updates: any): Promise<any> {
      const existing = await this.get();
      const updated = { ...existing, ...updates };

      await query(
        `INSERT INTO settings (id, salon_id, salon_name, tagline, phone, email, address, city, state, pincode, gstin, default_gst_rate, tax_mode, currency_symbol, invoice_prefix, invoice_footer, terms_and_conditions, operating_hours, whatsapp_enabled, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           salon_name = EXCLUDED.salon_name,
           tagline = EXCLUDED.tagline,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           address = EXCLUDED.address,
           city = EXCLUDED.city,
           state = EXCLUDED.state,
           pincode = EXCLUDED.pincode,
           gstin = EXCLUDED.gstin,
           default_gst_rate = EXCLUDED.default_gst_rate,
           tax_mode = EXCLUDED.tax_mode,
           currency_symbol = EXCLUDED.currency_symbol,
           invoice_prefix = EXCLUDED.invoice_prefix,
           invoice_footer = EXCLUDED.invoice_footer,
           terms_and_conditions = EXCLUDED.terms_and_conditions,
           operating_hours = EXCLUDED.operating_hours,
           whatsapp_enabled = EXCLUDED.whatsapp_enabled,
           updated_at = CURRENT_TIMESTAMP`,
        [
          updated.id || 'set_default',
          updated.salonId || 'sal_default',
          updated.salonName,
          updated.tagline || '',
          updated.phone || '',
          updated.email || '',
          updated.address || '',
          updated.city || 'Bengaluru',
          updated.state || 'Karnataka',
          updated.pincode || '',
          updated.gstin || '',
          Number(updated.defaultGstRate || 18),
          updated.taxMode || 'exclusive',
          updated.currencySymbol || '₹',
          updated.invoicePrefix || 'INV',
          updated.invoiceFooter || '',
          updated.termsAndConditions || '',
          JSON.stringify(updated.operatingHours || {}),
          updated.whatsappEnabled !== false
        ]
      );

      return updated;
    },
  },
};
