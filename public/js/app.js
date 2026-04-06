/**
 * App Entry Point - Bridges Pulse
 * Initializes all modules, clock, theme, and wires everything together
 */

class AppManager {
    constructor() {
        this.initialized = false;
    }

    async init() {
        try {
            // Initialize modules
            window.dashboard = new Dashboard();
            window.modals = new Modals();

            // Start live clock
            this.startClock();

            // Apply saved theme immediately
            const savedTheme = Utils.storage.get('bp_theme', 'light');
            document.body.className = `theme-${savedTheme}`;
            this.updateThemeIcon(savedTheme);

            // Wire theme toggle button
            const themeBtn = document.getElementById('theme-toggle');
            if (themeBtn) {
                themeBtn.addEventListener('click', () => { this.toggleTheme(); this.closeMenu(); });
            }

            // Wire layout toggle button
            const layoutBtn = document.getElementById('layout-toggle');
            if (layoutBtn) {
                layoutBtn.addEventListener('click', () => { this.toggleLayout(); this.closeMenu(); });
            }

            // Wire hamburger menu
            const menuToggle = document.getElementById('menu-toggle');
            const navMenu = document.getElementById('nav-menu');
            if (menuToggle && navMenu) {
                menuToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = navMenu.classList.toggle('open');
                    menuToggle.classList.toggle('open', isOpen);
                    menuToggle.setAttribute('aria-expanded', isOpen);
                });
                document.addEventListener('click', (e) => {
                    if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
                        this.closeMenu();
                    }
                });
                navMenu.querySelectorAll('button.nav-item').forEach(btn => {
                    btn.addEventListener('click', () => this.closeMenu());
                });
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') this.closeMenu();
                });
            }

            // Request notification permissions (non-blocking)
            this.requestNotificationPermission();

            // Load and render the dashboard
            const success = await window.dashboard.init();

            // Hide loading overlay
            Components.setLoadingState(false);

            if (success) {
                // Welcome toast on first load
                const isFirstVisit = !Utils.storage.get('bp_visited');
                if (isFirstVisit) {
                    Utils.storage.set('bp_visited', true);
                    setTimeout(() => {
                        Components.createToast('Welcome to Bridges Pulse! 🚀', 'success', 4000);
                    }, 500);
                }

                // Check for critical services and notify
                this.checkCriticalAlerts();
            }

            this.initialized = true;
        } catch (error) {
            console.error('App initialization failed:', error);
            Components.setLoadingState(false);
            Components.createToast('Failed to initialize Bridges Pulse. Please refresh.', 'error', 0);
        }
    }

    startClock() {
        const timeEl = document.getElementById('current-time');
        if (!timeEl) return;

        const update = () => {
            timeEl.textContent = Utils.formatDate(new Date());
        };

        update();
        setInterval(update, 1000);
    }

    toggleTheme() {
        const isDark = document.body.classList.contains('theme-dark');
        const newTheme = isDark ? 'light' : 'dark';
        document.body.className = `theme-${newTheme}`;
        Utils.storage.set('bp_theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        const icon = document.getElementById('theme-icon');
        if (icon) {
            icon.setAttribute('data-feather', theme === 'dark' ? 'moon' : 'sun');
            if (window.feather) feather.replace();
        }
        const label = document.getElementById('theme-label');
        if (label) label.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
    }

    closeMenu() {
        const navMenu = document.getElementById('nav-menu');
        const menuToggle = document.getElementById('menu-toggle');
        if (navMenu) navMenu.classList.remove('open');
        if (menuToggle) {
            menuToggle.classList.remove('open');
            menuToggle.setAttribute('aria-expanded', 'false');
        }
    }

    toggleLayout() {
        const dashboard = window.dashboard;
        if (!dashboard) return;

        const newView = dashboard.currentView === 'grid' ? 'list' : 'grid';
        dashboard.setView(newView);

        // Update icon
        const icon = document.getElementById('layout-icon');
        if (icon) {
            icon.setAttribute('data-feather', newView === 'grid' ? 'grid' : 'list');
            if (window.feather) feather.replace();
        }

        // Update label
        const label = document.getElementById('layout-label');
        if (label) label.textContent = newView === 'grid' ? 'Grid View' : 'List View';

        // Update view buttons
        document.querySelectorAll('.view-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.view === newView);
        });
    }

    checkCriticalAlerts() {
        if (!window.dashboard?.services?.services) return;

        const criticalServices = [];
        const { services } = window.dashboard.services;

        Object.values(services).forEach((category) => {
            category.forEach((service) => {
                if (Utils.getStatusType(service.status) === 'critical') {
                    criticalServices.push(service.name);
                }
            });
        });

        if (criticalServices.length > 0) {
            const names = criticalServices.slice(0, 3).join(', ');
            const more = criticalServices.length > 3 ? ` +${criticalServices.length - 3} more` : '';
            setTimeout(() => {
                Components.createToast(`Critical: ${names}${more} need attention`, 'warning', 8000);
            }, 1500);

            // Browser notification
            Utils.showNotification('Bridges Pulse Alert', {
                body: `${criticalServices.length} service(s) require attention`,
                tag: 'bp-critical-alert'
            });
        }
    }

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            // Don't prompt immediately — wait until user has seen the app
            setTimeout(() => {
                Notification.requestPermission();
            }, 5000);
        }
    }
}

// Boot the app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    window.appManager = new AppManager();
    await window.appManager.init();

    // Final feather icon pass after everything is rendered
    if (window.feather) feather.replace();
});
