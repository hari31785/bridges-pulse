const express = require('express');
const router = express.Router();
const db = require('../db');

// Get current ops data (broadcast message)
router.get('/broadcast', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM broadcast WHERE id = 1');
    if (rows.length === 0) {
      return res.json({ message: '', severity: 'info', active: false, createdAt: null, updatedBy: '' });
    }
    res.json(rowToBroadcast(rows[0]));
  } catch (error) {
    res.json({ message: '', severity: 'info', active: false, createdAt: null, updatedBy: '' });
  }
});

// Set or update broadcast message
router.put('/broadcast', async (req, res) => {
  try {
    const { message, severity, updatedBy } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    const allowedSeverities = ['info', 'warning', 'critical'];
    const safeSeverity = allowedSeverities.includes(severity) ? severity : 'info';
    const safeUpdatedBy = typeof updatedBy === 'string' ? updatedBy.slice(0, 100) : '';
    const now = new Date().toISOString();

    const { rows } = await db.query(
      `INSERT INTO broadcast (id, message, severity, active, created_at, updated_by)
       VALUES (1, $1, $2, true, $3, $4)
       ON CONFLICT (id) DO UPDATE SET message = $1, severity = $2, active = true, created_at = $3, updated_by = $4
       RETURNING *`,
      [message.slice(0, 500), safeSeverity, now, safeUpdatedBy]
    );

    res.json({ success: true, broadcast: rowToBroadcast(rows[0]) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save broadcast message' });
  }
});

// Clear (deactivate) broadcast message
router.delete('/broadcast', async (req, res) => {
  try {
    await db.query(
      `INSERT INTO broadcast (id, message, severity, active, created_at, updated_by)
       VALUES (1, '', 'info', false, null, '')
       ON CONFLICT (id) DO UPDATE SET active = false`
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear broadcast message' });
  }
});

function rowToBroadcast(row) {
  return {
    message: row.message,
    severity: row.severity,
    active: row.active,
    createdAt: row.created_at,
    updatedBy: row.updated_by
  };
}

module.exports = router;
