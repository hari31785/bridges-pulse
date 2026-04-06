/**
 * API Client for Bridges Pulse
 * Handles all communication with the backend API
 */

class ApiClient {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minute
    }

    /**
     * Generic request method with error handling and caching
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const cacheKey = `${url}:${JSON.stringify(options)}`;
        
        // Check cache for GET requests
        if (!options.method || options.method === 'GET') {
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            
            // Cache successful GET requests
            if (!options.method || options.method === 'GET') {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Services API
     */
    async getServices() {
        return this.request('/services');
    }

    async getServicesByCategory(category) {
        return this.request(`/services/category/${category}`);
    }

    async getServiceHistory(timeRange = '24h') {
        return this.request(`/services/history/${timeRange}`);
    }

    async updateServiceStatus(category, serviceId, status, problemStatement) {
        return this.request(`/services/${category}/${serviceId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, problemStatement })
        });
    }

    /**
     * Reports API
     */
    async getUptimeReport(period = 'weekly') {
        return this.request(`/reports/uptime/${period}`);
    }

    async getSLAReport(period = 'monthly') {
        return this.request(`/reports/sla/${period}`);
    }

    async getIncidentsReport(period = 'monthly') {
        return this.request(`/reports/incidents/${period}`);
    }

    async getDashboardReport(period = 'daily') {
        return this.request(`/reports/dashboard/${period}`);
    }

    async saveReport(type, data, filename) {
        return this.request(`/reports/save/${type}`, {
            method: 'POST',
            body: JSON.stringify({ data, filename })
        });
    }

    /**
     * Configuration API
     */
    async getConfig() {
        return this.request('/config');
    }

    async updateConfig(config) {
        return this.request('/config', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    }

    async getLayoutConfig() {
        return this.request('/config/layout');
    }

    async updateLayoutConfig(layout, categories, theme) {
        return this.request('/config/layout', {
            method: 'PUT',
            body: JSON.stringify({ layout, categories, theme })
        });
    }

    async addService(category, service) {
        return this.request(`/config/service/${category}`, {
            method: 'POST',
            body: JSON.stringify(service)
        });
    }

    async removeService(category, serviceId) {
        return this.request(`/config/service/${category}/${serviceId}`, {
            method: 'DELETE'
        });
    }

    async exportConfig() {
        return this.request('/config/export');
    }

    async importConfig(configData) {
        return this.request('/config/import', {
            method: 'POST',
            body: JSON.stringify(configData)
        });
    }

    /**
     * Health check
     */
    async healthCheck() {
        return this.request('/health');
    }

    /**
     * Service update (Ops page)
     */
    async updateService(category, serviceId, fields) {
        this.clearCache();
        return this.request(`/services/${encodeURIComponent(category)}/${encodeURIComponent(serviceId)}/status`, {
            method: 'PATCH',
            body: JSON.stringify(fields)
        });
    }

    /**
     * Ops broadcast API
     */
    async getBroadcast() {
        return this.request('/ops/broadcast');
    }

    async setBroadcast(message, severity, updatedBy) {
        this.clearCache();
        return this.request('/ops/broadcast', {
            method: 'PUT',
            body: JSON.stringify({ message, severity, updatedBy })
        });
    }

    async clearBroadcast() {
        this.clearCache();
        return this.request('/ops/broadcast', { method: 'DELETE' });
    }
}

// Create global API instance
window.api = new ApiClient();