const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../data/config.json');
const DATA_FILE = path.join(__dirname, '../data/services.json');

// Get dashboard configuration
router.get('/', async (req, res) => {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(data);
    res.json(config);
  } catch (error) {
    // Return default config if file doesn't exist
    const defaultConfig = {
      theme: 'light',
      refreshInterval: 30000,
      layout: 'grid',
      notifications: {
        enabled: true,
        emailAlerts: false,
        pushNotifications: true
      },
      dashboard: {
        title: 'Bridges Pulse',
        subtitle: 'Advanced Health Monitoring',
        showTimestamp: true,
        showSummary: true
      },
      categories: {
        application: { visible: true, order: 1, color: '#3b82f6' },
        database: { visible: true, order: 2, color: '#10b981' },
        integrations: { visible: true, order: 3, color: '#f59e0b' },
        functionalities: { visible: true, order: 4, color: '#8b5cf6' },
        services: { visible: true, order: 5, color: '#06b6d4' }
      },
      reports: {
        autoGenerate: true,
        schedule: 'daily',
        includeSLA: true,
        includeIncidents: true
      }
    };
    res.json(defaultConfig);
  }
});

// Update dashboard configuration  
router.put('/', async (req, res) => {
  try {
    const config = req.body;
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Get dashboard layout settings
router.get('/layout', async (req, res) => {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(data);
    res.json({
      layout: config.layout || 'grid',
      categories: config.categories || {},
      theme: config.theme || 'light'
    });
  } catch (error) {
    res.json({
      layout: 'grid',
      categories: {},
      theme: 'light'
    });
  }
});

// Update layout configuration
router.put('/layout', async (req, res) => {
  try {
    let config = {};
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf8');
      config = JSON.parse(data);
    } catch (e) {
      // File doesn't exist, use empty config
    }
    
    const { layout, categories, theme } = req.body;
    
    if (layout) config.layout = layout;
    if (categories) config.categories = { ...config.categories, ...categories };
    if (theme) config.theme = theme;
    
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update layout configuration' });
  }
});

// Add new service/category
router.post('/service/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const service = req.body;
    
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const services = JSON.parse(data);
    
    if (!services[category]) {
      services[category] = [];
    }
    
    // Add ID if not provided
    service.id = service.id || `${category}_${Date.now()}`;
    service.dateAdded = new Date().toISOString();
    
    services[category].push(service);
    
    await fs.writeFile(DATA_FILE, JSON.stringify(services, null, 2));
    
    res.json({ success: true, service, category });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add service' });
  }
});

// Remove service
router.delete('/service/:category/:serviceId', async (req, res) => {
  try {
    const { category, serviceId } = req.params;
    
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const services = JSON.parse(data);
    
    if (services[category]) {
      const index = services[category].findIndex(s => s.id === serviceId || s.name === serviceId);
      if (index !== -1) {
        const removed = services[category].splice(index, 1)[0];
        await fs.writeFile(DATA_FILE, JSON.stringify(services, null, 2));
        res.json({ success: true, removed });
      } else {
        res.status(404).json({ error: 'Service not found' });
      }
    } else {
      res.status(404).json({ error: 'Category not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove service' });
  }
});

// Export configuration
router.get('/export', async (req, res) => {
  try {
    const configData = await fs.readFile(CONFIG_FILE, 'utf8');
    const servicesData = await fs.readFile(DATA_FILE, 'utf8');
    
    const exportData = {
      config: JSON.parse(configData),
      services: JSON.parse(servicesData),
      exported: new Date().toISOString(),
      version: '1.0.0'
    };
    
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export configuration' });
  }
});

// Import configuration
router.post('/import', async (req, res) => {
  try {
    const { config, services } = req.body;
    
    if (config) {
      await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    }
    
    if (services) {
      await fs.writeFile(DATA_FILE, JSON.stringify(services, null, 2));
    }
    
    res.json({ success: true, imported: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import configuration' });
  }
});

module.exports = router;