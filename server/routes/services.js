const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all services with current status
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM services ORDER BY category, name');
    const services = groupByCategory(rows);
    res.json({
      timestamp: new Date().toISOString(),
      services,
      summary: generateSummary(services)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load services data' });
  }
});

// Get service by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { rows } = await db.query(
      'SELECT * FROM services WHERE category = $1 ORDER BY name',
      [category]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({
      category,
      services: rows.map(rowToService),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load category data' });
  }
});

// Get historical data
router.get('/history/:timeRange?', async (req, res) => {
  try {
    const timeRange = req.params.timeRange || '24h';
    const cutoff = getCutoff(timeRange);
    const { rows } = await db.query(
      'SELECT * FROM history WHERE timestamp >= $1 ORDER BY timestamp DESC',
      [cutoff]
    );
    res.json({
      timeRange,
      data: rows.map(rowToHistory),
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
    const { status, problemStatement, responseTime } = req.body;

    const allowedStatuses = ['Operational', 'OK', 'Average', 'Poor', 'Running Normally', 'Down', 'Degraded', 'Maintenance', 'Unknown'];
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const { rows: existing } = await db.query(
      'SELECT * FROM services WHERE id = $1 AND category = $2',
      [serviceId, category]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const now = new Date().toISOString();
    const setClauses = [];
    const values = [];
    let idx = 1;

    if (status !== undefined) { setClauses.push(`status = $${idx++}`); values.push(status); }
    if (problemStatement !== undefined) { setClauses.push(`problem_statement = $${idx++}`); values.push(problemStatement.slice(0, 500)); }
    if (responseTime !== undefined) { setClauses.push(`response_time = $${idx++}`); values.push(responseTime.slice(0, 20)); }
    setClauses.push(`last_updated = $${idx++}`);
    values.push(now);
    values.push(serviceId);
    values.push(category);

    const { rows } = await db.query(
      `UPDATE services SET ${setClauses.join(', ')} WHERE id = $${idx} AND category = $${idx + 1} RETURNING *`,
      values
    );

    const service = rowToService(rows[0]);

    await db.query(
      `INSERT INTO history (timestamp, category, service_id, status, problem_statement, type)
       VALUES ($1, $2, $3, $4, $5, 'status_change')`,
      [now, category, serviceId, service.status, service.problemStatement || '']
    );

    // Keep only last 1000 history entries
    await db.query(
      `DELETE FROM history WHERE id IN (SELECT id FROM history ORDER BY timestamp DESC OFFSET 1000)`
    );

    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Helper functions
function groupByCategory(rows) {
  const services = {};
  rows.forEach(row => {
    if (!services[row.category]) services[row.category] = [];
    services[row.category].push(rowToService(row));
  });
  return services;
}

function rowToService(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    status: row.status,
    responseTime: row.response_time,
    problemStatement: row.problem_statement,
    lastUpdated: row.last_updated,
    category: row.category
  };
}

function rowToHistory(row) {
  return {
    id: row.id,
    timestamp: row.timestamp,
    category: row.category,
    serviceId: row.service_id,
    status: row.status,
    problemStatement: row.problem_statement,
    type: row.type,
    duration: row.duration,
    resolvedBy: row.resolved_by,
    previousStatus: row.previous_status
  };
}

function getCutoff(timeRange) {
  const now = new Date();
  switch (timeRange) {
    case '1h':  return new Date(now - 60 * 60 * 1000);
    case '24h': return new Date(now - 24 * 60 * 60 * 1000);
    case '7d':  return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);
    default:    return new Date(now - 24 * 60 * 60 * 1000);
  }
}

function generateSummary(services) {
  const summary = { total: 0, operational: 0, issues: 0, critical: 0, categories: {} };

  Object.entries(services).forEach(([category, items]) => {
    summary.categories[category] = { total: items.length, healthy: 0, issues: 0 };

    items.forEach(item => {
      summary.total++;
      const status = item.status.toLowerCase();
      const hasProblem = item.problemStatement && item.problemStatement.trim();

      if (status.includes('poor') || status.includes('error') || status.includes('critical') || status.includes('down')) {
        summary.critical++;
        summary.categories[category].issues++;
      } else if (status.includes('warning') || status.includes('degraded') || status.includes('maintenance')) {
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

module.exports = router;