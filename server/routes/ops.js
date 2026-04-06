const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const OPS_FILE = path.join(__dirname, '../data/ops.json');

// Get current ops data (broadcast message)
router.get('/broadcast', async (req, res) => {
  try {
    const data = await fs.readFile(OPS_FILE, 'utf8');
    const ops = JSON.parse(data);
    res.json(ops.broadcast);
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

    let ops;
    try {
      const data = await fs.readFile(OPS_FILE, 'utf8');
      ops = JSON.parse(data);
    } catch {
      ops = {};
    }

    ops.broadcast = {
      message: message.slice(0, 500),
      severity: safeSeverity,
      active: true,
      createdAt: new Date().toISOString(),
      updatedBy: safeUpdatedBy
    };

    await fs.writeFile(OPS_FILE, JSON.stringify(ops, null, 2));
    res.json({ success: true, broadcast: ops.broadcast });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save broadcast message' });
  }
});

// Clear (deactivate) broadcast message
router.delete('/broadcast', async (req, res) => {
  try {
    let ops;
    try {
      const data = await fs.readFile(OPS_FILE, 'utf8');
      ops = JSON.parse(data);
    } catch {
      ops = {};
    }

    ops.broadcast = {
      message: '',
      severity: 'info',
      active: false,
      createdAt: null,
      updatedBy: ''
    };

    await fs.writeFile(OPS_FILE, JSON.stringify(ops, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear broadcast message' });
  }
});

module.exports = router;
