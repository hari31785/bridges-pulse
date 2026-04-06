/**
 * Modals Manager for Bridges Pulse
 * Handles all modal dialogs: service details, settings, reports
 */

class Modals {
    constructor() {
        this.overlay = document.getElementById('modal-overlay');
        this.activeModal = null;

        this.bindGlobalEvents();
    }

    bindGlobalEvents() {
        // Close modal on overlay click
        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.closeAll();
            });
        }

        // Close modal buttons
        document.querySelectorAll('.modal-close').forEach((btn) => {
            btn.addEventListener('click', () => this.closeAll());
        });

        // ESC key closes modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAll();
        });

        // Header button wiring
        const settingsBtn = document.getElementById('settings-btn');
        const reportsBtn = document.getElementById('reports-btn');

        if (settingsBtn) settingsBtn.addEventListener('click', () => this.showSettings());
        if (reportsBtn) reportsBtn.addEventListener('click', () => this.showReports());

        // Export dropdown
        const exportBtn = document.getElementById('export-btn');
        const exportDropdown = document.getElementById('export-dropdown');
        if (exportBtn && exportDropdown) {
            exportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = exportDropdown.classList.contains('open');
                exportDropdown.classList.remove('open');
                if (!isOpen) {
                    const rect = exportBtn.getBoundingClientRect();
                    exportDropdown.style.top = (rect.bottom + 4) + 'px';
                    exportDropdown.style.left = rect.left + 'px';
                    exportDropdown.style.right = 'auto';
                    exportDropdown.classList.add('open');
                    if (window.feather) feather.replace();
                }
            });
            document.addEventListener('click', () => exportDropdown.classList.remove('open'));
            exportDropdown.addEventListener('click', (e) => e.stopPropagation());
        }

        document.getElementById('export-json')?.addEventListener('click', () => {
            exportDropdown.classList.remove('open');
            this.exportAsJSON();
        });
        document.getElementById('export-pdf')?.addEventListener('click', () => {
            exportDropdown.classList.remove('open');
            this.exportAsPDF();
        });
        document.getElementById('export-image')?.addEventListener('click', () => {
            exportDropdown.classList.remove('open');
            this.exportAsImage();
        });
    }

    openModal(modalId) {
        this.closeAll(false);
        const modal = document.getElementById(modalId);
        if (!modal) return;

        this.overlay.style.display = 'flex';
        modal.style.display = 'flex';
        modal.classList.add('scale-in');
        this.activeModal = modal;
        document.body.style.overflow = 'hidden';

        // Replace feather icons inside modal
        if (window.feather) feather.replace();
    }

    closeAll(animate = true) {
        if (!this.activeModal) return;

        if (animate) {
            this.activeModal.classList.add('modal-closing');
            setTimeout(() => {
                if (this.overlay) this.overlay.style.display = 'none';
                document.querySelectorAll('.modal').forEach((m) => {
                    m.style.display = 'none';
                    m.classList.remove('scale-in', 'modal-closing');
                });
                this.activeModal = null;
                document.body.style.overflow = '';
            }, 200);
        } else {
            if (this.overlay) this.overlay.style.display = 'none';
            document.querySelectorAll('.modal').forEach((m) => {
                m.style.display = 'none';
                m.classList.remove('scale-in');
            });
            this.activeModal = null;
            document.body.style.overflow = '';
        }
    }

    // ── Service Details Modal ──────────────────────────────────────────────

    showServiceDetails(service) {
        const modal = document.getElementById('service-modal');
        const title = document.getElementById('service-modal-title');
        const content = document.getElementById('service-modal-content');

        if (!modal || !title || !content) return;

        const statusType = Utils.getStatusType(service.status);
        const dotClass = Utils.getDotClass(service.status);
        const icon = Utils.getServiceIcon(service.icon);
        const lastUpdated = service.lastUpdated ? new Date(service.lastUpdated) : new Date();

        title.textContent = Utils.sanitizeHtml(service.name);

        content.innerHTML = `
            <div class="service-detail">
                <div class="detail-hero ${statusType}">
                    <div class="detail-icon">
                        <i data-feather="${icon}"></i>
                    </div>
                    <div class="detail-status">
                        <div class="status-dot ${dotClass}"></div>
                        <span class="status-label ${Utils.getStatusClass(service.status)}">${Utils.sanitizeHtml(service.status)}</span>
                    </div>
                </div>

                <div class="detail-grid">
                    ${this.detailRow('Category', service.category || '—')}
                    ${this.detailRow('Priority', service.priority || '—', `priority priority-${service.priority}`)}
                    ${this.detailRow('Response Time', Utils.formatResponseTime(service.responseTime))}
                    ${this.detailRow('SLA Target', service.slaTarget ? `${service.slaTarget}%` : '—')}
                    ${this.detailRow('Owner / Team', service.owner || '—')}
                    ${this.detailRow('Last Updated', Utils.formatDate(lastUpdated))}
                </div>

                ${service.dependencies && service.dependencies.length > 0 ? `
                <div class="detail-section">
                    <h4>Dependencies</h4>
                    <div class="dep-list">
                        ${service.dependencies.map(d => `<span class="dep-tag">${Utils.sanitizeHtml(d)}</span>`).join('')}
                    </div>
                </div>
                ` : ''}

                ${service.problemStatement && service.problemStatement.trim() ? `
                <div class="detail-section">
                    <h4><i data-feather="alert-triangle"></i> Active Issue</h4>
                    <div class="issue-box">
                        ${Utils.sanitizeHtml(service.problemStatement)}
                    </div>
                </div>
                ` : ''}

                ${service.metrics ? `
                <div class="detail-section">
                    <h4>Live Metrics</h4>
                    <div class="metrics-grid">
                        ${service.metrics.cpuUsage !== undefined ? this.metricBar('CPU Usage', service.metrics.cpuUsage, '%') : ''}
                        ${service.metrics.memoryUsage !== undefined ? this.metricBar('Memory Usage', service.metrics.memoryUsage, '%') : ''}
                        ${service.metrics.connections !== undefined ? `
                        <div class="metric-stat">
                            <span class="metric-stat-label">Active Connections</span>
                            <span class="metric-stat-value">${service.metrics.connections} / ${service.metrics.maxConnections || '∞'}</span>
                        </div>` : ''}
                    </div>
                </div>
                ` : ''}

                <div class="detail-actions">
                    <button class="control-btn" onclick="window.modals.showServiceHistory(${JSON.stringify(service).replace(/"/g, '&quot;')})">
                        <i data-feather="activity"></i> View History
                    </button>
                    <button class="control-btn primary" onclick="window.modals.closeAll()">
                        Close
                    </button>
                </div>
            </div>
        `;

        this.openModal('service-modal');
    }

    async showServiceHistory(service) {
        const content = document.getElementById('service-modal-content');
        const title = document.getElementById('service-modal-title');
        if (!content) return;

        title.textContent = `${service.name} — History`;

        content.innerHTML = `<div class="loading-inline"><div class="spinner-ring"></div><p>Loading history...</p></div>`;
        this.openModal('service-modal');

        try {
            const data = await window.api.getServiceHistory('7d');
            const serviceHistory = data.data.filter(
                (e) => e.serviceId === service.id && e.category === service.category
            );

            if (serviceHistory.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <i data-feather="inbox"></i>
                        <h3>No history found</h3>
                        <p>No status changes recorded for this service in the last 7 days.</p>
                    </div>
                `;
            } else {
                content.innerHTML = `
                    <div class="history-timeline">
                        ${serviceHistory.reverse().map((entry) => `
                        <div class="timeline-item ${Utils.getStatusType(entry.status)}">
                            <div class="timeline-dot ${Utils.getDotClass(entry.status)}"></div>
                            <div class="timeline-content">
                                <div class="timeline-header">
                                    <span class="timeline-status ${Utils.getStatusClass(entry.status)}">${Utils.sanitizeHtml(entry.status)}</span>
                                    <span class="timeline-time">${Utils.formatDate(new Date(entry.timestamp), { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                </div>
                                ${entry.problemStatement ? `<p class="timeline-desc">${Utils.sanitizeHtml(entry.problemStatement)}</p>` : ''}
                                ${entry.resolvedBy ? `<span class="timeline-tag">Resolved by: ${Utils.sanitizeHtml(entry.resolvedBy)}</span>` : ''}
                                ${entry.type === 'planned_maintenance' ? `<span class="timeline-tag maintenance">Planned Maintenance</span>` : ''}
                            </div>
                        </div>
                        `).join('')}
                    </div>
                    <div class="detail-actions">
                        <button class="control-btn primary" onclick="window.modals.closeAll()">Close</button>
                    </div>
                `;
            }

            if (window.feather) feather.replace();
        } catch (error) {
            content.innerHTML = `<p class="error-text">Failed to load history.</p>`;
        }
    }

    // ── Reports Modal ──────────────────────────────────────────────────────

    async showReports() {
        const content = document.querySelector('#reports-modal .modal-content');
        if (!content) return;

        content.innerHTML = `<div class="loading-inline"><div class="spinner-ring"></div><p>Generating report...</p></div>`;
        this.openModal('reports-modal');

        try {
            const report = await window.api.getDashboardReport('daily');

            content.innerHTML = `
                <div class="reports-container">
                    <div class="report-tabs">
                        <button class="report-tab active" data-tab="summary">Summary</button>
                        <button class="report-tab" data-tab="incidents">Incidents</button>
                        <button class="report-tab" data-tab="sla">SLA</button>
                    </div>

                    <div class="report-body">
                        <!-- Summary Tab -->
                        <div class="tab-panel active" id="tab-summary">
                            <div class="report-stats">
                                <div class="report-stat">
                                    <span class="stat-value">${report.summary.total}</span>
                                    <span class="stat-label">Total Services</span>
                                </div>
                                <div class="report-stat healthy">
                                    <span class="stat-value">${report.summary.healthy}</span>
                                    <span class="stat-label">Healthy</span>
                                </div>
                                <div class="report-stat warning">
                                    <span class="stat-value">${report.summary.warnings}</span>
                                    <span class="stat-label">Warnings</span>
                                </div>
                                <div class="report-stat critical">
                                    <span class="stat-value">${report.summary.critical}</span>
                                    <span class="stat-label">Critical</span>
                                </div>
                            </div>

                            <div class="health-bar-container">
                                <div class="health-bar-label">
                                    <span>Overall Health</span>
                                    <strong>${report.summary.healthPercentage}%</strong>
                                </div>
                                <div class="health-bar">
                                    <div class="health-bar-fill" style="width: ${report.summary.healthPercentage}%"></div>
                                </div>
                            </div>

                            ${report.recommendations && report.recommendations.length > 0 ? `
                            <div class="recommendations">
                                <h4>Recommendations</h4>
                                ${report.recommendations.slice(0, 5).map((rec) => `
                                <div class="recommendation ${rec.priority}">
                                    <i data-feather="${rec.priority === 'high' ? 'alert-triangle' : 'info'}"></i>
                                    <div>
                                        <p>${Utils.sanitizeHtml(rec.message)}</p>
                                        <small>${Utils.sanitizeHtml(rec.action)}</small>
                                    </div>
                                </div>
                                `).join('')}
                            </div>
                            ` : `<p class="all-clear"><i data-feather="check-circle"></i> All systems healthy. No recommendations at this time.</p>`}
                        </div>

                        <!-- Incidents Tab -->
                        <div class="tab-panel" id="tab-incidents" style="display:none">
                            ${report.incidents && report.incidents.length > 0 ? `
                            <table class="report-table">
                                <thead>
                                    <tr><th>Time</th><th>Service</th><th>Status</th><th>Severity</th></tr>
                                </thead>
                                <tbody>
                                    ${report.incidents.slice(0, 20).map((inc) => `
                                    <tr>
                                        <td class="mono">${new Date(inc.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                        <td>${Utils.sanitizeHtml(inc.service)}</td>
                                        <td><span class="${Utils.getStatusClass(inc.status)}">${Utils.sanitizeHtml(inc.status)}</span></td>
                                        <td><span class="severity-badge ${inc.severity?.toLowerCase()}">${Utils.sanitizeHtml(inc.severity || 'LOW')}</span></td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ` : `<p class="all-clear"><i data-feather="check-circle"></i> No incidents recorded in this period.</p>`}
                        </div>

                        <!-- SLA Tab -->
                        <div class="tab-panel" id="tab-sla" style="display:none">
                            ${report.uptime && report.uptime.length > 0 ? `
                            <table class="report-table">
                                <thead>
                                    <tr><th>Service</th><th>Uptime</th><th>Incidents</th></tr>
                                </thead>
                                <tbody>
                                    ${report.uptime.slice(0, 20).map((s) => `
                                    <tr>
                                        <td>${Utils.sanitizeHtml(s.name || s.serviceId)}</td>
                                        <td>
                                            <div class="uptime-cell">
                                                <div class="mini-bar">
                                                    <div class="mini-bar-fill ${s.uptime >= 99 ? 'good' : s.uptime >= 95 ? 'warning' : 'poor'}" style="width: ${Math.min(s.uptime, 100)}%"></div>
                                                </div>
                                                <span class="mono">${s.uptime?.toFixed(2) || '100.00'}%</span>
                                            </div>
                                        </td>
                                        <td class="mono">${s.incidents || 0}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ` : `<p class="all-clear"><i data-feather="check-circle"></i> All services meeting SLA targets.</p>`}
                        </div>
                    </div>

                    <div class="report-footer">
                        <span class="report-generated">Generated: ${new Date(report.generated).toLocaleString()}</span>
                        <button class="control-btn primary" onclick="window.modals.downloadReport(${JSON.stringify(report).replace(/"/g, '&quot;')})">
                            <i data-feather="download"></i> Download Report
                        </button>
                    </div>
                </div>
            `;

            // Wire up tab switching
            content.querySelectorAll('.report-tab').forEach((tab) => {
                tab.addEventListener('click', () => {
                    content.querySelectorAll('.report-tab').forEach((t) => t.classList.remove('active'));
                    content.querySelectorAll('.tab-panel').forEach((p) => (p.style.display = 'none'));
                    tab.classList.add('active');
                    const panel = content.querySelector(`#tab-${tab.dataset.tab}`);
                    if (panel) panel.style.display = '';
                });
            });

            if (window.feather) feather.replace();
        } catch (error) {
            console.error('Failed to load report:', error);
            content.innerHTML = `<p class="error-text">Failed to generate report. Please try again.</p>`;
        }
    }

    downloadReport(report) {
        const filename = `bridges-pulse-report-${new Date().toISOString().slice(0, 10)}.json`;
        Utils.downloadFile(report, filename);
        Components.createToast(`Report downloaded as ${filename}`, 'success');
    }

    // ── Settings Modal ─────────────────────────────────────────────────────

    async showSettings() {
        const content = document.querySelector('#settings-modal .modal-content');
        if (!content) return;

        content.innerHTML = `<div class="loading-inline"><div class="spinner-ring"></div><p>Loading settings...</p></div>`;
        this.openModal('settings-modal');

        try {
            const config = await window.api.getConfig();
            const currentTheme = Utils.storage.get('bp_theme', 'light');

            content.innerHTML = `
                <div class="settings-form">
                    <div class="settings-section">
                        <h4>Appearance</h4>
                        <div class="setting-row">
                            <label>Theme</label>
                            <div class="theme-picker">
                                <button class="theme-option ${currentTheme === 'light' ? 'active' : ''}" data-theme="light">
                                    <i data-feather="sun"></i> Light
                                </button>
                                <button class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark">
                                    <i data-feather="moon"></i> Dark
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h4>Refresh</h4>
                        <div class="setting-row">
                            <label for="refresh-interval">Auto Refresh Interval</label>
                            <select id="refresh-interval" class="setting-select">
                                <option value="15000" ${config.refreshInterval === 15000 ? 'selected' : ''}>15 seconds</option>
                                <option value="30000" ${config.refreshInterval === 30000 ? 'selected' : ''}>30 seconds</option>
                                <option value="60000" ${config.refreshInterval === 60000 ? 'selected' : ''}>1 minute</option>
                                <option value="300000" ${config.refreshInterval === 300000 ? 'selected' : ''}>5 minutes</option>
                                <option value="0">Disabled</option>
                            </select>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h4>Dashboard</h4>
                        <div class="setting-row">
                            <label>Show Summary Bar</label>
                            <label class="toggle">
                                <input type="checkbox" id="show-summary" ${config.dashboard?.showSummary !== false ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="setting-row">
                            <label>Show Response Times</label>
                            <label class="toggle">
                                <input type="checkbox" id="show-metrics" ${config.dashboard?.showMetrics !== false ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="setting-row">
                            <label>Compact Card Mode</label>
                            <label class="toggle">
                                <input type="checkbox" id="compact-mode" ${config.dashboard?.compactMode ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h4>Data Management</h4>
                        <div class="setting-row">
                            <label>Export Configuration</label>
                            <button class="control-btn" onclick="window.modals.exportConfig()">
                                <i data-feather="download"></i> Export
                            </button>
                        </div>
                        <div class="setting-row">
                            <label>Import Configuration</label>
                            <button class="control-btn" onclick="document.getElementById('import-file').click()">
                                <i data-feather="upload"></i> Import
                            </button>
                            <input type="file" id="import-file" accept=".json" style="display:none" onchange="window.modals.importConfig(event)">
                        </div>
                    </div>

                    <div class="settings-footer">
                        <button class="control-btn" onclick="window.modals.closeAll()">Cancel</button>
                        <button class="control-btn primary" onclick="window.modals.saveSettings()">
                            <i data-feather="save"></i> Save Settings
                        </button>
                    </div>
                </div>
            `;

            // Theme picker live preview
            content.querySelectorAll('.theme-option').forEach((btn) => {
                btn.addEventListener('click', () => {
                    content.querySelectorAll('.theme-option').forEach((b) => b.classList.remove('active'));
                    btn.classList.add('active');
                    const theme = btn.dataset.theme;
                    document.body.className = `theme-${theme}`;
                    Utils.storage.set('bp_theme', theme);
                    if (window.appManager) window.appManager.updateThemeIcon(theme);
                });
            });

            if (window.feather) feather.replace();
        } catch (error) {
            content.innerHTML = `<p class="error-text">Failed to load settings.</p>`;
        }
    }

    async saveSettings() {
        try {
            const refreshInterval = parseInt(document.getElementById('refresh-interval')?.value || '30000');
            const showSummary = document.getElementById('show-summary')?.checked !== false;
            const showMetrics = document.getElementById('show-metrics')?.checked !== false;
            const compactMode = document.getElementById('compact-mode')?.checked || false;

            const config = await window.api.getConfig();
            config.refreshInterval = refreshInterval;
            config.dashboard.showSummary = showSummary;
            config.dashboard.showMetrics = showMetrics;
            config.dashboard.compactMode = compactMode;

            await window.api.updateConfig(config);

            // Apply refresh interval
            if (window.dashboard) {
                window.dashboard.refreshInterval = refreshInterval;
                if (refreshInterval > 0) {
                    window.dashboard.startAutoRefresh();
                } else {
                    window.dashboard.stopAutoRefresh();
                }
            }

            this.closeAll();
            Components.createToast('Settings saved successfully', 'success', 3000);
        } catch (error) {
            Components.createToast('Failed to save settings', 'error');
        }
    }

    async exportConfig() {
        try {
            const data = await window.api.exportConfig();
            const filename = `bridges-pulse-config-${new Date().toISOString().slice(0, 10)}.json`;
            Utils.downloadFile(data, filename);
            Components.createToast(`Config exported as ${filename}`, 'success');
        } catch (error) {
            Components.createToast('Failed to export config', 'error');
        }
    }

    async importConfig(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            await window.api.importConfig(data);
            this.closeAll();
            Components.createToast('Configuration imported! Refreshing...', 'success');
            setTimeout(() => window.dashboard?.refresh(), 1000);
        } catch (error) {
            Components.createToast('Failed to import config. Invalid file format.', 'error');
        }
    }

    // ── Export Dashboard ───────────────────────────────────────────────────

    async exportAsJSON() {
        try {
            Components.createToast('Preparing export...', 'info', 2000);
            const report = await window.api.getDashboardReport('daily');
            const filename = `bridges-pulse-export-${new Date().toISOString().slice(0, 10)}.json`;
            Utils.downloadFile(report, filename);
            Components.createToast(`Exported as ${filename}`, 'success');
        } catch (error) {
            Components.createToast('Export failed. Please try again.', 'error');
        }
    }

    exportAsPDF() {
        const style = document.createElement('style');
        style.id = 'print-override';
        style.textContent = `
            @media print {
                .header-actions, .filters-bar, #modal-overlay { display: none !important; }
                .main-content { padding: 0 !important; }
                body { background: white !important; }
            }
        `;
        document.head.appendChild(style);
        window.print();
        setTimeout(() => document.getElementById('print-override')?.remove(), 1000);
    }

    async exportAsImage() {
        if (!window.html2canvas) {
            Components.createToast('Image export library not loaded. Please refresh.', 'error');
            return;
        }
        Components.createToast('Capturing dashboard...', 'info', 3000);
        try {
            const target = document.querySelector('.main-content') || document.body;
            const canvas = await html2canvas(target, {
                scale: 2,
                useCORS: true,
                backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg-primary').trim() || '#ffffff'
            });
            const link = document.createElement('a');
            link.download = `bridges-pulse-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            Components.createToast('Image downloaded', 'success');
        } catch (error) {
            Components.createToast('Image export failed. Please try again.', 'error');
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    detailRow(label, value, valueClass = '') {
        return `
            <div class="detail-row">
                <span class="detail-label">${Utils.sanitizeHtml(label)}</span>
                <span class="detail-value ${valueClass}">${Utils.sanitizeHtml(String(value))}</span>
            </div>
        `;
    }

    metricBar(label, value, unit) {
        const color = value >= 80 ? '#ef4444' : value >= 60 ? '#fbbf24' : '#10b981';
        return `
            <div class="metric-bar-item">
                <div class="metric-bar-header">
                    <span>${Utils.sanitizeHtml(label)}</span>
                    <strong>${value}${unit}</strong>
                </div>
                <div class="metric-bar-track">
                    <div class="metric-bar-fill" style="width: ${value}%; background: ${color}"></div>
                </div>
            </div>
        `;
    }
}

// Modal styles
const modalStyles = `
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: var(--z-modal-backdrop);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
}

.modal {
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    width: 100%;
    max-width: 640px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    z-index: var(--z-modal);
    overflow: hidden;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-lg) var(--space-xl);
    border-bottom: 1px solid var(--border-primary);
    flex-shrink: 0;
}

.modal-header h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.modal-close {
    width: 32px;
    height: 32px;
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-close:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.modal-content {
    padding: var(--space-xl);
    overflow-y: auto;
    flex: 1;
}

.modal-closing {
    animation: fadeOut 0.2s ease-out forwards;
}

@keyframes fadeOut {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(0.97); }
}

/* Service Detail */
.detail-hero {
    display: flex;
    align-items: center;
    gap: var(--space-lg);
    padding: var(--space-lg);
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-lg);
}

.detail-hero.healthy { border-left: 4px solid var(--status-operational); }
.detail-hero.warning { border-left: 4px solid var(--status-average); }
.detail-hero.critical { border-left: 4px solid var(--status-critical); }

.detail-icon {
    width: 48px;
    height: 48px;
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    font-size: 22px;
}

.detail-status {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
}

.status-label {
    font-size: 1rem;
    font-weight: 600;
}

.detail-grid {
    margin-bottom: var(--space-lg);
}

.detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) 0;
    border-bottom: 1px solid var(--border-primary);
}

.detail-row:last-child { border-bottom: none; }

.detail-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.detail-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    font-family: var(--font-mono);
}

.detail-section {
    margin-bottom: var(--space-lg);
}

.detail-section h4 {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    margin-bottom: var(--space-md);
}

.dep-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
}

.dep-tag {
    padding: 4px 10px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-family: var(--font-mono);
    color: var(--text-secondary);
}

.issue-box {
    padding: var(--space-md);
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    color: var(--text-primary);
    line-height: 1.5;
}

.metrics-grid { display: flex; flex-direction: column; gap: var(--space-md); }

.metric-bar-item { display: flex; flex-direction: column; gap: 6px; }
.metric-bar-header { display: flex; justify-content: space-between; font-size: 0.875rem; color: var(--text-secondary); }
.metric-bar-track { height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; }
.metric-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }

.metric-stat { display: flex; justify-content: space-between; font-size: 0.875rem; }
.metric-stat-label { color: var(--text-secondary); }
.metric-stat-value { font-family: var(--font-mono); font-weight: 600; color: var(--text-primary); }

.detail-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    padding-top: var(--space-lg);
    border-top: 1px solid var(--border-primary);
    margin-top: var(--space-lg);
}

/* History Timeline */
.history-timeline { display: flex; flex-direction: column; gap: var(--space-lg); margin-bottom: var(--space-lg); }

.timeline-item {
    display: flex;
    gap: var(--space-md);
    padding: var(--space-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border-left: 3px solid var(--border-primary);
}

.timeline-item.healthy { border-left-color: var(--status-operational); }
.timeline-item.warning { border-left-color: var(--status-average); }
.timeline-item.critical { border-left-color: var(--status-critical); }

.timeline-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }

.timeline-content { flex: 1; }
.timeline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.timeline-status { font-size: 0.875rem; font-weight: 600; }
.timeline-time { font-size: 0.75rem; color: var(--text-tertiary); font-family: var(--font-mono); }
.timeline-desc { font-size: 0.875rem; color: var(--text-secondary); margin: 4px 0 0; }
.timeline-tag { display: inline-block; margin-top: 4px; padding: 2px 8px; background: var(--bg-tertiary); border-radius: var(--radius-sm); font-size: 0.75rem; color: var(--text-secondary); }
.timeline-tag.maintenance { background: rgba(59,130,246,0.1); color: var(--primary); }

/* Reports */
.reports-container { display: flex; flex-direction: column; gap: var(--space-lg); }
.report-tabs { display: flex; gap: var(--space-sm); border-bottom: 1px solid var(--border-primary); padding-bottom: var(--space-md); }

.report-tab {
    padding: var(--space-sm) var(--space-lg);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.report-tab.active { background: var(--primary); border-color: var(--primary); color: white; }

.report-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-md); margin-bottom: var(--space-lg); }

.report-stat {
    padding: var(--space-lg);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    text-align: center;
    border: 1px solid var(--border-primary);
}

.report-stat.healthy { border-top: 3px solid var(--status-operational); }
.report-stat.warning { border-top: 3px solid var(--status-average); }
.report-stat.critical { border-top: 3px solid var(--status-critical); }

.stat-value { display: block; font-size: 2rem; font-weight: 700; font-family: var(--font-mono); color: var(--text-primary); }
.stat-label { font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }

.health-bar-container { margin-bottom: var(--space-lg); }
.health-bar-label { display: flex; justify-content: space-between; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: var(--space-sm); }
.health-bar { height: 12px; background: var(--bg-tertiary); border-radius: 6px; overflow: hidden; }
.health-bar-fill { height: 100%; background: linear-gradient(90deg, var(--status-operational), var(--secondary)); border-radius: 6px; transition: width 1s ease; }

.recommendations { display: flex; flex-direction: column; gap: var(--space-sm); }
.recommendations h4 { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-sm); }

.recommendation {
    display: flex;
    gap: var(--space-md);
    padding: var(--space-md);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border-left: 3px solid var(--border-primary);
    font-size: 0.875rem;
}

.recommendation.high { border-left-color: var(--status-average); }
.recommendation.critical { border-left-color: var(--status-critical); }
.recommendation p { margin: 0; color: var(--text-primary); }
.recommendation small { color: var(--text-secondary); }

.all-clear {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-xl);
    color: var(--status-operational);
    font-weight: 500;
    justify-content: center;
}

.report-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.report-table th { padding: var(--space-sm) var(--space-md); background: var(--bg-secondary); color: var(--text-secondary); font-weight: 600; text-align: left; border-bottom: 1px solid var(--border-primary); }
.report-table td { padding: var(--space-sm) var(--space-md); border-bottom: 1px solid var(--border-primary); color: var(--text-primary); }
.report-table tr:last-child td { border-bottom: none; }

.severity-badge { padding: 2px 8px; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 600; }
.severity-badge.critical { background: rgba(239,68,68,0.1); color: var(--status-critical); }
.severity-badge.high { background: rgba(251,191,36,0.1); color: var(--status-average); }
.severity-badge.medium { background: rgba(59,130,246,0.1); color: var(--primary); }
.severity-badge.low { background: var(--bg-tertiary); color: var(--text-secondary); }

.uptime-cell { display: flex; align-items: center; gap: var(--space-sm); }
.mini-bar { width: 80px; height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; }
.mini-bar-fill { height: 100%; border-radius: 3px; }
.mini-bar-fill.good { background: var(--status-operational); }
.mini-bar-fill.warning { background: var(--status-average); }
.mini-bar-fill.poor { background: var(--status-critical); }

.report-footer { display: flex; justify-content: space-between; align-items: center; padding-top: var(--space-lg); border-top: 1px solid var(--border-primary); }
.report-generated { font-size: 0.75rem; color: var(--text-tertiary); font-family: var(--font-mono); }

/* Settings */
.settings-form { display: flex; flex-direction: column; gap: var(--space-xl); }
.settings-section h4 { font-size: 0.875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: var(--space-md); padding-bottom: var(--space-sm); border-bottom: 1px solid var(--border-primary); }
.setting-row { display: flex; justify-content: space-between; align-items: center; padding: var(--space-sm) 0; }
.setting-row label { font-size: 0.875rem; color: var(--text-primary); }

.theme-picker { display: flex; gap: var(--space-sm); }
.theme-option { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-sm) var(--space-md); border: 1px solid var(--border-primary); border-radius: var(--radius-md); background: var(--bg-secondary); color: var(--text-secondary); font-size: 0.875rem; cursor: pointer; transition: all var(--transition-fast); }
.theme-option.active { background: var(--primary); border-color: var(--primary); color: white; }

.setting-select { padding: var(--space-sm) var(--space-md); border: 1px solid var(--border-primary); border-radius: var(--radius-md); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.875rem; cursor: pointer; }

.toggle { position: relative; display: inline-block; width: 44px; height: 24px; }
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; cursor: pointer; inset: 0; background: var(--bg-accent); border-radius: 12px; transition: 0.3s; }
.toggle-slider::before { content: ''; position: absolute; width: 18px; height: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
.toggle input:checked + .toggle-slider { background: var(--primary); }
.toggle input:checked + .toggle-slider::before { transform: translateX(20px); }

.settings-footer { display: flex; justify-content: flex-end; gap: var(--space-sm); padding-top: var(--space-lg); border-top: 1px solid var(--border-primary); }

/* Loading inline */
.loading-inline { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--space-2xl); gap: var(--space-md); color: var(--text-secondary); }
.spinner-ring { width: 32px; height: 32px; border: 3px solid var(--border-primary); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }

.error-text { text-align: center; color: var(--status-critical); padding: var(--space-xl); }
.mono { font-family: var(--font-mono); }

@media (max-width: 640px) {
    .modal { max-width: 100%; margin: 0; border-radius: var(--radius-lg) var(--radius-lg) 0 0; align-self: flex-end; max-height: 95vh; }
    .modal-overlay { align-items: flex-end; padding: 0; }
    .report-stats { grid-template-columns: repeat(2, 1fr); }
}
`;

if (!document.querySelector('#modal-styles')) {
    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = modalStyles;
    document.head.appendChild(style);
}

window.Modals = Modals;
