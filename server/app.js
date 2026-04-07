require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const winston = require('winston');

const servicesRouter = require('./routes/services');
const reportsRouter = require('./routes/reports');
const configRouter = require('./routes/config');
const opsRouter = require('./routes/ops');
const initDB = require('./db-init');

// Logger setup
const logTransports = [new winston.transports.Console({ format: winston.format.simple() })];
if (process.env.NODE_ENV !== 'production') {
  logTransports.push(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
  logTransports.push(new winston.transports.File({ filename: 'logs/combined.log' }));
}
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: logTransports
});

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Health check — no DB needed, always responds
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('../package.json').version
  });
});

// Lazy DB init middleware for all other API routes
let dbReady = false;
app.use('/api', async (req, res, next) => {
  if (!dbReady) {
    try {
      await initDB();
      dbReady = true;
    } catch (err) {
      console.error(`Database initialization failed: ${err.message}\n${err.stack}`);
      return res.status(503).json({ error: `Database unavailable: ${err.message}` });
    }
  }
  next();
});

app.use('/api/services', servicesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/config', configRouter);
app.use('/api/ops', opsRouter);

// Serve frontend
app.get('/ops', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/ops.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server locally (Vercel handles this itself)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, async () => {
    try {
      await initDB();
    } catch (err) {
      logger.error('Database initialization failed:', err.message);
    }
    logger.info(`🚀 Bridges Pulse server running on http://localhost:${PORT}`);
    logger.info('📊 Dashboard: http://localhost:' + PORT);
    logger.info('🔧 API: http://localhost:' + PORT + '/api');
  });
}

module.exports = app;