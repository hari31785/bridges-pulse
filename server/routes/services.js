const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/services.json');
const HISTORY_FILE = path.join(__dirname, '../data/history.json');

// Get all services with current status
router.get('/', async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const services = JSON.parse(data);
    
    // Add timestamp
    const response = {
      timestamp: new Date().toISOString(),
      services,
      summary: generateSummary(services)
    };
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load services data' });
  }
});

// Get service by category
router.get('/category/:category', async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const services = JSON.parse(data);
    const category = req.params.category;
    
    if (services[category]) {
      res.json({
        category,
        services: services[category],
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({ error: 'Category not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to load category data' });
  }
});

// Get historical data
router.get('/history/:timeRange?', async (req, res) => {
  try {
    const timeRange = req.params.timeRange || '24h';
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    const history = JSON.parse(data);
    
    const filtered = filterByTimeRange(history, timeRange);
    
    res.json({
      timeRange,
      data: filtered,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load historical data' });
  }
});

// Update service fields from Ops page
router.patch('/:category/:serviceId/status', async (req, res) => {
  try {
    const { category, serviceId } = req.params;
    const { status, problemStatement, responseTime, owner } = req.body;

    const allowedStatuses = ['Operational', 'Average', 'Poor', 'Running Normally', 'Down', 'Degraded', 'Maintenance', 'Unknown'];
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const data = await fs.readFile(DATA_FILE, 'utf8');
    const services = JSON.parse(data);

    if (!services[category]) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const serviceIndex = services[category].findIndex(s => s.id === serviceId);
    if (serviceIndex === -1) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const service = services[category][serviceIndex];

    if (status !== undefined) service.status = status;
    if (problemStatement !== undefined) service.problemStatement = problemStatement.slice(0, 500);
    if (responseTime !== undefined) service.responseTime = responseTime.slice(0, 20);
    if (owner !== undefined) service.owner = owner.slice(0, 100);
    service.lastUpdated = new Date().toISOString();

    await fs.writeFile(DATA_FILE, JSON.stringify(services, null, 2));
    await logStatusChange(category, serviceId, service.status, service.problemStatement);

    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Helper functions
function generateSummary(services) {
  const summary = {
    total: 0,
    operational: 0,
    issues: 0,
    critical: 0,
    categories: {}
  };
  
  Object.entries(services).forEach(([category, items]) => {
    summary.categories[category] = { total: items.length, healthy: 0, issues: 0 };
    
    items.forEach(item => {
      summary.total++;
      const status = item.status.toLowerCase();
      const hasProblem = item.problemStatement && item.problemStatement.trim();
      
      if (status.includes('poor') || status.includes('error') || status.includes('critical') || status.includes('down')) {
        summary.critical++;
        summary.categories[category].issues++;
      } else if (hasProblem || status.includes('average') || status.includes('warning') || status.includes('degraded') || status.includes('maintenance')) {
        summary.issues++;
        summary.categories[category].issues++;
      } else {
        summary.operational++;
        summary.categories[category].healthy++;
      }
    });
  });
  
  return summary;
}

function filterByTimeRange(history, timeRange) {
  const now = new Date();
  let cutoff;
  
  switch (timeRange) {
    case '1h':
      cutoff = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  
  return history.filter(entry => new Date(entry.timestamp) >= cutoff);
}

async function logStatusChange(category, serviceId, status, problemStatement) {
  try {
    const historyData = await fs.readFile(HISTORY_FILE, 'utf8');
    const history = JSON.parse(historyData);
    
    history.push({
      timestamp: new Date().toISOString(),
      category,
      serviceId,
      status,
      problemStatement: problemStatement || '',
      type: 'status_change'
    });
    
    // Keep only last 1000 entries
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('Failed to log status change:', error);
  }
}

module.exports = router;