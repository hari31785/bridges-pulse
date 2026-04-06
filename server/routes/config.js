const express = require('express');
const router = express.Router();
const db = require('../db');

const DEFAULT_CONFIG = {
  theme: 'light',
  refreshInterval: 30000,
  layout: 'grid',
  notifications: { enabled: true, emailAlerts: false, pushNotifications: true },
  dashboard: { title: 'Bridges Pulse', subtitle: 'Advanced Health Monitoring', showTimestamp: true, showSummary: true },
  categories: {
    application: { visible: true, order: 1, color: '#3b82f6' },
    database: { visible: true, order: 2, color: '#10b981' },
    integrations: { visible: true, order: 3, color: '#f59e0b' },
    functionalities: { visible: true, order: 4, color: '#8b5cf6' },
    services: { visible: true, order: 5, color: '#06b6d4' }
  },
  reports: { autoGenerate: true, schedule: 'daily', includeSLA: true, includeIncidents: true }
};

async function getConfig() {
  const { rows } = await db.query("SELECT value FROM config WHERE key = 'main'");
  return rows.length > 0 ? rows[0].value : DEFAULT_CONFIG;
}

async function saveConfig(config) {
  await db.query(
    `INSERT INTO config (key, value) VALUES ('main', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1`,
    [JSON.stringify(config)]
  );
}

// Get dashboard configuration
router.get('/', async (req, res) => {
  try {
    const config = await getConfig();
    res.json(config);
  } catch (error) {
    res.json(DEFAULT_CONFIG);
  }
});

// Update dashboard configuration
router.put('/', async (req, res) => {
  try {
    const config = req.body;
    await saveConfig(config);
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Get dashboard layout settings
router.get('/layout', async (req, res) => {
  try {
    const config = await getConfig();
    res.json({
      layout: config.layout || 'grid',
      categories: config.categories || {},
      theme: config.theme || 'light'
    });
  } catch (error) {
    res.json({ layout: 'grid', categories: {}, theme: 'light' });
  }
});

// Update layout configuration
router.put('/layout', async (req, res) => {
  try {
    const config = await getConfig();
    const { layout, categories, theme } = req.body;

    if (layout) config.layout = layout;
    if (categories) config.categories = { ...config.categories, ...categories };
    if (theme) config.theme = theme;

    await saveConfig(config);
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update layout configuration' });
  }
});

// Add new service/category
router.post('/service/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const service = req.body;

    service.id = service.id || `${category}_${Date.now()}`;
    service.category = category;
    service.dateAdded = new Date().toISOString();
    service.status = service.status || 'Unknown';
    service.responseTime = service.responseTime || 'NA';
    service.problemStatement = service.problemStatement || '';
    service.lastUpdated = new Date().toISOString();

    await db.query(
      `INSERT INTO services (id, name, icon, status, response_time, problem_statement, last_updated, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [service.id, service.name, service.icon || 'circle', service.status,
       service.responseTime, service.problemStatement, service.lastUpdated, category]
    );

    res.json({ success: true, service, category });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add service' });
  }
});

// Remove service
router.delete('/service/:category/:serviceId', async (req, res) => {
  try {
    const { category, serviceId } = req.params;

    const { rows } = await db.query(
      'DELETE FROM services WHERE (id = $1 OR name = $1) AND category = $2 RETURNING *',
      [serviceId, category]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({ success: true, removed: rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove service' });
  }
});

// Export configuration
router.get('/export', async (req, res) => {
  try {
    const config = await getConfig();
    const { rows } = await db.query('SELECT * FROM services ORDER BY category, name');
    const services = {};
    rows.forEach(row => {
      if (!services[row.category]) services[row.category] = [];
      services[row.category].push({
        id: row.id, name: row.name, icon: row.icon, status: row.status,
        responseTime: row.response_time, problemStatement: row.problem_statement,
        lastUpdated: row.last_updated, category: row.category
      });
    });

    res.json({ config, services, exported: new Date().toISOString(), version: '1.0.0' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to export configuration' });
  }
});

// Import configuration
router.post('/import', async (req, res) => {
  try {
    const { config, services } = req.body;

    if (config) {
      await saveConfig(config);
    }

    if (services) {
      for (const [category, items] of Object.entries(services)) {
        for (const item of items) {
          await db.query(
            `INSERT INTO services (id, name, icon, status, response_time, problem_statement, last_updated, category)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET name=$2, icon=$3, status=$4, response_time=$5, problem_statement=$6, last_updated=$7, category=$8`,
            [item.id, item.name, item.icon || 'circle', item.status || 'Unknown',
             item.responseTime || 'NA', item.problemStatement || '',
             item.lastUpdated || new Date().toISOString(), category]
          );
        }
      }
    }

    res.json({ success: true, imported: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import configuration' });
  }
});

module.exports = router;