/**
 * Utility Functions for Bridges Pulse
 * Common helper functions and utilities
 */

const Utils = {
    /**
     * Debounce function calls
     */
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },

    /**
     * Throttle function calls
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Format date/time
     */
    formatDate(date, options = {}) {
        const defaultOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        
        return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
    },

    /**
     * Format relative time (e.g., "2 minutes ago")
     */
    formatRelativeTime(date) {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    },

    /**
     * Format duration in ms to human readable
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    },

    /**
     * Status classification helpers
     */
    getStatusType(status) {
        const s = (status || '').toLowerCase();
        if (s.includes('operational') || s === 'ok' || s.includes('running') || s.includes('excellent')) {
            return 'healthy';
        }
        if (s.includes('average') || s.includes('warning')) {
            return 'warning';
        }
        if (s.includes('poor') || s.includes('error') || s.includes('critical') || s.includes('down')) {
            return 'critical';
        }
        return 'unknown';
    },

    // Returns effective status type — upgrades healthy → warning if a problem statement exists
    getEffectiveStatusType(service) {
        const type = this.getStatusType(service.status);
        if (type === 'healthy' && service.problemStatement && service.problemStatement.trim()) {
            return 'warning';
        }
        return type;
    },

    getStatusClass(status) {
        const type = this.getStatusType(status);
        return `status-${type}`;
    },

    getDotClass(status) {
        const type = this.getStatusType(status);
        switch (type) {
            case 'healthy': return 'dot-green';
            case 'warning': return 'dot-yellow';
            case 'critical': return 'dot-red';
            default: return 'dot-grey';
        }
    },

    /**
     * Response time formatting
     */
    formatResponseTime(responseTime) {
        if (!responseTime || responseTime === 'NA') return 'N/A';
        
        const match = responseTime.toString().match(/([0-9.]+)([a-zA-Z]+)?/);
        if (!match) return responseTime;
        
        const value = parseFloat(match[1]);
        const unit = match[2] || 'ms';
        
        if (unit === 'ms' && value >= 1000) {
            return `${(value / 1000).toFixed(1)}s`;
        }
        
        return `${value}${unit}`;
    },

    /**
     * Get response time performance class
     */
    getResponseTimeClass(responseTime) {
        if (!responseTime || responseTime === 'NA') return 'response-na';
        
        const value = parseFloat(responseTime);
        if (isNaN(value)) return 'response-na';
        
        // Convert to milliseconds if needed
        let ms = value;
        if (responseTime.includes('s') && !responseTime.includes('ms')) {
            ms = value * 1000;
        }
        
        if (ms <= 100) return 'response-excellent';
        if (ms <= 300) return 'response-good';
        if (ms <= 1000) return 'response-average';
        return 'response-poor';
    },

    /**
     * Generate unique ID
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Deep clone object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
        return obj;
    },

    /**
     * Sanitize HTML to prevent XSS
     */
    sanitizeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    },

    /**
     * Get icon for service type
     */
    getServiceIcon(iconName) {
        const iconMap = {
            'globe': 'globe',
            'refresh': 'refresh-cw',
            'server': 'server',
            'database': 'database',
            'table': 'grid',
            'git-merge': 'git-merge',
            'code': 'code',
            'shield': 'shield',
            'file-text': 'file-text',
            'folder': 'folder',
            'compass': 'navigation',
            'music': 'music',
            'message-square': 'message-square',
            'hub': 'hub',
            'bar-chart': 'bar-chart',
            'google': 'chrome',
            'cloud': 'cloud',
            'sliders': 'sliders',
            'toggle-right': 'toggle-right',
            'edit': 'edit',
            'monitor': 'monitor',
            'map-pin': 'map-pin',
            'mail': 'mail',
            'repeat': 'repeat',
            'upload-cloud': 'upload-cloud',
            'download-cloud': 'download-cloud',
            'layers': 'layers'
        };
        
        return iconMap[iconName] || 'circle';
    },

    /**
     * Local storage helpers
     */
    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.warn('Failed to get from localStorage:', error);
                return defaultValue;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.warn('Failed to save to localStorage:', error);
                return false;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.warn('Failed to remove from localStorage:', error);
                return false;
            }
        }
    },

    /**
     * Download data as file
     */
    downloadFile(data, filename, type = 'application/json') {
        const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Show notification (if supported)
     */
    showNotification(title, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            return new Notification(title, {
                icon: '/assets/favicon.ico',
                badge: '/assets/favicon.ico',
                ...options
            });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    return new Notification(title, options);
                }
            });
        }
        return null;
    }
};

// Make utils globally available
window.Utils = Utils;