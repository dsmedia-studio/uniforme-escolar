/**
 * GDF Uniforme Escolar - Excel Export Module
 * Generates multi-sheet Excel reports using SheetJS
 */

const ExcelExport = {
  /**
   * Initialize export module
   */
  init() {
    this.setupEventListeners();
  },

  /**
   * Setup event listeners for export buttons
   */
  setupEventListeners() {
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.showExportMenu(exportBtn));
    }

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('exportMenu');
      if (menu && !menu.contains(e.target) && e.target.id !== 'exportBtn') {
        menu.classList.remove('active');
      }
    });
  },

  /**
   * Show export menu dropdown
   * @param {HTMLElement} btn - Export button element
   */
  showExportMenu(btn) {
    let menu = document.getElementById('exportMenu');

    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'exportMenu';
      menu.className = 'export-menu';
      menu.innerHTML = `
        <button class="export-option" data-type="complete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Relatorio Completo
          <span class="export-desc">5 abas com todos os dados</span>
        </button>
        <button class="export-option" data-type="summary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          Resumo Executivo
          <span class="export-desc">Metricas principais</span>
        </button>
      `;
      document.body.appendChild(menu);

      // Add click handlers
      menu.querySelectorAll('.export-option').forEach(option => {
        option.addEventListener('click', (e) => {
          const type = e.currentTarget.dataset.type;
          this.exportReport(type);
          menu.classList.remove('active');
        });
      });
    }

    // Position menu
    const rect = btn.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 8}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;
    menu.classList.toggle('active');
  },

  /**
   * Export report to Excel
   * @param {string} type - Export type: 'complete' or 'summary'
   */
  exportReport(type) {
    if (!window.Dashboard?.data) {
      Dashboard.showToast('Dados nao disponiveis para exportar', 'error');
      return;
    }

    if (typeof XLSX === 'undefined') {
      Dashboard.showToast('Biblioteca de exportacao nao carregada', 'error');
      return;
    }

    const data = window.Dashboard.data;
    const workbook = XLSX.utils.book_new();

    // Add sheets based on type
    if (type === 'complete') {
      this.addDailySheet(workbook, data);
      this.addCreativeSheet(workbook, data);
      this.addDomainsSheet(workbook, data);
      this.addCreativePlacementSheet(workbook, data);
      this.addPlacementsSheet(workbook, data);
      this.addSummarySheet(workbook, data);
    } else {
      this.addSummarySheet(workbook, data);
    }

    // Generate filename with date
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `GDF_UniformeEscolar_${type === 'complete' ? 'Completo' : 'Resumo'}_${dateStr}.xlsx`;

    // Download
    XLSX.writeFile(workbook, filename);
    Dashboard.showToast(`Relatorio exportado: ${filename}`, 'success');
  },

  /**
   * Add daily data sheet
   * @param {object} workbook - XLSX workbook
   * @param {object} data - Dashboard data
   */
  addDailySheet(workbook, data) {
    if (!data.daily || data.daily.length === 0) return;

    const sheetData = [
      ['Data', 'Impressoes', 'Cliques', 'CTR (%)', 'Viewability (%)']
    ];

    data.daily.forEach(day => {
      sheetData.push([
        day.date,
        day.impressions,
        day.clicks,
        parseFloat(day.ctr?.toFixed(2) || 0),
        parseFloat(day.viewabilityRate?.toFixed(2) || 0)
      ]);
    });

    // Add totals row
    sheetData.push([]);
    sheetData.push([
      'TOTAL',
      data.summary.impressions,
      data.summary.clicks,
      parseFloat(data.summary.ctr?.toFixed(2) || 0),
      parseFloat(data.summary.viewabilityRate?.toFixed(2) || 0)
    ]);

    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    this.setColumnWidths(sheet, [12, 15, 12, 12, 15]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Dados Diarios');
  },

  /**
   * Add creative performance sheet
   * @param {object} workbook - XLSX workbook
   * @param {object} data - Dashboard data
   */
  addCreativeSheet(workbook, data) {
    if (!data.byReportingLabel || data.byReportingLabel.length === 0) return;

    const sheetData = [
      ['Reporting Label', 'Personagem', 'Headline', 'CTA', 'Impressoes', 'Cliques', 'CTR (%)', 'Viewability (%)']
    ];

    data.byReportingLabel.forEach(item => {
      sheetData.push([
        item.label,
        item.personagem || '',
        item.headline || '',
        item.cta || '',
        item.impressions,
        item.clicks,
        parseFloat(item.ctr?.toFixed(2) || 0),
        parseFloat(item.viewabilityRate?.toFixed(2) || 0)
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    this.setColumnWidths(sheet, [35, 12, 12, 10, 15, 12, 12, 15]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Por Criativo');
  },

  /**
   * Add domains sheet
   * @param {object} workbook - XLSX workbook
   * @param {object} data - Dashboard data
   */
  addDomainsSheet(workbook, data) {
    if (!data.byDomain || data.byDomain.length === 0) return;

    const sheetData = [
      ['Dominio / URL', 'Impressoes', 'Cliques', 'CTR (%)', 'Viewability (%)']
    ];

    data.byDomain.forEach(item => {
      sheetData.push([
        item.name,
        item.impressions,
        item.clicks,
        parseFloat(item.ctr?.toFixed(2) || 0),
        parseFloat(item.viewabilityRate?.toFixed(2) || 0)
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    this.setColumnWidths(sheet, [50, 15, 12, 12, 15]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Dominios');
  },

  /**
   * Add creative x placement sheet
   * @param {object} workbook - XLSX workbook
   * @param {object} data - Dashboard data
   */
  addCreativePlacementSheet(workbook, data) {
    if (!data.byCreativePlacement || data.byCreativePlacement.length === 0) return;

    const sheetData = [
      ['Criativo', 'Placement', 'Impressoes', 'Cliques', 'CTR (%)', 'Viewability (%)']
    ];

    data.byCreativePlacement.forEach(item => {
      sheetData.push([
        item.creative,
        item.placement,
        item.impressions,
        item.clicks,
        parseFloat(item.ctr?.toFixed(2) || 0),
        parseFloat(item.viewabilityRate?.toFixed(2) || 0)
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    this.setColumnWidths(sheet, [35, 40, 15, 12, 12, 15]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Criativo x Placement');
  },

  /**
   * Add placements sheet
   * @param {object} workbook - XLSX workbook
   * @param {object} data - Dashboard data
   */
  addPlacementsSheet(workbook, data) {
    if (!data.byPlacement || data.byPlacement.length === 0) return;

    const sheetData = [
      ['Placement', 'ID', 'Impressoes', 'Cliques', 'CTR (%)', 'Viewability (%)']
    ];

    data.byPlacement.forEach(item => {
      sheetData.push([
        item.name,
        item.placementId || '',
        item.impressions,
        item.clicks,
        parseFloat(item.ctr?.toFixed(2) || 0),
        parseFloat(item.viewabilityRate?.toFixed(2) || 0)
      ]);
    });

    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    this.setColumnWidths(sheet, [50, 15, 15, 12, 12, 15]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Placements');
  },

  /**
   * Add summary sheet
   * @param {object} workbook - XLSX workbook
   * @param {object} data - Dashboard data
   */
  addSummarySheet(workbook, data) {
    const sheetData = [
      ['RELATORIO DE PERFORMANCE - GDF UNIFORME ESCOLAR 2025'],
      [],
      ['Periodo:', `${data.campaign?.startDate || '--'} a ${data.campaign?.endDate || '--'}`],
      ['Gerado em:', new Date().toLocaleString('pt-BR')],
      [],
      ['METRICAS GERAIS'],
      ['Metrica', 'Valor'],
      ['Impressoes Totais', data.summary?.impressions || 0],
      ['Cliques Totais', data.summary?.clicks || 0],
      ['CTR Medio', `${(data.summary?.ctr || 0).toFixed(2)}%`],
      ['Viewability', `${(data.summary?.viewabilityRate || 0).toFixed(2)}%`],
      [],
      ['PERFORMANCE POR FORMATO'],
      ['Formato', 'Impressoes', 'Cliques', 'CTR (%)', 'Viewability (%)']
    ];

    // Add format data
    if (data.byFormat) {
      Object.keys(data.byFormat).forEach(format => {
        const item = data.byFormat[format];
        sheetData.push([
          format,
          item.impressions,
          item.clicks,
          parseFloat(item.ctr?.toFixed(2) || 0),
          parseFloat(item.viewabilityRate?.toFixed(2) || 0)
        ]);
      });
    }

    sheetData.push([]);
    sheetData.push(['PERFORMANCE POR PERSONAGEM']);
    sheetData.push(['Personagem', 'Impressoes', 'Cliques', 'CTR (%)', 'Viewability (%)']);

    // Add personagem data
    if (data.byPersonagem) {
      Object.keys(data.byPersonagem).forEach(personagem => {
        const item = data.byPersonagem[personagem];
        sheetData.push([
          personagem,
          item.impressions,
          item.clicks,
          parseFloat(item.ctr?.toFixed(2) || 0),
          parseFloat(item.viewabilityRate?.toFixed(2) || 0)
        ]);
      });
    }

    sheetData.push([]);
    sheetData.push(['TOP 5 CRIATIVOS POR CTR']);
    sheetData.push(['Ranking', 'Criativo', 'CTR (%)']);

    // Add top creatives
    if (data.byReportingLabel) {
      const topByCTR = [...data.byReportingLabel]
        .sort((a, b) => b.ctr - a.ctr)
        .slice(0, 5);
      topByCTR.forEach((item, i) => {
        sheetData.push([i + 1, item.label, `${(item.ctr || 0).toFixed(2)}%`]);
      });
    }

    sheetData.push([]);
    sheetData.push(['TOP 5 DOMINIOS POR IMPRESSOES']);
    sheetData.push(['Ranking', 'Dominio', 'Impressoes', 'Viewability (%)']);

    // Add top domains
    if (data.byDomain) {
      data.byDomain.slice(0, 5).forEach((item, i) => {
        sheetData.push([i + 1, item.name, item.impressions, `${(item.viewabilityRate || 0).toFixed(2)}%`]);
      });
    }

    sheetData.push([]);
    sheetData.push(['TOP 5 PLACEMENTS POR IMPRESSOES']);
    sheetData.push(['Ranking', 'Placement', 'Impressoes', 'Viewability (%)']);

    // Add top placements
    if (data.byPlacement) {
      data.byPlacement.slice(0, 5).forEach((item, i) => {
        sheetData.push([i + 1, item.name, item.impressions, `${(item.viewabilityRate || 0).toFixed(2)}%`]);
      });
    }

    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    this.setColumnWidths(sheet, [25, 45, 15, 12, 15]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Resumo');
  },

  /**
   * Set column widths for a sheet
   * @param {object} sheet - XLSX sheet
   * @param {array} widths - Array of column widths
   */
  setColumnWidths(sheet, widths) {
    sheet['!cols'] = widths.map(w => ({ wch: w }));
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.ExcelExport = ExcelExport;
}
