/**
 * Dashboard Manager for Bridges Pulse
 * Handles rendering, filtering, searching, and layout of service data
 */

const CATEGORY_EMOJI = {
    application:     '🖥️',
    database:        '🗄️',
    integrations:    '🔌',
    functionalities: '✨',
    services:        '⚙️'
};

class Dashboard {
    constructor() {
        this.services = null;
        this.config = null;
        this.currentFilter = 'all';
        this.currentCategory = 'all';
        this.currentView = 'grid';
        this.searchQuery = '';
        this.refreshTimer = null;
        this.refreshInterval = 30000;

        this.elements = {
            dashboard: document.getElementById('dashboard'),
            searchInput: document.getElementById('search-input'),
            filterButtons: document.querySelectorAll('.filter-btn'),
            viewButtons: document.querySelectorAll('.view-btn'),
            refreshBtn: document.getElementById('refresh-btn'),
            categoryNav: document.getElementById('category-nav'),
            categoryNavAll: document.getElementById('category-nav-all'),
            healthyCount: document.getElementById('healthy-count'),
            warningCount: document.getElementById('warning-count'),
            criticalCount: document.getElementById('critical-count'),
            countAll: document.getElementById('count-all'),
            countHealthy: document.getElementById('count-healthy'),
            countWarning: document.getElementById('count-warning'),
            countCritical: document.getElementById('count-critical'),
        };

        this.bindEvents();
    }

    bindEvents() {
        // Search
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener(
                'input',
                Utils.debounce((e) => {
                    this.searchQuery = e.target.value.toLowerCase().trim();
                    this.applyFilters();
                }, 250)
            );
        }

        // Filter buttons
        this.elements.filterButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                this.elements.filterButtons.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.applyFilters();
            });
        });

        // View toggle buttons
        this.elements.viewButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                this.elements.viewButtons.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                this.setView(btn.dataset.view);
            });
        });

        // Refresh button
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.refresh());
        }
    }

    async init() {
        try {
            // Load config and services in parallel
            const [servicesData, configData] = await Promise.all([
                window.api.getServices(),
                window.api.getConfig()
            ]);

            this.config = configData;
            this.services = servicesData;

            // Apply saved preferences
            this.applySavedPreferences();

            // Render dashboard
            this.render();

            // Load broadcast banner
            this.loadBroadcast();

            // Start auto-refresh
            this.startAutoRefresh();

            return true;
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.renderError('Failed to load dashboard data. Please refresh the page.');
            return false;
        }
    }

    applySavedPreferences() {
        const savedTheme = Utils.storage.get('bp_theme', 'light');
        const savedView = Utils.storage.get('bp_view', 'grid');

        document.body.className = `theme-${savedTheme}`;
        this.currentView = savedView;

        // Update view buttons
        this.elements.viewButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.view === savedView);
        });

        // Apply refresh interval from config
        if (this.config && this.config.refreshInterval) {
            this.refreshInterval = this.config.refreshInterval;
        }
    }

    render() {
        if (!this.services || !this.services.services) {
            this.renderError('No service data available.');
            return;
        }

        const dashboard = this.elements.dashboard;
        dashboard.innerHTML = '';

        const categoryConfig = (this.config && this.config.categories) || {};
        const categoryOrder = Object.entries(categoryConfig)
            .sort(([, a], [, b]) => (a.order || 99) - (b.order || 99))
            .map(([key]) => key);

        // Render categories in configured order, then any extras
        const allCategories = [
            ...categoryOrder,
            ...Object.keys(this.services.services).filter((k) => !categoryOrder.includes(k))
        ];

        allCategories.forEach((category) => {
            const services = this.services.services[category];
            if (!services || services.length === 0) return;

            const catConfig = categoryConfig[category] || {};
            if (catConfig.visible === false) return;

            const emoji = CATEGORY_EMOJI[category] || '';
            const section = Components.createCategorySection(category, services, {
                title: (emoji ? emoji + ' ' : '') + (catConfig.title || this.formatCategoryName(category)),
                color: catConfig.color || '#3b82f6',
                icon: catConfig.icon || 'layers',
                expanded: catConfig.expanded !== false
            });

            dashboard.appendChild(section);
        });

        // Update summary counts
        this.updateSummary();

        // Render category nav
        this.renderCategoryNav();

        // Apply current view
        if (this.currentView === 'columns') {
            dashboard.classList.add('layout-columns');
            this.renderColumnsView();
            this.applyFilters();
        } else if (this.currentView === 'table') {
            dashboard.classList.add('layout-table');
            this.renderTableView();
        } else {
            // grid — sections are already appended above; just ensure no stale layout classes
            dashboard.classList.remove('layout-list', 'layout-columns', 'layout-table');
        }

        // Replace feather icons
        if (window.feather) feather.replace();
    }

    renderCategoryNav() {
        const nav = this.elements.categoryNav;
        if (!nav || !this.services || !this.services.services) return;

        const categoryConfig = (this.config && this.config.categories) || {};
        const categoryOrder = Object.entries(categoryConfig)
            .sort(([, a], [, b]) => (a.order || 99) - (b.order || 99))
            .map(([key]) => key);
        const allCategories = [
            ...categoryOrder,
            ...Object.keys(this.services.services).filter(k => !categoryOrder.includes(k))
        ].filter(cat => {
            const catConfig = categoryConfig[cat] || {};
            return catConfig.visible !== false && (this.services.services[cat] || []).length > 0;
        });

        const catLabels = {
            application: 'Application', database: 'Database', integrations: 'Integrations',
            functionalities: 'Functionalities', services: 'Services'
        };
        const catIcons = {
            application: 'layers', database: 'database', integrations: 'link',
            functionalities: 'settings', services: 'cpu'
        };

        const allBtn = `<button class="cat-nav-btn ${this.currentCategory === 'all' ? 'active' : ''}" data-category="all">
            <i data-feather="grid"></i><span>All</span>
        </button>`;

        const catBtns = allCategories.map(cat => {
            const catConfig = categoryConfig[cat] || {};
            const label = catConfig.title || catLabels[cat] || this.formatCategoryName(cat);
            const icon = catConfig.icon || catIcons[cat] || 'layers';
            const color = catConfig.color || '#3b82f6';
            const services = this.services.services[cat] || [];
            const issueCount = services.filter(s => Utils.getEffectiveStatusType(s) !== 'healthy').length;
            return `<button class="cat-nav-btn ${this.currentCategory === cat ? 'active' : ''}" 
                data-category="${cat}" style="--cat-color: ${color}">
                <i data-feather="${icon}"></i>
                <span>${Utils.sanitizeHtml(label)}</span>
                ${issueCount > 0 ? `<span class="cat-nav-badge">${issueCount}</span>` : ''}
            </button>`;
        }).join('');

        // Inject All button into its own container, category buttons into category-nav
        if (this.elements.categoryNavAll) {
            this.elements.categoryNavAll.innerHTML = allBtn;
        }
        nav.innerHTML = catBtns;

        // Attach click listeners to all nav buttons (both containers)
        const allNavBtns = [
            ...(this.elements.categoryNavAll ? this.elements.categoryNavAll.querySelectorAll('.cat-nav-btn') : []),
            ...nav.querySelectorAll('.cat-nav-btn')
        ];

        allNavBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentCategory = btn.dataset.category;
                allNavBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._updateFilterButtonsVisibility();
                this.applyFilters();

                // Scroll to section in grid/table views
                if (this.currentCategory !== 'all') {
                    requestAnimationFrame(() => {
                        const target = document.querySelector(
                            `.category-section[data-category="${this.currentCategory}"], ` +
                            `.col-view-column[data-category="${this.currentCategory}"]`
                        );
                        if (target) {
                            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    });
                }
            });
        });

        this._updateFilterButtonsVisibility();

        if (window.feather) feather.replace();
    }

    _updateFilterButtonsVisibility() {
        const statusRow = document.getElementById('filters-row-status');
        if (!statusRow) return;
        if (this.currentCategory === 'all') {
            statusRow.style.display = 'none';
            // Reset status filter back to "all" when returning to All category
            this.currentFilter = 'all';
            this.elements.filterButtons.forEach(b => {
                b.classList.toggle('active', b.dataset.filter === 'all');
            });
        } else {
            statusRow.style.display = '';
        }
    }

    applyFilters() {
        // Table view — filter rows directly
        if (this.currentView === 'table') {
            const rows = document.querySelectorAll('.table-row');
            rows.forEach((row) => {
                const statusType = row.dataset.statusType;
                const rowCat = row.dataset.category || '';
                const name = row.querySelector('.tcol-name')?.textContent?.toLowerCase() || '';
                const cat = row.querySelector('.tcol-category')?.textContent?.toLowerCase() || '';
                const matchesFilter = this.currentFilter === 'all' || statusType === this.currentFilter;
                const matchesCategory = this.currentCategory === 'all' || rowCat === this.currentCategory;
                const matchesSearch = !this.searchQuery || name.includes(this.searchQuery) || cat.includes(this.searchQuery);
                row.style.display = matchesFilter && matchesCategory && matchesSearch ? '' : 'none';
            });
            return;
        }

        // Columns view — filter rows within each column; all columns always visible unless empty after filter
        if (this.currentView === 'columns') {
            document.querySelectorAll('.col-view-column').forEach((col) => {
                const colCat = col.dataset.category || '';
                const matchesCategory = this.currentCategory === 'all' || colCat === this.currentCategory;
                if (!matchesCategory) {
                    col.style.display = 'none';
                    return;
                }
                col.style.display = '';
                col.querySelectorAll('.col-view-row').forEach((row) => {
                    const statusType = row.dataset.statusType;
                    const name = row.querySelector('.col-row-name')?.textContent?.toLowerCase() || '';
                    const matchesFilter = this.currentFilter === 'all' || statusType === this.currentFilter;
                    const matchesSearch = !this.searchQuery || name.includes(this.searchQuery);
                    row.style.display = matchesFilter && matchesSearch ? '' : 'none';
                });
                // Hide the column only if every row is hidden (e.g. search/filter leaves nothing)
                const hasVisible = Array.from(col.querySelectorAll('.col-view-row'))
                    .some(r => r.style.display !== 'none');
                if (!hasVisible) col.style.display = 'none';
            });
            return;
        }

        // Grid view
        const allCards = document.querySelectorAll('.service-card');
        const allSections = document.querySelectorAll('.category-section');
        let visibleTotal = 0;

        allCards.forEach((card) => {
            const statusType = card.dataset.statusType;
            const cardCat = card.dataset.category || '';
            const serviceName = card.querySelector('.card-title h4')?.textContent?.toLowerCase() || '';
            const matchesFilter = this.currentFilter === 'all' || statusType === this.currentFilter;
            const matchesCategory = this.currentCategory === 'all' || cardCat === this.currentCategory;
            const matchesSearch = !this.searchQuery || serviceName.includes(this.searchQuery) || cardCat.includes(this.searchQuery);
            const visible = matchesFilter && matchesCategory && matchesSearch;
            card.style.display = visible ? '' : 'none';
            if (visible) visibleTotal++;
        });

        allSections.forEach((section) => {
            const visibleCards = section.querySelectorAll('.service-card:not([style*="display: none"])');
            section.style.display = visibleCards.length === 0 ? 'none' : '';
        });

        const emptyState = document.getElementById('empty-state');
        if (visibleTotal === 0) {
            if (!emptyState) this.renderEmptyState();
        } else {
            if (emptyState) emptyState.remove();
        }
    }

    renderEmptyState() {
        const el = document.createElement('div');
        el.id = 'empty-state';
        el.className = 'empty-state fade-in';
        el.innerHTML = `
            <i data-feather="search"></i>
            <h3>No services found</h3>
            <p>Try adjusting your search or filter criteria.</p>
            <button class="control-btn" onclick="window.dashboard.clearFilters()">Clear Filters</button>
        `;
        this.elements.dashboard.appendChild(el);
        if (window.feather) feather.replace();
    }

    clearFilters() {
        this.searchQuery = '';
        this.currentFilter = 'all';
        if (this.elements.searchInput) this.elements.searchInput.value = '';
        this.elements.filterButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.filter === 'all');
        });
        this.applyFilters();
    }

    updateSummary() {
        if (!this.services || !this.services.summary) return;

        const { summary } = this.services;
        const total = summary.total || 0;
        const healthy = summary.operational || 0;
        const critical = summary.critical || 0;
        const warning = summary.issues || 0;

        // Header summary
        if (this.elements.healthyCount) this.elements.healthyCount.textContent = healthy;
        if (this.elements.warningCount) this.elements.warningCount.textContent = warning;
        if (this.elements.criticalCount) this.elements.criticalCount.textContent = critical;

        // Filter bar counts
        if (this.elements.countAll) this.elements.countAll.textContent = total;
        if (this.elements.countHealthy) this.elements.countHealthy.textContent = healthy;
        if (this.elements.countWarning) this.elements.countWarning.textContent = warning;
        if (this.elements.countCritical) this.elements.countCritical.textContent = critical;
    }

    setView(view, save = true) {
        this.currentView = view;
        const dashboard = this.elements.dashboard;

        // Remove all view classes
        dashboard.classList.remove('layout-list', 'layout-columns', 'layout-table');

        if (view === 'columns') {
            dashboard.classList.add('layout-columns');
            this.renderColumnsView();
            this.applyFilters();
        } else if (view === 'table') {
            dashboard.classList.add('layout-table');
            this.renderTableView();
        } else {
            // grid
            dashboard.classList.remove('layout-list', 'layout-columns', 'layout-table');
            // If we came from columns/table, the DOM has no category sections — re-render
            if (!dashboard.querySelector('.category-section')) {
                this.render();
                return;
            }
        }

        if (save) Utils.storage.set('bp_view', view);
    }

    renderColumnsView() {
        if (!this.services || !this.services.services) return;
        const dashboard = this.elements.dashboard;
        dashboard.innerHTML = '';

        const categoryConfig = (this.config && this.config.categories) || {};
        const categoryOrder = Object.entries(categoryConfig)
            .sort(([, a], [, b]) => (a.order || 99) - (b.order || 99))
            .map(([key]) => key);
        const allCategories = [
            ...categoryOrder,
            ...Object.keys(this.services.services).filter((k) => !categoryOrder.includes(k))
        ];

        allCategories.forEach((category) => {
            const services = this.services.services[category];
            if (!services || services.length === 0) return;
            const catConfig = categoryConfig[category] || {};
            if (catConfig.visible === false) return;

            const title = catConfig.title || this.formatCategoryName(category);
            const color = catConfig.color || '#3b82f6';

            // Split large categories into two columns (threshold: 15 items)
            const half = Math.floor(services.length / 2);
            const chunks = services.length > 15
                ? [
                    { label: title, items: services.slice(0, half) },
                    { label: `${title} (Contd.)`, items: services.slice(half) }
                  ]
                : [{ label: title, items: services }];

            chunks.forEach(({ label, items }) => {
                const col = document.createElement('div');
                col.className = 'col-view-column fade-in';
                col.setAttribute('data-category', category);

                const emoji = CATEGORY_EMOJI[category] || '';
                col.innerHTML = `
                <div class="col-view-header" style="border-top: 3px solid ${color}">
                    <span class="col-view-title">${emoji ? emoji + ' ' : ''}${Utils.sanitizeHtml(label)}</span>
                    <span class="col-view-count">${items.length}</span>
                </div>
                <div class="col-view-body">
                    ${items.map(s => {
                        const statusType = Utils.getEffectiveStatusType(s);
                        const dotClass = Utils.getDotClass(s.status);
                        const statusClass = Utils.getStatusClass(s.status);
                        const hasProblem = s.problemStatement && s.problemStatement.trim();
                        const hasRT = s.responseTime && s.responseTime !== 'NA';
                        const responseClass = hasRT ? Utils.getResponseTimeClass(s.responseTime) : '';
                        return `
                        <div class="col-view-row ${statusType}" data-service-id="${s.id}" data-category="${category}" data-status-type="${statusType}">
                            <div class="col-row-left">
                                <div class="status-dot ${dotClass}"></div>
                                <span class="col-row-name">${Utils.sanitizeHtml(s.name)}</span>
                            </div>
                            <div class="col-row-right">
                                <span class="col-row-status ${statusClass}">${Utils.sanitizeHtml(s.status)}</span>
                                ${hasProblem ? `<span class="col-row-alert" title="${Utils.sanitizeHtml(s.problemStatement)}"><i data-feather="alert-triangle"></i></span>` : ''}
                            </div>
                            ${hasRT ? `<div class="col-row-rt">Response Time: <span class="${responseClass}">${Utils.sanitizeHtml(s.responseTime)}</span></div>` : ''}
                            ${hasProblem ? `<div class="col-row-problem">${Utils.sanitizeHtml(s.problemStatement)}</div>` : ''}
                        </div>`;
                    }).join('')}
                </div>
            `;

                dashboard.appendChild(col);
            });
        });

        // Set equal-width columns based on actual column count
        const colCount = dashboard.querySelectorAll('.col-view-column').length;
        dashboard.style.gridTemplateColumns = `repeat(${colCount}, 1fr)`;

        if (window.feather) feather.replace();
    }

    renderTableView() {
        if (!this.services || !this.services.services) return;
        const dashboard = this.elements.dashboard;
        dashboard.innerHTML = '';

        const categoryConfig = (this.config && this.config.categories) || {};
        const categoryOrder = Object.entries(categoryConfig)
            .sort(([, a], [, b]) => (a.order || 99) - (b.order || 99))
            .map(([key]) => key);
        const allCategories = [
            ...categoryOrder,
            ...Object.keys(this.services.services).filter((k) => !categoryOrder.includes(k))
        ];

        // Flatten all services preserving category
        const allServices = [];
        allCategories.forEach((category) => {
            const services = this.services.services[category];
            if (!services) return;
            const catConfig = categoryConfig[category] || {};
            if (catConfig.visible === false) return;
            const title = catConfig.title || this.formatCategoryName(category);
            const emoji = CATEGORY_EMOJI[category] || '';
            services.forEach(s => allServices.push({ ...s, _categoryTitle: (emoji ? emoji + ' ' : '') + title }));
        });

        const wrapper = document.createElement('div');
        wrapper.className = 'table-view-wrapper fade-in';

        const rows = allServices.map(s => {
            const statusType = Utils.getEffectiveStatusType(s);
            const dotClass = Utils.getDotClass(s.status);
            const statusClass = Utils.getStatusClass(s.status);
            const hasProblem = s.problemStatement && s.problemStatement.trim();
            const rtValue = s.responseTime && s.responseTime !== 'NA' ? Utils.sanitizeHtml(s.responseTime) : '—';
            const responseClass = Utils.getResponseTimeClass(s.responseTime);
            return `
            <tr class="table-row ${statusType}" data-service-id="${s.id}" data-category="${s.category}" data-status-type="${statusType}">
                <td class="tcol-name">${Utils.sanitizeHtml(s.name)}</td>
                <td class="tcol-category"><span class="table-category-tag">${Utils.sanitizeHtml(s._categoryTitle)}</span></td>
                <td class="tcol-status">
                    <div class="table-status-cell">
                        <div class="status-dot ${dotClass}"></div>
                        <span class="${statusClass}">${Utils.sanitizeHtml(s.status)}</span>
                    </div>
                </td>
                <td class="tcol-rt"><span class="${responseClass}">${rtValue}</span></td>
                <td class="tcol-problem">${hasProblem ? `<span class="table-problem-text">${Utils.sanitizeHtml(s.problemStatement)}</span>` : '<span class="table-no-problem">—</span>'}</td>
            </tr>`;
        }).join('');

        wrapper.innerHTML = `
            <table class="status-table">
                <thead>
                    <tr>
                        <th class="tcol-name">Service</th>
                        <th class="tcol-category">Category</th>
                        <th class="tcol-status">Status</th>
                        <th class="tcol-rt">Response Time</th>
                        <th class="tcol-problem">Problem Statement</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;

        dashboard.appendChild(wrapper);
        if (window.feather) feather.replace();
    }

    async refresh(showToast = true) {
        const btn = this.elements.refreshBtn;
        if (btn) btn.classList.add('loading');

        try {
            window.api.clearCache();
            const [servicesData, configData] = await Promise.all([
                window.api.getServices(),
                window.api.getConfig()
            ]);

            this.services = servicesData;
            this.config = configData;

            this.render();
            this.applyFilters();

            if (showToast) {
                Components.createToast('Dashboard refreshed successfully', 'success', 3000);
            }
        } catch (error) {
            console.error('Refresh failed:', error);
            if (showToast) {
                Components.createToast('Failed to refresh dashboard', 'error', 5000);
            }
        } finally {
            if (btn) btn.classList.remove('loading');
        }
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshTimer = setInterval(() => {
            this.refresh(false);
        }, this.refreshInterval);
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    updateCategoryExpanded(category, expanded) {
        if (this.config && this.config.categories && this.config.categories[category]) {
            this.config.categories[category].expanded = expanded;
            window.api.updateConfig(this.config).catch(console.error);
        }
    }

    renderError(message) {
        const dashboard = this.elements.dashboard;
        dashboard.innerHTML = `
            <div class="error-state fade-in">
                <i data-feather="alert-circle"></i>
                <h3>Something went wrong</h3>
                <p>${Utils.sanitizeHtml(message)}</p>
                <button class="control-btn primary" onclick="window.dashboard.refresh()">
                    <i data-feather="refresh-cw"></i> Try Again
                </button>
            </div>
        `;
        if (window.feather) feather.replace();
    }

    formatCategoryName(category) {
        return category
            .split(/[_-]/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    async loadBroadcast() {
        try {
            const broadcast = await window.api.getBroadcast();
            this.renderBroadcast(broadcast);
        } catch (e) {
            // Non-critical — silently skip
        }
    }

    renderBroadcast(broadcast) {
        const banner = document.getElementById('broadcast-banner');
        const msgEl = document.getElementById('broadcast-message');
        const metaEl = document.getElementById('broadcast-meta');
        if (!banner || !msgEl) return;

        if (broadcast && broadcast.active && broadcast.message) {
            msgEl.textContent = broadcast.message;
            if (metaEl && broadcast.updatedBy) {
                metaEl.textContent = `— ${broadcast.updatedBy}`;
            }
            banner.className = `broadcast-banner broadcast-${broadcast.severity || 'info'}`;
            banner.style.display = '';
        } else {
            banner.style.display = 'none';
        }
    }
}

// Additional dashboard styles
const dashboardStyles = `
.empty-state,
.error-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-2xl);
    text-align: center;
    gap: var(--space-md);
    color: var(--text-secondary);
    background: var(--bg-primary);
    border: 1px dashed var(--border-accent);
    border-radius: var(--radius-lg);
}

.empty-state i,
.error-state i {
    font-size: 3rem;
    opacity: 0.3;
}

.empty-state h3,
.error-state h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.empty-state p,
.error-state p {
    font-size: 0.875rem;
    margin: 0;
    max-width: 300px;
}

/* Status text colors */
.status-healthy { color: var(--status-operational); }
.status-warning { color: var(--status-average); }
.status-critical { color: var(--status-critical); }
.status-unknown { color: var(--status-na); }

/* Status dot animations */
.status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
}

.dot-green {
    background: var(--status-operational);
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    animation: dot-pulse-green 2s ease-in-out infinite;
}

.dot-yellow {
    background: var(--status-average);
    box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.2);
}

.dot-red {
    background: var(--status-critical);
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
    animation: dot-pulse-red 1s ease-in-out infinite;
}

.dot-grey {
    background: var(--status-na);
}

@keyframes dot-pulse-green {
    0%, 100% { box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2); }
    50% { box-shadow: 0 0 0 5px rgba(16, 185, 129, 0.1); }
}

@keyframes dot-pulse-red {
    0%, 100% { box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2); }
    50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.1); }
}
`;

if (!document.querySelector('#dashboard-styles')) {
    const style = document.createElement('style');
    style.id = 'dashboard-styles';
    style.textContent = dashboardStyles;
    document.head.appendChild(style);
}

window.Dashboard = Dashboard;
