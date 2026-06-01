/**
 * External API — Bridges Pulse
 * Authenticated endpoint for TestComplete (and other tools) to push
 * service status updates without needing to know category or internal IDs.
 *
 * Auth: X-API-Key header must match TC_API_KEY in .env
 *
 * POST /api/external/update
 * Body: { "updates": [ { "serviceId"|"serviceName", "status", "responseTime"?, "problemStatement"? } ] }
 *
 * Single update shorthand (no "updates" wrapper):
 * Body: { "serviceId"|"serviceName", "status", "responseTime"?, "problemStatement"? }
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');

const ALLOWED_STATUSES = [
  'Operational', 'OK', 'Running Normally', 'Average', 'Excellent',
  'Degraded', 'Poor', 'Maintenance', 'Down', 'Unknown'
];

// ── Auth middleware ──────────────────────────────────────────────────────────
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  const expected = process.env.TC_API_KEY;

  if (!expected) {
    return res.status(503).json({ error: 'API key not configured on server' });
  }
  if (!key) {
    return res.status(401).json({ error: 'Missing X-API-Key header' });
  }
  // Constant-time comparison to prevent timing attacks
  if (
    key.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(expected))
  ) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  next();
}

// ── Helper: resolve a single update item against the DB ──────────────────────
async function resolveService(item) {
  if (item.serviceId) {
    const { rows } = await db.query(
      'SELECT id, category FROM services WHERE id = $1',
      [item.serviceId]
    );
    return rows[0] || null;
  }
  if (item.serviceName) {
    const { rows } = await db.query(
      'SELECT id, category FROM services WHERE LOWER(name) = LOWER($1)',
      [item.serviceName]
    );
    return rows[0] || null;
  }
  return null;
}

// ── POST /api/external/update ────────────────────────────────────────────────
router.post('/update', requireApiKey, async (req, res) => {
  try {
    // Accept both single-object and { updates: [...] } envelope
    let updates = Array.isArray(req.body?.updates)
      ? req.body.updates
      : [req.body];

    if (!updates.length) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const results = [];

    for (const item of updates) {
      const { status, responseTime, problemStatement } = item;

      // Validate at least one identifier
      if (!item.serviceId && !item.serviceName) {
        results.push({ error: 'serviceId or serviceName is required', item });
        continue;
      }

      // Validate status
      if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
        results.push({
          error: `Invalid status "${status}". Allowed: ${ALLOWED_STATUSES.join(', ')}`,
          serviceId: item.serviceId || item.serviceName
        });
        continue;
      }

      // Resolve service
      const service = await resolveService(item);
      if (!service) {
        results.push({
          error: 'Service not found',
          serviceId: item.serviceId || item.serviceName
        });
        continue;
      }

      // Build UPDATE
      const now = new Date().toISOString();
      const setClauses = [];
      const values = [];
      let idx = 1;

      if (status !== undefined)           { setClauses.push(`status = $${idx++}`);             values.push(status); }
      if (responseTime !== undefined)     { setClauses.push(`response_time = $${idx++}`);       values.push(String(responseTime).slice(0, 20)); }
      if (problemStatement !== undefined) { setClauses.push(`problem_statement = $${idx++}`);   values.push(String(problemStatement).slice(0, 500)); }

      if (setClauses.length === 0) {
        results.push({ error: 'Nothing to update (no fields provided)', serviceId: service.id });
        continue;
      }

      setClauses.push(`last_updated = $${idx++}`);
      values.push(now);
      values.push(service.id);

      const { rows } = await db.query(
        `UPDATE services SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING id, name, category, status, response_time, problem_statement, last_updated`,
        values
      );

      const updated = rows[0];

      // Record history
      await db.query(
        `INSERT INTO history (timestamp, category, service_id, status, problem_statement, type)
         VALUES ($1, $2, $3, $4, $5, 'status_change')`,
        [now, updated.category, updated.id, updated.status, updated.problem_statement || '']
      );

      results.push({
        success: true,
        serviceId: updated.id,
        name: updated.name,
        category: updated.category,
        status: updated.status,
        responseTime: updated.response_time,
        problemStatement: updated.problem_statement,
        lastUpdated: updated.last_updated
      });
    }

    const allOk = results.every(r => r.success);
    res.status(allOk ? 200 : 207).json({ results });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/external/services  (read-only, no auth required) ───────────────
// Returns id, name, category so TestComplete can discover serviceIds.
router.get('/services', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, category, status, response_time, problem_statement, last_updated FROM services ORDER BY category, name'
    );
    res.json({
      timestamp: new Date().toISOString(),
      services: rows.map(r => ({
        serviceId: r.id,
        name: r.name,
        category: r.category,
        status: r.status,
        responseTime: r.response_time,
        problemStatement: r.problem_statement,
        lastUpdated: r.last_updated
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load services' });
  }
});

module.exports = router;
