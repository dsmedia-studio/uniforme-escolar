/**
 * GDF Uniforme Escolar - Dashboard Creative Preview
 * Hover preview functionality for creative combinations
 */

const Preview = {
  // Preview tooltip element
  tooltip: null,
  iframe: null,
  formatLabel: null,
  previewLabel: null,

  // Current preview state
  currentLabel: null,
  isVisible: false,

  // Debounced hide function
  hideTimeout: null,

  /**
   * Initialize preview system
   */
  init() {
    this.tooltip = document.getElementById('previewTooltip');
    this.iframe = document.getElementById('previewIframe');
    this.formatLabel = document.getElementById('previewFormat');
    this.previewLabel = document.getElementById('previewLabel');

    if (!this.tooltip) {
      console.warn('Preview tooltip element not found');
      return;
    }

    // Add global mouse move listener for positioning
    document.addEventListener('mousemove', (e) => {
      if (this.isVisible) {
        this.positionTooltip(e);
      }
    });
  },

  /**
   * Show preview for a reporting label
   * @param {string} label - Reporting label
   * @param {HTMLElement} element - Trigger element
   * @param {MouseEvent} event - Mouse event
   */
  show(label, element, event) {
    if (!this.tooltip || !label) return;

    // Clear any pending hide
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Don't reload if same label
    if (this.currentLabel === label && this.isVisible) {
      this.positionTooltip(event);
      return;
    }

    this.currentLabel = label;

    // Parse the label
    const { personagem, headline, cta } = Utils.parseReportingLabel(label);

    // Map headline format (titulo01 -> H01, or keep as-is)
    const headlineParam = this.mapHeadline(headline);
    const ctaParam = this.mapCTA(cta);

    // Build preview URL (always use 300x250 for preview)
    const previewUrl = this.buildPreviewUrl('300x250', personagem, headlineParam, ctaParam);

    // Update iframe source
    if (this.iframe) {
      this.iframe.src = previewUrl;
    }

    // Update labels
    if (this.formatLabel) {
      this.formatLabel.textContent = '300x250 - Preview';
    }
    if (this.previewLabel) {
      const personagemName = Utils.getPersonagemName(personagem);
      this.previewLabel.textContent = `${personagemName} • ${headline} • ${cta}`;
    }

    // Position and show tooltip
    this.positionTooltip(event);
    this.tooltip.classList.add('active');
    this.isVisible = true;
  },

  /**
   * Hide the preview tooltip
   */
  hide() {
    // Debounce hide to prevent flicker when moving between cells
    this.hideTimeout = setTimeout(() => {
      if (this.tooltip) {
        this.tooltip.classList.remove('active');
      }
      this.isVisible = false;
      this.currentLabel = null;
    }, 100);
  },

  /**
   * Force immediate hide
   */
  hideImmediate() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    if (this.tooltip) {
      this.tooltip.classList.remove('active');
    }
    this.isVisible = false;
    this.currentLabel = null;
  },

  /**
   * Position tooltip near the mouse cursor
   * @param {MouseEvent} event - Mouse event
   */
  positionTooltip(event) {
    if (!this.tooltip) return;

    const padding = 20;
    const tooltipWidth = 180;
    const tooltipHeight = 200;

    let x = event.clientX + padding;
    let y = event.clientY - tooltipHeight / 2;

    // Check right edge
    if (x + tooltipWidth > window.innerWidth - padding) {
      x = event.clientX - tooltipWidth - padding;
    }

    // Check bottom edge
    if (y + tooltipHeight > window.innerHeight - padding) {
      y = window.innerHeight - tooltipHeight - padding;
    }

    // Check top edge
    if (y < padding) {
      y = padding;
    }

    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  },

  /**
   * Build preview URL for iframe
   * @param {string} format - Format (e.g., '300x250')
   * @param {string} personagem - Personagem ID
   * @param {string} headline - Headline code
   * @param {string} cta - CTA code
   * @returns {string} Preview URL
   */
  buildPreviewUrl(format, personagem, headline, cta) {
    const params = new URLSearchParams();

    if (personagem) {
      // Map personagem names to expected values
      const personagemMap = {
        'menina': 'menina01',
        'menina01': 'menina01',
        'menino01': 'menino01',
        'menino02': 'menino02'
      };
      params.set('personagem', personagemMap[personagem] || personagem);
    }

    if (headline) {
      params.set('headline', headline);
    }

    if (cta) {
      params.set('cta', cta);
    }

    params.set('t', Date.now()); // Cache buster

    return `../${format}/index.html?${params.toString()}`;
  },

  /**
   * Map headline from reporting label format to URL parameter format
   * @param {string} headline - Headline from label (e.g., 'titulo01' or 'h01')
   * @returns {string} Mapped headline (e.g., 'H01')
   */
  mapHeadline(headline) {
    if (!headline) return 'H01';

    // If already in H format
    if (headline.toUpperCase().startsWith('H')) {
      return headline.toUpperCase();
    }

    // Map titulo01 -> H01
    const match = headline.match(/titulo?(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      return `H${num.toString().padStart(2, '0')}`;
    }

    return 'H01';
  },

  /**
   * Map CTA from reporting label format to URL parameter format
   * @param {string} cta - CTA from label (e.g., 'cta01' or 'c01')
   * @returns {string} Mapped CTA (e.g., 'C01')
   */
  mapCTA(cta) {
    if (!cta) return 'C01';

    // If already in C format
    if (cta.toUpperCase().startsWith('C') && !cta.toLowerCase().startsWith('cta')) {
      return cta.toUpperCase();
    }

    // Map cta01 -> C01
    const match = cta.match(/cta?(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      return `C${num.toString().padStart(2, '0')}`;
    }

    return 'C01';
  },

  /**
   * Attach preview handlers to table rows
   * @param {NodeList|Array} rows - Table row elements with data-label attribute
   */
  attachToRows(rows) {
    rows.forEach(row => {
      const labelCell = row.querySelector('.td-label');
      if (!labelCell) return;

      const label = row.dataset.label;
      if (!label) return;

      // Mouse enter
      labelCell.addEventListener('mouseenter', (e) => {
        this.show(label, labelCell, e);
      });

      // Mouse leave
      labelCell.addEventListener('mouseleave', () => {
        this.hide();
      });

      // Mouse move (for repositioning)
      labelCell.addEventListener('mousemove', (e) => {
        if (this.isVisible) {
          this.positionTooltip(e);
        }
      });
    });
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.Preview = Preview;
}
