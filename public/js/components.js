/**
 * UI Components for Bridges Pulse
 * Reusable component builders and managers
 */

const Components = {
    /**
     * Create a service card component
     */
    createServiceCard(service, options = {}) {
        const { interactive = true, compact = false } = options;
        
        const statusType = Utils.getEffectiveStatusType(service);
        const dotClass = Utils.getDotClass(service.status);
        const statusClass = Utils.getStatusClass(service.status);
        const responseClass = Utils.getResponseTimeClass(service.responseTime);
        const icon = Utils.getServiceIcon(service.icon);
        
        const lastUpdated = service.lastUpdated ? new Date(service.lastUpdated) : new Date();
        const relativeTime = Utils.formatRelativeTime(lastUpdated);
        
        const cardElement = document.createElement('div');
        cardElement.className = `service-card ${statusType} ${compact ? 'compact' : ''} fade-in`;
        cardElement.setAttribute('data-service-id', service.id);
        cardElement.setAttribute('data-category', service.category);
        cardElement.setAttribute('data-status-type', statusType);
        
        cardElement.innerHTML = `
            <div class="card-header">
                <div class="card-icon">
                    <i data-feather="${icon}"></i>
                </div>
                <div class="card-title">
                    <h4>${Utils.sanitizeHtml(service.name)}</h4>
                </div>
                <div class="card-status">
                    <div class="status-dot ${dotClass}"></div>
                    <span class="status-text ${statusClass}">${Utils.sanitizeHtml(service.status)}</span>
                </div>
            </div>
            
            <div class="card-body">
                ${service.responseTime && service.responseTime !== 'NA' ? `
                <div class="metric">
                    <span class="metric-label">Response Time:</span>
                    <span class="metric-value ${responseClass}">${Utils.formatResponseTime(service.responseTime)}</span>
                </div>
                ` : ''}
            </div>
            
            ${service.problemStatement && service.problemStatement.trim() ? `
            <div class="card-problem">
                <div class="problem-icon">
                    <i data-feather="alert-triangle"></i>
                </div>
                <div class="problem-text">${Utils.sanitizeHtml(service.problemStatement)}</div>
            </div>
            ` : ''}
            
            <div class="card-footer">
                <div class="last-updated">
                    <i data-feather="clock"></i>
                    <span>Updated ${relativeTime}</span>
                </div>
                ${interactive ? `
                <div class="card-actions">
                    <button class="action-btn" data-action="details" title="View details">
                        <i data-feather="info"></i>
                    </button>
                    <button class="action-btn" data-action="history" title="View history">
                        <i data-feather="activity"></i>
                    </button>
                </div>
                ` : ''}
            </div>
        `;
        
        // Add click handler for interactive cards
        if (interactive) {
            cardElement.addEventListener('click', (e) => {
                if (e.target.closest('.action-btn')) {
                    const action = e.target.closest('.action-btn').dataset.action;
                    this.handleServiceAction(service, action);
                } else {
                    this.handleServiceClick(service);
                }
            });
        }
        
        return cardElement;
    },
    
    /**
     * Create a category section
     */
    createCategorySection(category, services, config = {}) {
        const { 
            title = category.charAt(0).toUpperCase() + category.slice(1),
            color = '#3b82f6',
            icon = 'layers',
            expanded = true
        } = config;
        
        const sectionElement = document.createElement('div');
        sectionElement.className = 'category-section fade-in';
        sectionElement.setAttribute('data-category', category);
        
        const healthyCount = services.filter(s => Utils.getEffectiveStatusType(s) === 'healthy').length;
        const warningCount = services.filter(s => Utils.getEffectiveStatusType(s) === 'warning').length;
        const criticalCount = services.filter(s => Utils.getEffectiveStatusType(s) === 'critical').length;
        
        sectionElement.innerHTML = `
            <div class="category-header" data-category="${category}">
                <div class="category-info">
                    <div class="category-icon" style="background-color: ${color}">
                        <i data-feather="${icon}"></i>
                    </div>
                    <div class="category-title">
                        <h3>${Utils.sanitizeHtml(title)}</h3>
                        <span class="service-count">${services.length} service${services.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                
                <div class="category-status">
                    ${healthyCount > 0 ? `<span class="status-badge healthy">${healthyCount}</span>` : ''}
                    ${warningCount > 0 ? `<span class="status-badge warning">${warningCount}</span>` : ''}
                    ${criticalCount > 0 ? `<span class="status-badge critical">${criticalCount}</span>` : ''}
                </div>
                
                <button class="category-toggle" data-expanded="${expanded}">
                    <i data-feather="${expanded ? 'chevron-down' : 'chevron-right'}"></i>
                </button>
            </div>
            
            <div class="category-content" ${!expanded ? 'style="display: none;"' : ''}>
                <div class="services-grid" id="services-${category}">
                    <!-- Services will be added here -->
                </div>
            </div>
        `;
        
        // Add services to the grid
        const servicesGrid = sectionElement.querySelector(`#services-${category}`);
        services.forEach(service => {
            const serviceCard = this.createServiceCard(service);
            servicesGrid.appendChild(serviceCard);
        });
        
        // Add toggle functionality
        const toggleBtn = sectionElement.querySelector('.category-toggle');
        const content = sectionElement.querySelector('.category-content');
        
        toggleBtn.addEventListener('click', () => {
            const isExpanded = toggleBtn.dataset.expanded === 'true';
            const newState = !isExpanded;

            toggleBtn.dataset.expanded = newState;

            // Replace icon SVG directly using feather.icons to avoid global feather.replace()
            const iconName = newState ? 'chevron-down' : 'chevron-right';
            const existing = toggleBtn.querySelector('svg, i');
            if (existing) existing.remove();
            if (window.feather && feather.icons[iconName]) {
                toggleBtn.insertAdjacentHTML('beforeend', feather.icons[iconName].toSvg({ width: 16, height: 16 }));
            }

            if (newState) {
                content.style.display = '';
                content.classList.add('slide-down');
            } else {
                content.style.display = 'none';
                content.classList.remove('slide-down');
            }

            // Save state to config
            if (window.dashboard) {
                window.dashboard.updateCategoryExpanded(category, newState);
            }
        });
        
        return sectionElement;
    },
    
    /**
     * Create toast notification
     */
    createToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} slide-up`;
        
        const iconMap = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        
        toast.innerHTML = `
            <div class="toast-content">
                <i data-feather="${iconMap[type] || 'info'}"></i>
                <span class="toast-message">${Utils.sanitizeHtml(message)}</span>
            </div>
            <button class="toast-close">
                <i data-feather="x"></i>
            </button>
        `;
        
        // Add close functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        // Auto-remove after duration
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
        
        // Add to container
        const container = document.getElementById('toast-container');
        container.appendChild(toast);
        
        // Replace icons
        feather.replace();
        
        return toast;
    },
    
    /**
     * Remove toast with animation
     */
    removeToast(toast) {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    },
    
    /**
     * Create loading spinner
     */
    createSpinner(size = 'medium') {
        const spinner = document.createElement('div');
        spinner.className = `spinner spinner-${size}`;
        spinner.innerHTML = '<div class="spinner-ring"></div>';
        return spinner;
    },
    
    /**
     * Handle service card click
     */
    handleServiceClick(service) {
        if (window.modals) {
            window.modals.showServiceDetails(service);
        }
    },
    
    /**
     * Handle service action buttons
     */
    handleServiceAction(service, action) {
        switch (action) {
            case 'details':
                this.handleServiceClick(service);
                break;
            case 'history':
                if (window.modals) {
                    window.modals.showServiceHistory(service);
                }
                break;
            default:
                console.warn('Unknown service action:', action);
        }
    },
    
    /**
     * Show/hide loading overlay
     */
    setLoadingState(loading) {
        const overlay = document.getElementById('loading-overlay');
        if (loading) {
            overlay.style.display = 'flex';
            overlay.style.opacity = '1';
        } else {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        }
    }
};

// CSS for additional components
const componentStyles = `
.service-card {
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    cursor: pointer;
    transition: all var(--transition-fast);
    position: relative;
    overflow: hidden;
}

.service-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    border-color: var(--border-accent);
}

.service-card.critical {
    border-left: 4px solid var(--status-critical);
}

.service-card.warning {
    border-left: 4px solid var(--status-average);
}

.service-card.healthy {
    border-left: 4px solid var(--status-operational);
}

.card-header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
}

.card-icon {
    width: 40px;
    height: 40px;
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    font-size: 18px;
}

.card-title {
    flex: 1;
    min-width: 0;
}

.card-title h4 {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 2px 0;
    white-space: normal;
    word-break: break-word;
    line-height: 1.3;
}

.priority {
    font-size: 0.75rem;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.025em;
}

.priority-critical { background: rgba(239, 68, 68, 0.1); color: var(--status-critical); }
.priority-high { background: rgba(251, 191, 36, 0.1); color: var(--status-average); }
.priority-medium { background: rgba(59, 130, 246, 0.1); color: var(--primary); }
.priority-low { background: rgba(107, 114, 128, 0.1); color: var(--status-na); }

.card-status {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
}

.status-text {
    font-size: 0.875rem;
    font-weight: 500;
}

.card-body {
    margin-bottom: var(--space-md);
}

.metric {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-sm);
}

.metric-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.metric-value {
    font-size: 0.875rem;
    font-weight: 600;
    font-family: var(--font-mono);
    color: var(--text-primary);
}

.response-excellent { color: var(--status-operational); }
.response-good { color: var(--status-ok); }
.response-average { color: var(--status-average); }
.response-poor { color: var(--status-poor); }
.response-na { color: var(--status-na); }

.card-problem {
    display: flex;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: rgba(251, 191, 36, 0.1);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-md);
}

.problem-icon {
    color: var(--status-average);
    font-size: 14px;
    flex-shrink: 0;
}

.problem-text {
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.4;
}

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: var(--space-md);
    border-top: 1px solid var(--border-primary);
}

.last-updated {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 0.75rem;
    color: var(--text-tertiary);
}

.card-actions {
    display: flex;
    gap: var(--space-xs);
}

.action-btn {
    width: 28px;
    height: 28px;
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-sm);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
}

.action-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--border-accent);
}

/* Category Sections */
.category-section {
    margin-bottom: var(--space-xl);
}

.category-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-lg);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.category-header:hover {
    background: var(--bg-tertiary);
}

.category-info {
    display: flex;
    align-items: center;
    gap: var(--space-md);
}

.category-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 18px;
}

.category-title h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 2px 0;
}

.service-count {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.category-status {
    display: flex;
    gap: var(--space-sm);
}

.status-badge {
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
    font-family: var(--font-mono);
}

.status-badge.healthy {
    background: rgba(16, 185, 129, 0.1);
    color: var(--status-operational);
}

.status-badge.warning {
    background: rgba(251, 191, 36, 0.1);
    color: var(--status-average);
}

.status-badge.critical {
    background: rgba(239, 68, 68, 0.1);
    color: var(--status-critical);
}

.category-toggle {
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

.category-toggle:hover {
    background: var(--bg-accent);
    color: var(--text-primary);
}

.category-content {
    border: 1px solid var(--border-primary);
    border-top: none;
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    padding: var(--space-lg);
    background: var(--bg-secondary);
}

.services-grid {
    display: grid;
    gap: var(--space-md);
    grid-template-columns: repeat(auto-fill, minmax(180px, 220px));
    justify-content: start;
}

/* ── Compact card tweaks ── */
.service-card {
    padding: var(--space-md);
}

.card-header {
    margin-bottom: var(--space-sm);
}

.card-icon {
    width: 32px;
    height: 32px;
    font-size: 14px;
}

.card-title h4 {
    font-size: 0.875rem;
}

.card-body {
    margin-bottom: var(--space-sm);
}

.card-footer {
    padding-top: var(--space-sm);
}

/* ══════════════════════════════════════
   COLUMNS VIEW — layout handled in styles.css (.dashboard.layout-columns)
══════════════════════════════════════ */

.col-view-column {
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    overflow: hidden;
    min-width: 0;
    width: 100%;
}

.col-view-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm) var(--space-md);
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);
}

.col-view-title {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-primary);
}

.col-view-count {
    font-size: 0.75rem;
    font-weight: 600;
    font-family: var(--font-mono);
    color: var(--text-tertiary);
    background: var(--bg-accent);
    padding: 1px 6px;
    border-radius: var(--radius-sm);
}

.col-view-body {
    display: flex;
    flex-direction: column;
}

.col-view-row {
    padding: var(--space-xs) var(--space-sm);
    border-bottom: 1px solid var(--border-primary);
    cursor: pointer;
    transition: background var(--transition-fast);
}

.col-view-row:last-child {
    border-bottom: none;
}

.col-view-row:hover {
    background: var(--bg-secondary);
}

.col-view-row.critical {
    border-left: 3px solid var(--status-critical);
}

.col-view-row.warning {
    border-left: 3px solid var(--status-average);
}

.col-view-row.healthy {
    border-left: 3px solid transparent;
}

.col-row-left {
    display: flex;
    align-items: flex-start;
    gap: var(--space-xs);
    min-width: 0;
}

.col-row-name {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-primary);
    white-space: normal;
    word-break: break-word;
    line-height: 1.3;
}

.col-row-right {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin-top: 2px;
}

.col-row-status {
    font-size: 0.7rem;
    font-weight: 500;
}

.col-row-alert {
    color: var(--status-average);
    line-height: 1;
    font-size: 12px;
}

.col-row-alert svg {
    width: 12px;
    height: 12px;
}

.col-row-problem {
    font-size: 0.7rem;
    color: var(--text-secondary);
    margin-top: 2px;
    padding-left: calc(10px + var(--space-xs));
    white-space: normal;
    word-break: break-word;
    line-height: 1.3;
}

.col-row-rt {
    font-size: 0.7rem;
    color: var(--text-secondary);
    margin-top: 2px;
    padding-left: calc(10px + var(--space-xs));
}

/* ══════════════════════════════════════
   TABLE VIEW
══════════════════════════════════════ */
.table-view-wrapper {
    width: 100%;
    overflow-x: auto;
}

.status-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    overflow: hidden;
}

.status-table thead tr {
    background: var(--bg-secondary);
    border-bottom: 2px solid var(--border-secondary);
}

.status-table th {
    padding: var(--space-sm) var(--space-md);
    text-align: left;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
    white-space: nowrap;
}

.status-table td {
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--border-primary);
    vertical-align: middle;
}

.table-row:last-child td {
    border-bottom: none;
}

.table-row:hover td {
    background: var(--bg-secondary);
}

.table-row.critical td:first-child {
    border-left: 3px solid var(--status-critical);
}

.table-row.warning td:first-child {
    border-left: 3px solid var(--status-average);
}

.table-row.healthy td:first-child {
    border-left: 3px solid var(--status-operational);
}

.tcol-name {
    font-weight: 500;
    color: var(--text-primary);
    min-width: 180px;
}

.tcol-category {
    min-width: 120px;
}

.table-category-tag {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    white-space: nowrap;
}

.tcol-status {
    min-width: 140px;
}

.table-status-cell {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
}

.tcol-rt {
    min-width: 110px;
    font-family: var(--font-mono);
    font-size: 0.8rem;
}

.tcol-problem {
    min-width: 200px;
    max-width: 400px;
}

.table-problem-text {
    color: var(--status-average);
    font-size: 0.8rem;
}

.table-no-problem {
    color: var(--text-tertiary);
}

/* Toast notifications */
.toast-container {
    position: fixed;
    top: var(--space-xl);
    right: var(--space-xl);
    z-index: var(--z-toast);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    max-width: 400px;
}

.toast {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    transition: all var(--transition-fast);
}

.toast-success {
    border-left: 4px solid var(--status-operational);
}

.toast-error {
    border-left: 4px solid var(--status-critical);
}

.toast-warning {
    border-left: 4px solid var(--status-average);
}

.toast-info {
    border-left: 4px solid var(--primary);
}

.toast-content {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex: 1;
}

.toast-message {
    font-size: 0.875rem;
    color: var(--text-primary);
}

.toast-close {
    width: 20px;
    height: 20px;
    border: none;
    background: none;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: color var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
}

.toast-close:hover {
    color: var(--text-primary);
}

.fade-out {
    opacity: 0;
    transform: translateX(100%);
}

.slide-down {
    animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        max-height: 0;
        padding: 0 var(--space-lg);
    }
    to {
        opacity: 1;
        max-height: 1000px;
        padding: var(--space-lg);
    }
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .services-grid {
        grid-template-columns: 1fr;
    }
    
    .toast-container {
        left: var(--space-md);
        right: var(--space-md);
        max-width: none;
    }
    
    .card-header {
        flex-wrap: wrap;
        gap: var(--space-sm);
    }
    
    .card-status {
        order: -1;
        flex-basis: 100%;
    }
}
`;

// Inject component styles
if (!document.querySelector('#component-styles')) {
    const style = document.createElement('style');
    style.id = 'component-styles';
    style.textContent = componentStyles;
    document.head.appendChild(style);
}

// Make components globally available
window.Components = Components;