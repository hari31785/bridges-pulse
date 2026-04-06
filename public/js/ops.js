/**
 * Ops Control Panel — Bridges Pulse
 * Allows developers to update service statuses and post broadcast messages.
 */

const STATUS_OPTIONS = [
    'Operational',
    'Running Normally',
    'Average',
    'OK',
    'Degraded',
    'Poor',
    'Maintenance',
    'Down',
    'Unknown'
];

const CATEGORY_LABELS = {
    application: 'Application',
    database: 'Database',
    integrations: 'Integrations',
    functionalities: 'Functionalities',
    services: 'Services'
};

class OpsPanel {
    constructor() {
        this.servicesData = null;   // raw { category: [service, ...] }
        this.pendingChanges = {};   // { "category/serviceId": { ...fields } }
        this.activeCategory = 'all';
        this.searchQuery = '';

        this.elements = {
            tableWrapper: document.getElementById('ops-table-wrapper'),
            saveAllBtn: document.getElementById('save-all-btn'),
            saveFeedback: document.getElementById('save-feedback'),
            unsavedBadge: document.getElementById('unsaved-badge'),
            opsSearch: document.getElementById('ops-search'),
            categoryTabs: document.getElementById('ops-category-tabs'),
            broadcastMsg: document.getElementById('broadcast-message'),
            broadcastSeverity: document.getElementById('broadcast-severity'),
            broadcastAuthor: document.getElementById('broadcast-author'),
            postBroadcastBtn: document.getElementById('post-broadcast-btn'),
            clearBroadcastBtn: document.getElementById('clear-broadcast-btn'),
            broadcastCurrent: document.getElementById('broadcast-current'),
            broadcastCurrentText: document.getElementById('broadcast-current-text'),
            charCount: document.getElementById('msg-char-count'),
            themeToggle: document.getElementById('theme-toggle'),
            themeIcon: document.getElementById('theme-icon'),
            currentTime: document.getElementById('current-time'),
        };

        this.bindEvents();
        this.startClock();
        this.applyTheme();
    }

    bindEvents() {
        this.elements.saveAllBtn?.addEventListener('click', () => this.saveAllChanges());
        this.elements.postBroadcastBtn?.addEventListener('click', () => this.postBroadcast());
        this.elements.clearBroadcastBtn?.addEventListener('click', () => this.clearBroadcast());

        this.elements.broadcastMsg?.addEventListener('input', () => {
            const len = this.elements.broadcastMsg.value.length;
            if (this.elements.charCount) this.elements.charCount.textContent = len;
        });

        this.elements.opsSearch?.addEventListener('input', Utils.debounce((e) => {
            this.searchQuery = e.target.value.toLowerCase().trim();
            this.renderTable();
        }, 200));

        this.elements.themeToggle?.addEventListener('click', () => this.toggleTheme());
    }

    async init() {
        try {
            const [servicesResp, broadcast] = await Promise.all([
                window.api.getServices(),
                window.api.getBroadcast()
            ]);

            this.servicesData = servicesResp.services;
            this.renderCategoryTabs();
            this.renderTable();
            this.renderCurrentBroadcast(broadcast);
        } catch (err) {
            this.elements.tableWrapper.innerHTML = `
                <div class="ops-error">
                    <i data-feather="alert-circle"></i>
                    <p>Failed to load services. Is the server running?</p>
                </div>`;
            if (window.feather) feather.replace();
        }
    }

    // ──────────────────────────────────────────────
    // Category Tabs
    // ──────────────────────────────────────────────
    renderCategoryTabs() {
        if (!this.elements.categoryTabs || !this.servicesData) return;

        const categories = Object.keys(this.servicesData);
        const tabs = [{ key: 'all', label: 'All' }, ...categories.map(k => ({
            key: k,
            label: CATEGORY_LABELS[k] || this.formatCategoryName(k)
        }))];

        this.elements.categoryTabs.innerHTML = tabs.map(t => `
            <button class="ops-tab ${t.key === this.activeCategory ? 'active' : ''}" data-category="${t.key}">
                ${Utils.sanitizeHtml(t.label)}
            </button>
        `).join('');

        this.elements.categoryTabs.querySelectorAll('.ops-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeCategory = btn.dataset.category;
                this.elements.categoryTabs.querySelectorAll('.ops-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderTable();
            });
        });
    }

    // ──────────────────────────────────────────────
    // Services Table
    // ──────────────────────────────────────────────
    renderTable() {
        if (!this.servicesData) return;

        const categories = this.activeCategory === 'all'
            ? Object.keys(this.servicesData)
            : [this.activeCategory];

        let html = '';
        let totalVisible = 0;

        categories.forEach(category => {
            const services = (this.servicesData[category] || []).filter(s => {
                if (!this.searchQuery) return true;
                return s.name.toLowerCase().includes(this.searchQuery) ||
                    s.id.toLowerCase().includes(this.searchQuery);
            });

            if (services.length === 0) return;
            totalVisible += services.length;

            const categoryLabel = CATEGORY_LABELS[category] || this.formatCategoryName(category);

            html += `
                <div class="ops-category-block" data-category="${category}">
                    <div class="ops-category-label">${Utils.sanitizeHtml(categoryLabel)}</div>
                    <table class="ops-table">
                        <thead>
                            <tr>
                                <th class="col-name">Service</th>
                                <th class="col-status">Status</th>
                                <th class="col-response">Response Time</th>
                                <th class="col-problem">Problem Statement</th>
                                <th class="col-actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${services.map(service => this.renderServiceRow(category, service)).join('')}
                        </tbody>
                    </table>
                </div>`;
        });

        if (totalVisible === 0) {
            html = `<div class="ops-empty">
                        <i data-feather="search"></i>
                        <p>No services match your search.</p>
                    </div>`;
        }

        this.elements.tableWrapper.innerHTML = html;
        if (window.feather) feather.replace();
        this.bindTableEvents();
    }

    renderServiceRow(category, service) {
        const key = `${category}/${service.id}`;
        const pending = this.pendingChanges[key] || {};

        const currentStatus = pending.status !== undefined ? pending.status : (service.status || 'Unknown');
        const currentResponseTime = pending.responseTime !== undefined ? pending.responseTime : (service.responseTime || '');
        const currentProblem = pending.problemStatement !== undefined ? pending.problemStatement : (service.problemStatement || '');
        const hasPending = !!this.pendingChanges[key];
        const statusType = Utils.getStatusType(currentStatus);

        return `
        <tr class="ops-row ${hasPending ? 'ops-row-modified' : ''}" data-service-id="${service.id}" data-category="${category}">
            <td class="col-name">
                <div class="service-name-cell">
                    <span class="service-name-text">${Utils.sanitizeHtml(service.name)}</span>
                    <span class="service-id-text">${Utils.sanitizeHtml(service.id)}</span>
                </div>
            </td>
            <td class="col-status">
                <select class="form-control status-select status-${statusType}" data-field="status" data-key="${key}">
                    ${STATUS_OPTIONS.map(opt => `
                        <option value="${opt}" ${opt === currentStatus ? 'selected' : ''}>${opt}</option>
                    `).join('')}
                </select>
            </td>
            <td class="col-response">
                <input type="text" class="form-control" data-field="responseTime" data-key="${key}"
                    value="${Utils.sanitizeHtml(currentResponseTime)}"
                    placeholder="e.g. 125ms or NA" maxlength="20">
            </td>
            <td class="col-problem">
                <input type="text" class="form-control" data-field="problemStatement" data-key="${key}"
                    value="${Utils.sanitizeHtml(currentProblem)}"
                    placeholder="Describe any issues…" maxlength="500">
            </td>
            <td class="col-actions">
                <button class="btn btn-primary btn-sm save-row-btn" data-key="${key}" title="Save this service">
                    <i data-feather="check"></i>
                </button>
                <button class="btn btn-ghost btn-sm discard-row-btn ${hasPending ? '' : 'discard-hidden'}" data-key="${key}" title="Discard changes">
                    <i data-feather="rotate-ccw"></i>
                </button>
            </td>
        </tr>`;
    }

    bindTableEvents() {
        const wrapper = this.elements.tableWrapper;

        // Track field changes
        wrapper.querySelectorAll('[data-field]').forEach(input => {
            input.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                const field = e.target.dataset.field;
                if (!this.pendingChanges[key]) this.pendingChanges[key] = {};
                this.pendingChanges[key][field] = e.target.value;
                this.markRowModified(input.closest('tr'));
                this.updateUnsavedBadge();
            });

            // Also track live typing for text inputs
            if (input.tagName === 'INPUT') {
                input.addEventListener('input', (e) => {
                    const key = e.target.dataset.key;
                    const field = e.target.dataset.field;
                    if (!this.pendingChanges[key]) this.pendingChanges[key] = {};
                    this.pendingChanges[key][field] = e.target.value;
                    this.markRowModified(input.closest('tr'));
                    this.updateUnsavedBadge();
                });
            }
        });

        // Save individual row
        wrapper.querySelectorAll('.save-row-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                this.saveRow(key);
            });
        });

        // Discard individual row
        wrapper.querySelectorAll('.discard-row-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                delete this.pendingChanges[key];
                this.updateUnsavedBadge();
                this.renderTable();
            });
        });
    }

    markRowModified(row) {
        if (!row) return;
        row.classList.add('ops-row-modified');
        const discardBtn = row.querySelector('.discard-row-btn');
        if (discardBtn) discardBtn.classList.remove('discard-hidden');
    }

    updateUnsavedBadge() {
        const count = Object.keys(this.pendingChanges).length;
        const badge = this.elements.unsavedBadge;
        if (!badge) return;
        if (count > 0) {
            badge.textContent = `${count} unsaved change${count > 1 ? 's' : ''}`;
            badge.style.display = '';
        } else {
            badge.style.display = 'none';
        }
    }

    // ──────────────────────────────────────────────
    // Save operations
    // ──────────────────────────────────────────────
    async saveRow(key) {
        const [category, serviceId] = key.split('/');
        const changes = this.pendingChanges[key];
        if (!changes || Object.keys(changes).length === 0) {
            this.showToast('No changes to save', 'info');
            return;
        }

        const btn = this.elements.tableWrapper.querySelector(`.save-row-btn[data-key="${key}"]`);
        if (btn) { btn.disabled = true; btn.innerHTML = '<i data-feather="loader" class="ops-spin"></i>'; }

        try {
            await window.api.updateService(category, serviceId, changes);

            // Update local data
            const serviceArr = this.servicesData[category];
            if (serviceArr) {
                const idx = serviceArr.findIndex(s => s.id === serviceId);
                if (idx !== -1) Object.assign(serviceArr[idx], changes);
            }

            delete this.pendingChanges[key];
            this.updateUnsavedBadge();
            this.renderTable();
            this.showToast(`Saved ${serviceId.replace(/_/g, ' ')}`, 'success');
        } catch (err) {
            this.showToast('Failed to save — check server connection', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i data-feather="check"></i>'; if (window.feather) feather.replace(); }
        }
    }

    async saveAllChanges() {
        const keys = Object.keys(this.pendingChanges);
        if (keys.length === 0) {
            this.showToast('No pending changes', 'info');
            return;
        }

        const btn = this.elements.saveAllBtn;
        btn.disabled = true;
        btn.innerHTML = '<i data-feather="loader" class="ops-spin"></i> Saving…';

        let saved = 0;
        let failed = 0;

        await Promise.all(keys.map(async (key) => {
            const [category, serviceId] = key.split('/');
            const changes = this.pendingChanges[key];
            try {
                await window.api.updateService(category, serviceId, changes);
                const serviceArr = this.servicesData[category];
                if (serviceArr) {
                    const idx = serviceArr.findIndex(s => s.id === serviceId);
                    if (idx !== -1) Object.assign(serviceArr[idx], changes);
                }
                delete this.pendingChanges[key];
                saved++;
            } catch {
                failed++;
            }
        }));

        this.updateUnsavedBadge();
        this.renderTable();

        btn.disabled = false;
        btn.innerHTML = '<i data-feather="save"></i> Save All Changes';
        if (window.feather) feather.replace();

        if (failed === 0) {
            this.showToast(`${saved} service${saved !== 1 ? 's' : ''} saved successfully`, 'success');
        } else {
            this.showToast(`${saved} saved, ${failed} failed — check server`, 'warning');
        }
    }

    // ──────────────────────────────────────────────
    // Broadcast
    // ──────────────────────────────────────────────
    renderCurrentBroadcast(broadcast) {
        if (!this.elements.broadcastCurrent) return;
        if (broadcast && broadcast.active && broadcast.message) {
            this.elements.broadcastCurrent.style.display = '';
            if (this.elements.broadcastCurrentText) {
                this.elements.broadcastCurrentText.textContent = broadcast.message;
            }
            this.elements.broadcastCurrent.className = `broadcast-current broadcast-current-${broadcast.severity || 'info'}`;
        } else {
            this.elements.broadcastCurrent.style.display = 'none';
        }
    }

    async postBroadcast() {
        const message = this.elements.broadcastMsg?.value?.trim();
        if (!message) {
            this.showToast('Please enter a message', 'warning');
            return;
        }

        const severity = this.elements.broadcastSeverity?.value || 'info';
        const author = this.elements.broadcastAuthor?.value?.trim() || '';
        const btn = this.elements.postBroadcastBtn;

        btn.disabled = true;
        btn.innerHTML = '<i data-feather="loader" class="ops-spin"></i> Posting…';

        try {
            await window.api.setBroadcast(message, severity, author);
            this.renderCurrentBroadcast({ message, severity, active: true, updatedBy: author });
            this.elements.broadcastMsg.value = '';
            if (this.elements.charCount) this.elements.charCount.textContent = '0';
            this.showToast('Broadcast posted — visible on dashboard', 'success');
        } catch {
            this.showToast('Failed to post broadcast', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i data-feather="send"></i> Post Broadcast';
            if (window.feather) feather.replace();
        }
    }

    async clearBroadcast() {
        try {
            await window.api.clearBroadcast();
            this.renderCurrentBroadcast(null);
            this.showToast('Broadcast cleared', 'success');
        } catch {
            this.showToast('Failed to clear broadcast', 'error');
        }
    }

    // ──────────────────────────────────────────────
    // Toast notifications
    // ──────────────────────────────────────────────
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('toast-visible'));
        setTimeout(() => {
            toast.classList.remove('toast-visible');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // ──────────────────────────────────────────────
    // Theme & Clock
    // ──────────────────────────────────────────────
    applyTheme() {
        const saved = Utils.storage.get('bp_theme', 'light');
        document.body.className = `theme-${saved}`;
        this.updateThemeIcon(saved);
    }

    toggleTheme() {
        const isDark = document.body.classList.contains('theme-dark');
        const next = isDark ? 'light' : 'dark';
        document.body.className = `theme-${next}`;
        Utils.storage.set('bp_theme', next);
        this.updateThemeIcon(next);
    }

    updateThemeIcon(theme) {
        if (!this.elements.themeIcon) return;
        this.elements.themeIcon.setAttribute('data-feather', theme === 'dark' ? 'moon' : 'sun');
        if (window.feather) feather.replace();
    }

    startClock() {
        const el = this.elements.currentTime;
        if (!el) return;
        const tick = () => { el.textContent = Utils.formatDate(new Date()); };
        tick();
        setInterval(tick, 1000);
    }

    formatCategoryName(key) {
        return key.split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    const ops = new OpsPanel();
    ops.init();
});
