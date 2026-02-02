/**
 * GDF Uniforme Escolar - Dashboard Charts
 * Chart.js configuration and rendering
 */

const Charts = {
  // Chart instances
  instances: {
    daily: null,
    format: null,
    personagem: null
  },

  // Common chart options
  commonOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#1e1e2e',
        titleColor: '#ffffff',
        bodyColor: '#8888a0',
        borderColor: '#2a2a3e',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          family: "'Inter', sans-serif",
          size: 13,
          weight: 600
        },
        bodyFont: {
          family: "'Inter', sans-serif",
          size: 12
        },
        callbacks: {
          label: function(context) {
            const value = context.parsed.y || context.parsed;
            if (typeof value === 'number') {
              return context.dataset.label + ': ' + Utils.formatNumber(value);
            }
            return context.dataset.label + ': ' + value;
          }
        }
      }
    }
  },

  // Color palette
  colors: {
    impressions: '#3b82f6',
    impressionsLight: 'rgba(59, 130, 246, 0.1)',
    clicks: '#22c55e',
    clicksLight: 'rgba(34, 197, 94, 0.1)',
    ctr: '#f59e0b',
    viewability: '#8b5cf6',
    personagem: ['#FFCB08', '#3b82f6', '#22c55e'],
    format: ['#FFCB08', '#3b82f6', '#22c55e', '#8b5cf6']
  },

  /**
   * Initialize all charts
   * @param {object} data - Performance data
   */
  init(data) {
    this.renderDailyChart(data.daily || []);
    this.renderFormatChart(data.byFormat || {});
    this.renderPersonagemChart(data.byPersonagem || {});
  },

  /**
   * Update all charts with new data
   * @param {object} data - Performance data
   */
  update(data) {
    this.updateDailyChart(data.daily || []);
    this.updateFormatChart(data.byFormat || {});
    this.updatePersonagemChart(data.byPersonagem || {});
  },

  /**
   * Destroy all chart instances
   */
  destroy() {
    Object.values(this.instances).forEach(chart => {
      if (chart) chart.destroy();
    });
    this.instances = { daily: null, format: null, personagem: null };
  },

  /**
   * Render daily performance line chart
   * @param {array} dailyData - Daily metrics array
   */
  renderDailyChart(dailyData) {
    const ctx = document.getElementById('dailyChart');
    if (!ctx) return;

    // Destroy existing chart
    if (this.instances.daily) {
      this.instances.daily.destroy();
    }

    // Prepare data
    const labels = dailyData.map(d => Utils.formatDateShort(d.date));
    const impressions = dailyData.map(d => d.impressions || 0);
    const clicks = dailyData.map(d => d.clicks || 0);

    this.instances.daily = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Impressoes',
            data: impressions,
            borderColor: this.colors.impressions,
            backgroundColor: this.colors.impressionsLight,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: this.colors.impressions,
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
            yAxisID: 'y'
          },
          {
            label: 'Cliques',
            data: clicks,
            borderColor: this.colors.clicks,
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: this.colors.clicks,
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
            borderDash: [5, 5],
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        ...this.commonOptions,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(42, 42, 62, 0.5)',
              drawBorder: false
            },
            ticks: {
              color: '#5a5a70',
              font: {
                family: "'Inter', sans-serif",
                size: 11
              },
              maxRotation: 0
            }
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: {
              color: 'rgba(42, 42, 62, 0.5)',
              drawBorder: false
            },
            ticks: {
              color: '#5a5a70',
              font: {
                family: "'Inter', sans-serif",
                size: 11
              },
              callback: function(value) {
                return Utils.formatCompact(value);
              }
            }
          },
          y1: {
            type: 'linear',
            position: 'right',
            grid: {
              display: false
            },
            ticks: {
              color: '#5a5a70',
              font: {
                family: "'Inter', sans-serif",
                size: 11
              },
              callback: function(value) {
                return Utils.formatCompact(value);
              }
            }
          }
        }
      }
    });
  },

  /**
   * Update daily chart data
   * @param {array} dailyData - Daily metrics array
   */
  updateDailyChart(dailyData) {
    if (!this.instances.daily) {
      this.renderDailyChart(dailyData);
      return;
    }

    const labels = dailyData.map(d => Utils.formatDateShort(d.date));
    const impressions = dailyData.map(d => d.impressions || 0);
    const clicks = dailyData.map(d => d.clicks || 0);

    this.instances.daily.data.labels = labels;
    this.instances.daily.data.datasets[0].data = impressions;
    this.instances.daily.data.datasets[1].data = clicks;
    this.instances.daily.update();
  },

  /**
   * Render format performance horizontal bar chart
   * @param {object} formatData - Format metrics object
   */
  renderFormatChart(formatData) {
    const ctx = document.getElementById('formatChart');
    if (!ctx) return;

    // Destroy existing chart
    if (this.instances.format) {
      this.instances.format.destroy();
    }

    // Prepare data
    const formats = Object.keys(formatData);
    const labels = formats.map(f => Utils.getFormatName(f));
    const impressions = formats.map(f => formatData[f].impressions || 0);

    this.instances.format = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Impressoes',
          data: impressions,
          backgroundColor: this.colors.format,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        ...this.commonOptions,
        indexAxis: 'y',
        scales: {
          x: {
            grid: {
              color: 'rgba(42, 42, 62, 0.5)',
              drawBorder: false
            },
            ticks: {
              color: '#5a5a70',
              font: {
                family: "'Inter', sans-serif",
                size: 11
              },
              callback: function(value) {
                return Utils.formatCompact(value);
              }
            }
          },
          y: {
            grid: {
              display: false
            },
            ticks: {
              color: '#8888a0',
              font: {
                family: "'Inter', sans-serif",
                size: 12,
                weight: 500
              }
            }
          }
        },
        plugins: {
          ...this.commonOptions.plugins,
          tooltip: {
            ...this.commonOptions.plugins.tooltip,
            callbacks: {
              label: function(context) {
                const format = formats[context.dataIndex];
                const data = formatData[format];
                return [
                  'Impressoes: ' + Utils.formatNumber(data.impressions),
                  'Cliques: ' + Utils.formatNumber(data.clicks),
                  'CTR: ' + Utils.formatPercent(data.ctr),
                  'Viewability: ' + Utils.formatPercent(data.viewabilityRate)
                ];
              }
            }
          }
        }
      }
    });
  },

  /**
   * Update format chart data
   * @param {object} formatData - Format metrics object
   */
  updateFormatChart(formatData) {
    if (!this.instances.format) {
      this.renderFormatChart(formatData);
      return;
    }

    const formats = Object.keys(formatData);
    const labels = formats.map(f => Utils.getFormatName(f));
    const impressions = formats.map(f => formatData[f].impressions || 0);

    this.instances.format.data.labels = labels;
    this.instances.format.data.datasets[0].data = impressions;
    this.instances.format.update();
  },

  /**
   * Render personagem performance donut chart
   * @param {object} personagemData - Personagem metrics object
   */
  renderPersonagemChart(personagemData) {
    const ctx = document.getElementById('personagemChart');
    if (!ctx) return;

    // Destroy existing chart
    if (this.instances.personagem) {
      this.instances.personagem.destroy();
    }

    // Prepare data
    const personagens = Object.keys(personagemData);
    const labels = personagens.map(p => Utils.getPersonagemName(p));
    const impressions = personagens.map(p => personagemData[p].impressions || 0);

    this.instances.personagem = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: impressions,
          backgroundColor: this.colors.personagem,
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        ...this.commonOptions,
        cutout: '65%',
        plugins: {
          ...this.commonOptions.plugins,
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#8888a0',
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                family: "'Inter', sans-serif",
                size: 12
              }
            }
          },
          tooltip: {
            ...this.commonOptions.plugins.tooltip,
            callbacks: {
              label: function(context) {
                const personagem = personagens[context.dataIndex];
                const data = personagemData[personagem];
                const total = impressions.reduce((a, b) => a + b, 0);
                const percentage = ((data.impressions / total) * 100).toFixed(1);
                return [
                  Utils.getPersonagemName(personagem) + ': ' + percentage + '%',
                  'Impressoes: ' + Utils.formatNumber(data.impressions),
                  'CTR: ' + Utils.formatPercent(data.ctr)
                ];
              }
            }
          }
        }
      }
    });
  },

  /**
   * Update personagem chart data
   * @param {object} personagemData - Personagem metrics object
   */
  updatePersonagemChart(personagemData) {
    if (!this.instances.personagem) {
      this.renderPersonagemChart(personagemData);
      return;
    }

    const personagens = Object.keys(personagemData);
    const labels = personagens.map(p => Utils.getPersonagemName(p));
    const impressions = personagens.map(p => personagemData[p].impressions || 0);

    this.instances.personagem.data.labels = labels;
    this.instances.personagem.data.datasets[0].data = impressions;
    this.instances.personagem.update();
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.Charts = Charts;
}
