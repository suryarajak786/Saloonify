import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './backend/database.js';
import apiRouter from './backend/routes/api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize Database (PostgreSQL with resilient persistent fallback)
  let dbInitResult = { isPostgres: false, message: 'Local persistent store' };
  try {
    dbInitResult = await initDatabase();
    console.log(`[Saloonify Server] Database initialization: ${dbInitResult.message}`);
  } catch (dbErr: any) {
    console.warn(`[Saloonify Server] Database init warning: ${dbErr?.message}`);
  }

  // API Routes
  app.use('/api', apiRouter);

  // Serve Vite in development
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static files
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`✨ Saloonify Salon Management System is active!`);
    console.log(`🌐 Server listening at: http://localhost:${PORT}`);
    console.log(`🗄️ Database: ${dbInitResult.message}`);
    console.log(`======================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('[Saloonify Server] Failed to start server:', err);
  process.exit(1);
});
