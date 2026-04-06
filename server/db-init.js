const db = require('./db');
const fs = require('fs').promises;
const path = require('path');

async function initDB() {
  // Create tables
  await db.query(`
    CREATE TABLE IF NOT EXISTS services (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(200),
      icon VARCHAR(50),
      status VARCHAR(50),
      response_time VARCHAR(20),
      problem_statement TEXT DEFAULT '',
      last_updated TIMESTAMPTZ,
      category VARCHAR(50)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS history (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ,
      category VARCHAR(50),
      service_id VARCHAR(100),
      status VARCHAR(50),
      problem_statement TEXT,
      type VARCHAR(50),
      duration INTEGER,
      resolved_by VARCHAR(200),
      previous_status VARCHAR(50)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS broadcast (
      id INTEGER PRIMARY KEY DEFAULT 1,
      message TEXT DEFAULT '',
      severity VARCHAR(20) DEFAULT 'info',
      active BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ,
      updated_by VARCHAR(100)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS config (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB
    )
  `);

  // Seed services from JSON if table is empty
  const { rows: svcCount } = await db.query('SELECT COUNT(*) FROM services');
  if (parseInt(svcCount[0].count) === 0) {
    try {
      const data = await fs.readFile(path.join(__dirname, 'data/services.json'), 'utf8');
      const services = JSON.parse(data);
      for (const [category, items] of Object.entries(services)) {
        for (const item of items) {
          await db.query(
            `INSERT INTO services (id, name, icon, status, response_time, problem_statement, last_updated, category)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
            [item.id, item.name, item.icon || 'circle', item.status || 'Unknown',
             item.responseTime || 'NA', item.problemStatement || '',
             item.lastUpdated || new Date().toISOString(), category]
          );
        }
      }
      console.log('Seeded services from JSON');
    } catch (e) {
      console.error('Failed to seed services:', e.message);
    }
  }

  // Seed history from JSON if table is empty
  const { rows: histCount } = await db.query('SELECT COUNT(*) FROM history');
  if (parseInt(histCount[0].count) === 0) {
    try {
      const data = await fs.readFile(path.join(__dirname, 'data/history.json'), 'utf8');
      const history = JSON.parse(data);
      for (const entry of history) {
        await db.query(
          `INSERT INTO history (timestamp, category, service_id, status, problem_statement, type, duration, resolved_by, previous_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [entry.timestamp, entry.category, entry.serviceId, entry.status,
           entry.problemStatement || '', entry.type || 'status_change',
           entry.duration || null, entry.resolvedBy || null, entry.previousStatus || null]
        );
      }
      console.log('Seeded history from JSON');
    } catch (e) {
      console.error('Failed to seed history:', e.message);
    }
  }

  // Seed broadcast from JSON if table is empty
  const { rows: bcCount } = await db.query('SELECT COUNT(*) FROM broadcast');
  if (parseInt(bcCount[0].count) === 0) {
    try {
      const data = await fs.readFile(path.join(__dirname, 'data/ops.json'), 'utf8');
      const ops = JSON.parse(data);
      const b = ops.broadcast || {};
      await db.query(
        `INSERT INTO broadcast (id, message, severity, active, created_at, updated_by)
         VALUES (1, $1, $2, $3, $4, $5)`,
        [b.message || '', b.severity || 'info', b.active || false,
         b.createdAt || null, b.updatedBy || '']
      );
    } catch (e) {
      await db.query(
        `INSERT INTO broadcast (id, message, severity, active, created_at, updated_by)
         VALUES (1, '', 'info', false, null, '')`
      );
    }
    console.log('Seeded broadcast from JSON');
  }

  // Seed config from JSON if table is empty
  const { rows: cfgCount } = await db.query("SELECT COUNT(*) FROM config WHERE key = 'main'");
  if (parseInt(cfgCount[0].count) === 0) {
    try {
      const data = await fs.readFile(path.join(__dirname, 'data/config.json'), 'utf8');
      const config = JSON.parse(data);
      await db.query(
        `INSERT INTO config (key, value) VALUES ('main', $1)`,
        [JSON.stringify(config)]
      );
    } catch (e) {
      const defaultConfig = {
        theme: 'light', refreshInterval: 30000, layout: 'grid',
        notifications: { enabled: true, emailAlerts: false, pushNotifications: true, sound: true },
        dashboard: { title: 'Bridges Pulse', subtitle: 'Advanced Health Monitoring Dashboard',
          showTimestamp: true, showSummary: true, showMetrics: true, compactMode: false },
        categories: {
          application: { visible: true, order: 1, color: '#3b82f6', icon: 'layers', title: 'Application Layer', expanded: false },
          database: { visible: true, order: 2, color: '#10b981', icon: 'database', title: 'Database Systems', expanded: false },
          integrations: { visible: true, order: 3, color: '#f59e0b', icon: 'link', title: 'Integrations', expanded: false },
          functionalities: { visible: true, order: 4, color: '#8b5cf6', icon: 'zap', title: 'Functionalities', expanded: false },
          services: { visible: true, order: 5, color: '#06b6d4', icon: 'server', title: 'Services', expanded: false }
        }
      };
      await db.query(`INSERT INTO config (key, value) VALUES ('main', $1)`, [JSON.stringify(defaultConfig)]);
    }
    console.log('Seeded config from JSON');
  }

  console.log('Database initialized successfully');
}

module.exports = initDB;
