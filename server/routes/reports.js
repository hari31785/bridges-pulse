const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');

const DATA_FILE = path.join(__dirname, '../data/services.json');
const HISTORY_FILE = path.join(__dirname, '../data/history.json');
const REPORTS_DIR = path.join(__dirname, '../reports');

// Generate uptime report
router.get('/uptime/:period?', async (req, res) => {
  try {
    const period = req.params.period || 'weekly';
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    const history = JSON.parse(data);
    
    const uptimeData = calculateUptime(history, period);
    
    res.json({
      period,
      generated: new Date().toISOString(),
      data: uptimeData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate uptime report' });
  }
});

// Generate SLA report
router.get('/sla/:period?', async (req, res) => {
  try {
    const period = req.params.period || 'monthly';
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    const history = JSON.parse(data);
    
    const slaData = calculateSLA(history, period);
    
    res.json({
      period,
      generated: new Date().toISOString(),
      slaTarget: 99.9, // 99.9% uptime target
      data: slaData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate SLA report' });
  }
});

// Generate incident summary
router.get('/incidents/:period?', async (req, res) => {
  try {
    const period = req.params.period || 'monthly';
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    const history = JSON.parse(data);
    
    const incidents = extractIncidents(history, period);
    
    res.json({
      period,
      generated: new Date().toISOString(),
      totalIncidents: incidents.length,
      data: incidents
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate incidents report' });
  }
});

// Generate comprehensive dashboard report
router.get('/dashboard/:period?', async (req, res) => {
  try {
    const period = req.params.period || 'daily';
    
    // Get current status
    const servicesData = await fs.readFile(DATA_FILE, 'utf8');
    const services = JSON.parse(servicesData);
    
    // Get historical data
    const historyData = await fs.readFile(HISTORY_FILE, 'utf8');
    const history = JSON.parse(historyData);
    
    // Generate comprehensive report
    const report = {
      generated: new Date().toISOString(),
      period,
      summary: generateServiceSummary(services),
      uptime: calculateUptime(history, period),
      incidents: extractIncidents(history, period),
      trends: calculateTrends(history, period),
      recommendations: generateRecommendations(services, history)
    };
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate dashboard report' });
  }
});

// Save report to file
router.post('/save/:type', async (req, res) => {
  try {
    const reportType = req.params.type;
    const { data, filename } = req.body;
    
    // Ensure reports directory exists
    await fs.mkdir(REPORTS_DIR, { recursive: true });
    
    const reportPath = path.join(REPORTS_DIR, filename || `${reportType}_${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(data, null, 2));
    
    res.json({ 
      success: true, 
      path: reportPath,
      filename: path.basename(reportPath)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save report' });
  }
});

// Helper functions
function calculateUptime(history, period) {
  const now = moment();
  let startTime;
  
  switch (period) {
    case 'daily':
      startTime = now.clone().subtract(1, 'day');
      break;
    case 'weekly':
      startTime = now.clone().subtract(1, 'week');
      break;
    case 'monthly':
      startTime = now.clone().subtract(1, 'month');
      break;
    default:
      startTime = now.clone().subtract(1, 'week');
  }
  
  const relevantHistory = history.filter(entry => 
    moment(entry.timestamp).isAfter(startTime)
  );
  
  const services = {};
  
  relevantHistory.forEach(entry => {
    const key = `${entry.category}.${entry.serviceId}`;
    if (!services[key]) {
      services[key] = {
        name: entry.serviceId,
        category: entry.category,
        totalTime: 0,
        downTime: 0,
        incidents: 0
      };
    }
    
    if (isDownStatus(entry.status)) {
      services[key].downTime += 1; // Simplified calculation
      services[key].incidents += 1;
    }
    services[key].totalTime += 1;
  });
  
  // Calculate uptime percentage
  Object.values(services).forEach(service => {
    service.uptime = service.totalTime > 0 
      ? ((service.totalTime - service.downTime) / service.totalTime) * 100 
      : 100;
    service.uptime = Math.round(service.uptime * 100) / 100; // Round to 2 decimal places
  });
  
  return Object.values(services);
}

function calculateSLA(history, period) {
  const uptimeData = calculateUptime(history, period);
  const slaTarget = 99.9;
  
  return uptimeData.map(service => ({
    ...service,
    slaTarget,
    slaStatus: service.uptime >= slaTarget ? 'PASS' : 'FAIL',
    slaGap: slaTarget - service.uptime
  }));
}

function extractIncidents(history, period) {
  const now = moment();
  let startTime;
  
  switch (period) {
    case 'daily':
      startTime = now.clone().subtract(1, 'day');
      break;
    case 'weekly':
      startTime = now.clone().subtract(1, 'week');
      break;
    case 'monthly':
      startTime = now.clone().subtract(1, 'month');
      break;
    default:
      startTime = now.clone().subtract(1, 'month');
  }
  
  return history
    .filter(entry => 
      moment(entry.timestamp).isAfter(startTime) && 
      isDownStatus(entry.status)
    )
    .map(entry => ({
      timestamp: entry.timestamp,
      service: `${entry.category}.${entry.serviceId}`,
      status: entry.status,
      problem: entry.problemStatement,
      severity: getSeverity(entry.status)
    }));
}

function calculateTrends(history, period) {
  // Group incidents by day/hour
  const trends = {};
  const now = moment();
  
  history.forEach(entry => {
    const time = moment(entry.timestamp);
    if (time.isAfter(now.clone().subtract(7, 'days'))) {
      const day = time.format('YYYY-MM-DD');
      if (!trends[day]) trends[day] = { incidents: 0, services: new Set() };
      
      if (isDownStatus(entry.status)) {
        trends[day].incidents++;
        trends[day].services.add(`${entry.category}.${entry.serviceId}`);
      }
    }
  });
  
  return Object.entries(trends).map(([date, data]) => ({
    date,
    incidents: data.incidents,
    affectedServices: data.services.size
  }));
}

function generateServiceSummary(services) {
  let total = 0;
  let healthy = 0;
  let warnings = 0;
  let critical = 0;
  
  Object.values(services).forEach(category => {
    category.forEach(service => {
      total++;
      const status = service.status.toLowerCase();
      
      if (status.includes('operational') || status === 'ok' || status.includes('running')) {
        healthy++;
      } else if (status.includes('average') || status.includes('warning')) {
        warnings++;
      } else {
        critical++;
      }
    });
  });
  
  return {
    total,
    healthy,
    warnings,
    critical,
    healthPercentage: Math.round((healthy / total) * 100)
  };
}

function generateRecommendations(services, history) {
  const recommendations = [];
  
  // Analyze recent incidents
  const recentIncidents = history.filter(entry => 
    moment(entry.timestamp).isAfter(moment().subtract(24, 'hours')) &&
    isDownStatus(entry.status)
  );
  
  if (recentIncidents.length > 5) {
    recommendations.push({
      type: 'high_incident_rate',
      priority: 'high',
      message: `${recentIncidents.length} incidents in the last 24 hours. Consider investigating recurring issues.`,
      action: 'Review incident patterns and root causes'
    });
  }
  
  // Check for services with problems
  Object.entries(services).forEach(([category, items]) => {
    items.forEach(service => {
      if (service.problemStatement && service.problemStatement.trim()) {
        recommendations.push({
          type: 'service_issue',
          priority: getSeverity(service.status).toLowerCase(),
          message: `${service.name}: ${service.problemStatement}`,
          action: 'Address service-specific issue'
        });
      }
    });
  });
  
  return recommendations;
}

function isDownStatus(status) {
  const s = status.toLowerCase();
  return s.includes('error') || s.includes('critical') || s.includes('down') || 
         s.includes('poor') || s.includes('failed');
}

function getSeverity(status) {
  const s = status.toLowerCase();
  if (s.includes('critical') || s.includes('error') || s.includes('down')) return 'CRITICAL';
  if (s.includes('poor') || s.includes('warning')) return 'HIGH';
  if (s.includes('average')) return 'MEDIUM';
  return 'LOW';
}

module.exports = router;