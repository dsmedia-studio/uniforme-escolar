/**
 * GDF Uniforme Escolar - Dashboard Main
 * Main dashboard logic and data management
 */

const Dashboard = {
  // Data state
  data: null,
  configData: null,
  isLoading: false,
  error: null,

  // Configuration
  config: {
    dataUrl: 'data/performance.json',
    configUrl: 'data/config.json',
    siteIdKey: 'cm360_site_id', // localStorage fallback
    refreshInterval: null // Set to milliseconds for auto-refresh
  },

  /**
   * Initialize the dashboard
   */
  async init() {
    // Initialize sub-modules
    Preview.init();

    // Setup event listeners
    this.setupEventListeners();

    // Load config first
    await this.loadConfig();

    // Load data
    await this.loadData();
  },

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Settings modal
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeModal = document.getElementById('closeModal');
    const cancelSettings = document.getElementById('cancelSettings');
    const saveSettings = document.getElementById('saveSettings');

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.openSettings());
    }

    if (closeModal) {
      closeModal.addEventListener('click', () => this.closeSettings());
    }

    if (cancelSettings) {
      cancelSettings.addEventListener('click', () => this.closeSettings());
    }

    if (saveSettings) {
      saveSettings.addEventListener('click', () => this.saveSettings());
    }

    // Close modal on overlay click
    if (settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
          this.closeSettings();
        }
      });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && settingsModal?.classList.contains('active')) {
        this.closeSettings();
      }
    });

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadData());
    }
  },

  /**
   * Load performance data
   */
  async loadData() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showLoading();

    try {
      const response = await fetch(this.config.dataUrl + '?t=' + Date.now());

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.data = await response.json();
      this.error = null;

      // Update UI
      this.updateMetricCards();
      this.updateTable();
      this.updateTimestamps();

      // Initialize/update charts
      Charts.init(this.data);

      // Update connection status
      this.updateConnectionStatus(true);

    } catch (err) {
      console.error('Failed to load data:', err);
      this.error = err.message;
      this.updateConnectionStatus(false, err.message);
      this.showError();
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  },

  /**
   * Show loading state
   */
  showLoading() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = `
        <div class="loading-spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
        Atualizando...
      `;
    }
  },

  /**
   * Hide loading state
   */
  hideLoading() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
        Atualizar
      `;
    }
  },

  /**
   * Show error state
   */
  showError() {
    // Could show an error banner or toast
    console.error('Dashboard error:', this.error);
  },

  /**
   * Update metric cards with summary data
   */
  updateMetricCards() {
    if (!this.data?.summary) return;

    const summary = this.data.summary;

    // Total Impressions
    const impressionsEl = document.getElementById('totalImpressions');
    if (impressionsEl) {
      impressionsEl.textContent = Utils.formatCompact(summary.impressions);
    }

    // Total Clicks
    const clicksEl = document.getElementById('totalClicks');
    if (clicksEl) {
      clicksEl.textContent = Utils.formatCompact(summary.clicks);
    }

    // Average CTR
    const ctrEl = document.getElementById('avgCTR');
    if (ctrEl) {
      ctrEl.textContent = Utils.formatPercent(summary.ctr);
    }

    // Average Viewability
    const viewabilityEl = document.getElementById('avgViewability');
    if (viewabilityEl) {
      viewabilityEl.textContent = Utils.formatPercent(summary.viewabilityRate);
    }
  },

  /**
   * Update timestamps display
   */
  updateTimestamps() {
    const lastUpdateEl = document.getElementById('lastUpdate');
    const nextUpdateEl = document.getElementById('nextUpdate');

    if (lastUpdateEl && this.data?.lastUpdated) {
      lastUpdateEl.textContent = Utils.formatDate(this.data.lastUpdated);
    }

    if (nextUpdateEl && this.data?.nextUpdate) {
      nextUpdateEl.textContent = Utils.formatDate(this.data.nextUpdate);
    }
  },

  /**
   * Update top performers table
   */
  updateTable() {
    const tableBody = document.getElementById('topPerformersTable');
    if (!tableBody || !this.data?.byReportingLabel) return;

    // Get top 10 by CTR
    const topPerformers = Utils.getTopN(this.data.byReportingLabel, 'ctr', 10);

    // Calculate average CTR for trend indicator
    const avgCTR = this.data.summary?.ctr || 0;

    // Build table rows
    const rows = topPerformers.map((item, index) => {
      const { personagem } = Utils.parseReportingLabel(item.label);
      const icon = Utils.getPersonagemIcon(personagem);
      const trend = Utils.getTrend(item.ctr, avgCTR);

      let trendIndicator = '';
      if (trend === 'up') {
        trendIndicator = '<span class="ctr-indicator ctr-up">&#9650;</span>';
      } else if (trend === 'down') {
        trendIndicator = '<span class="ctr-indicator ctr-down">&#9660;</span>';
      }

      return `
        <tr data-label="${item.label}">
          <td class="td-rank">${index + 1}</td>
          <td class="td-label">
            <span class="label-text">
              <span class="label-icon">${icon}</span>
              ${item.label}
            </span>
          </td>
          <td class="td-number">${Utils.formatCompact(item.impressions)}</td>
          <td class="td-number">${Utils.formatNumber(item.clicks)}</td>
          <td class="td-number">${Utils.formatPercent(item.ctr)} ${trendIndicator}</td>
          <td class="td-number">${Utils.formatPercent(item.viewabilityRate)}</td>
        </tr>
      `;
    }).join('');

    tableBody.innerHTML = rows;

    // Attach preview handlers
    const tableRows = tableBody.querySelectorAll('tr');
    Preview.attachToRows(tableRows);
  },

  /**
   * Open settings modal
   */
  openSettings() {
    const modal = document.getElementById('settingsModal');
    const input = document.getElementById('siteIdInput');

    if (modal) {
      modal.classList.add('active');
    }

    if (input) {
      const savedId = Utils.getStorage(this.config.siteIdKey, '');
      input.value = savedId;
      input.focus();
    }
  },

  /**
   * Close settings modal
   */
  closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.classList.remove('active');
    }
  },

  /**
   * Save settings
   * Since GitHub Pages is static, we can't save directly to the repository.
   * The modal shows instructions on how to update the config.json file.
   */
  saveSettings() {
    this.closeSettings();
    this.showToast('Edite config.json para salvar', 'info');
  },

  /**
   * Show a toast notification
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span>${message}</span>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  /**
   * Load configuration from config.json
   * The config.json is the source of truth - it's committed to the repository
   * and used by GitHub Actions for syncing.
   */
  async loadConfig() {
    try {
      const response = await fetch(this.config.configUrl + '?t=' + Date.now());
      if (response.ok) {
        this.configData = await response.json();

        // Update input field with Site ID from config
        const input = document.getElementById('siteIdInput');
        if (input && this.configData?.cm360?.siteId) {
          input.value = this.configData.cm360.siteId;
        }

        // Update connection status based on whether we have data
        this.updateConnectionStatus(!!this.configData?.cm360?.siteId);
      }
    } catch (err) {
      console.warn('Could not load config:', err.message);
      this.updateConnectionStatus(false);
    }
  },

  /**
   * Update connection status display
   * @param {boolean} connected - Whether connected
   * @param {string} message - Optional status message
   */
  updateConnectionStatus(connected, message = '') {
    const statusBadge = document.getElementById('connectionStatus');
    if (!statusBadge) return;

    statusBadge.classList.remove('connected', 'error');

    if (connected) {
      statusBadge.classList.add('connected');
      statusBadge.querySelector('.status-text').textContent = 'Dados carregados';
    } else if (message) {
      statusBadge.classList.add('error');
      statusBadge.querySelector('.status-text').textContent = message || 'Erro ao carregar';
    } else {
      statusBadge.querySelector('.status-text').textContent = 'Aguardando configuracao';
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Dashboard.init();
});

// Export for use in console/debugging
if (typeof window !== 'undefined') {
  window.Dashboard = Dashboard;
}
