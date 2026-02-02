/**
 * GDF Uniforme Escolar - Dashboard Utilities
 * Helper functions for data formatting and manipulation
 */

const Utils = {
  /**
   * Format a number with thousand separators
   * @param {number} num - Number to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted number
   */
  formatNumber(num, decimals = 0) {
    if (num === null || num === undefined || isNaN(num)) return '--';

    const parts = num.toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  },

  /**
   * Format a number in compact form (K, M, B)
   * @param {number} num - Number to format
   * @returns {string} Compact formatted number
   */
  formatCompact(num) {
    if (num === null || num === undefined || isNaN(num)) return '--';

    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1).replace('.', ',') + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace('.', ',') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace('.', ',') + 'K';
    }
    return num.toString();
  },

  /**
   * Format a percentage value
   * @param {number} value - Value to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted percentage
   */
  formatPercent(value, decimals = 2) {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return value.toFixed(decimals).replace('.', ',') + '%';
  },

  /**
   * Format a date string to locale format
   * @param {string} dateStr - ISO date string
   * @returns {string} Formatted date
   */
  formatDate(dateStr) {
    if (!dateStr) return '--';

    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  },

  /**
   * Format a date for chart labels (short format)
   * @param {string} dateStr - ISO date string or YYYY-MM-DD
   * @returns {string} Short formatted date
   */
  formatDateShort(dateStr) {
    if (!dateStr) return '';

    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  },

  /**
   * Parse a Reporting Label into its components
   * Format: personagem_headline_cta (e.g., menina_titulo01_cta01)
   * @param {string} label - Reporting label
   * @returns {object} Parsed components
   */
  parseReportingLabel(label) {
    if (!label) return { personagem: '', headline: '', cta: '' };

    const parts = label.toLowerCase().split('_');

    // Handle different label formats
    let personagem = '';
    let headline = '';
    let cta = '';

    parts.forEach(part => {
      if (part.startsWith('menina') || part.startsWith('menino')) {
        personagem = part;
      } else if (part.startsWith('titulo') || part.startsWith('h0') || part.startsWith('h1')) {
        headline = part;
      } else if (part.startsWith('cta') || part.startsWith('c0')) {
        cta = part;
      }
    });

    return { personagem, headline, cta };
  },

  /**
   * Get display name for a personagem
   * @param {string} personagem - Personagem ID
   * @returns {string} Display name
   */
  getPersonagemName(personagem) {
    const names = {
      'menina': 'Menina',
      'menina01': 'Menina',
      'menino01': 'Menino 1',
      'menino02': 'Menino 2'
    };
    return names[personagem] || personagem;
  },

  /**
   * Get emoji icon for a personagem
   * @param {string} personagem - Personagem ID
   * @returns {string} Emoji icon
   */
  getPersonagemIcon(personagem) {
    const icons = {
      'menina': '👧',
      'menina01': '👧',
      'menino01': '👦',
      'menino02': '👱'
    };
    return icons[personagem] || '👤';
  },

  /**
   * Get format display name
   * @param {string} format - Format dimensions
   * @returns {string} Display name
   */
  getFormatName(format) {
    const names = {
      '300x250': 'Medium Rectangle',
      '468x60': 'Full Banner',
      '728x90': 'Leaderboard',
      '970x250': 'Billboard'
    };
    return names[format] || format;
  },

  /**
   * Calculate CTR from impressions and clicks
   * @param {number} impressions - Number of impressions
   * @param {number} clicks - Number of clicks
   * @returns {number} CTR percentage
   */
  calculateCTR(impressions, clicks) {
    if (!impressions || impressions === 0) return 0;
    return (clicks / impressions) * 100;
  },

  /**
   * Calculate Viewability rate
   * @param {number} viewable - Viewable impressions
   * @param {number} eligible - Eligible impressions
   * @returns {number} Viewability percentage
   */
  calculateViewability(viewable, eligible) {
    if (!eligible || eligible === 0) return 0;
    return (viewable / eligible) * 100;
  },

  /**
   * Get trend indicator
   * @param {number} value - Current value
   * @param {number} average - Average value
   * @returns {string} 'up', 'down', or 'neutral'
   */
  getTrend(value, average) {
    if (!value || !average) return 'neutral';
    const diff = ((value - average) / average) * 100;
    if (diff > 5) return 'up';
    if (diff < -5) return 'down';
    return 'neutral';
  },

  /**
   * Sort data by a specific field
   * @param {array} data - Array of objects
   * @param {string} field - Field to sort by
   * @param {string} order - 'asc' or 'desc'
   * @returns {array} Sorted array
   */
  sortBy(data, field, order = 'desc') {
    return [...data].sort((a, b) => {
      const aVal = a[field] || 0;
      const bVal = b[field] || 0;
      return order === 'desc' ? bVal - aVal : aVal - bVal;
    });
  },

  /**
   * Get top N items from array
   * @param {array} data - Array of objects
   * @param {string} field - Field to sort by
   * @param {number} n - Number of items
   * @returns {array} Top N items
   */
  getTopN(data, field, n = 10) {
    return this.sortBy(data, field, 'desc').slice(0, n);
  },

  /**
   * Group data by a field
   * @param {array} data - Array of objects
   * @param {string} field - Field to group by
   * @returns {object} Grouped data
   */
  groupBy(data, field) {
    return data.reduce((acc, item) => {
      const key = item[field] || 'unknown';
      if (!acc[key]) {
        acc[key] = {
          items: [],
          impressions: 0,
          clicks: 0,
          viewableImpressions: 0,
          eligibleImpressions: 0
        };
      }
      acc[key].items.push(item);
      acc[key].impressions += item.impressions || 0;
      acc[key].clicks += item.clicks || 0;
      acc[key].viewableImpressions += item.viewableImpressions || 0;
      acc[key].eligibleImpressions += item.eligibleImpressions || 0;
      return acc;
    }, {});
  },

  /**
   * Debounce function calls
   * @param {function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {function} Debounced function
   */
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Deep clone an object
   * @param {object} obj - Object to clone
   * @returns {object} Cloned object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Get a value from localStorage with default
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if not found
   * @returns {any} Stored or default value
   */
  getStorage(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.warn('Error reading from localStorage:', e);
      return defaultValue;
    }
  },

  /**
   * Set a value in localStorage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Error writing to localStorage:', e);
    }
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.Utils = Utils;
}
