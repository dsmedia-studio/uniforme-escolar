/**
 * GDF Uniforme Escolar - CM360 Data Sync Script
 *
 * This script fetches performance data from Campaign Manager 360 API
 * and generates a JSON file for the dashboard.
 *
 * Environment variables required:
 * - GOOGLE_CLIENT_ID: OAuth 2.0 Client ID
 * - GOOGLE_CLIENT_SECRET: OAuth 2.0 Client Secret
 * - GOOGLE_REFRESH_TOKEN: OAuth 2.0 Refresh Token
 * - CM360_PROFILE_ID: CM360 Profile ID
 * - CM360_SITE_ID: CM360 Site ID (optional, for filtering)
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  outputPath: path.join(__dirname, '..', 'dashboard', 'data', 'performance.json'),
  configPath: path.join(__dirname, '..', 'dashboard', 'data', 'config.json'),
  reportDateRange: 'LAST_30_DAYS',
  reportWaitTimeout: 120000, // 2 minutes
  pollInterval: 5000, // 5 seconds
};

/**
 * Load Site ID from config.json
 * Falls back to environment variable CM360_SITE_ID if config doesn't have it
 * @returns {string} Site ID
 */
function loadSiteIdFromConfig() {
  try {
    if (fs.existsSync(CONFIG.configPath)) {
      const configData = JSON.parse(fs.readFileSync(CONFIG.configPath, 'utf8'));
      if (configData.cm360?.siteId) {
        console.log(`Site ID loaded from config.json: ${configData.cm360.siteId}`);
        return configData.cm360.siteId;
      }
    }
  } catch (err) {
    console.warn('Could not read config.json:', err.message);
  }

  // Fallback to environment variable
  const envSiteId = process.env.CM360_SITE_ID;
  if (envSiteId) {
    console.log(`Site ID loaded from environment variable: ${envSiteId}`);
  }
  return envSiteId || '';
}

// OAuth2 client
let oauth2Client;

/**
 * Initialize OAuth2 client with credentials
 */
function initAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing required OAuth credentials. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN environment variables.');
  }

  oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return oauth2Client;
}

/**
 * Create a CM360 report
 * @param {object} dfareporting - CM360 API client
 * @param {string} profileId - CM360 Profile ID
 * @returns {object} Report object
 */
async function createReport(dfareporting, profileId) {
  console.log('Creating CM360 report...');

  const report = await dfareporting.reports.insert({
    profileId: profileId,
    requestBody: {
      name: `GDF Uniforme Escolar - Performance ${new Date().toISOString()}`,
      type: 'STANDARD',
      criteria: {
        dateRange: {
          relativeDateRange: CONFIG.reportDateRange
        },
        dimensions: [
          { name: 'date' },
          { name: 'site' },
          { name: 'siteId' },
          { name: 'creative' },
          { name: 'creativeId' },
          { name: 'placement' },
          { name: 'placementId' },
          { name: 'feed1ReportingLabel' }
        ],
        metricNames: [
          'impressions',
          'clicks',
          'activeViewViewableImpressions',
          'activeViewEligibleImpressions'
        ]
      },
      delivery: {
        emailOwner: false
      }
    }
  });

  console.log(`Report created with ID: ${report.data.id}`);
  return report.data;
}

/**
 * Run a CM360 report
 * @param {object} dfareporting - CM360 API client
 * @param {string} profileId - CM360 Profile ID
 * @param {string} reportId - Report ID
 * @returns {object} Report file object
 */
async function runReport(dfareporting, profileId, reportId) {
  console.log('Running report...');

  const file = await dfareporting.reports.run({
    profileId: profileId,
    reportId: reportId
  });

  return file.data;
}

/**
 * Wait for report to complete
 * @param {object} dfareporting - CM360 API client
 * @param {string} profileId - CM360 Profile ID
 * @param {string} reportId - Report ID
 * @param {string} fileId - File ID
 * @returns {object} Completed file object
 */
async function waitForReport(dfareporting, profileId, reportId, fileId) {
  console.log('Waiting for report to complete...');

  const startTime = Date.now();

  while (Date.now() - startTime < CONFIG.reportWaitTimeout) {
    const file = await dfareporting.reports.files.get({
      profileId: profileId,
      reportId: reportId,
      fileId: fileId
    });

    const status = file.data.status;
    console.log(`Report status: ${status}`);

    if (status === 'REPORT_AVAILABLE') {
      return file.data;
    }

    if (status === 'FAILED') {
      throw new Error('Report generation failed');
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, CONFIG.pollInterval));
  }

  throw new Error('Report generation timed out');
}

/**
 * Download and parse report data
 * @param {object} dfareporting - CM360 API client
 * @param {object} file - File object with URL
 * @returns {array} Parsed report data
 */
async function downloadReport(dfareporting, file) {
  console.log('Downloading report...');

  const response = await dfareporting.files.get({
    reportId: file.reportId,
    fileId: file.id,
    alt: 'media'
  });

  // Parse CSV data
  const csvData = response.data;
  const lines = csvData.split('\n');

  // Find header row (skip report metadata)
  let headerIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Date') && lines[i].includes('Impressions')) {
      headerIndex = i;
      break;
    }
  }

  const headers = lines[headerIndex].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('Grand Total')) continue;

    const values = parseCSVLine(line);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
  }

  return data;
}

/**
 * Parse a CSV line handling quoted values
 * @param {string} line - CSV line
 * @returns {array} Array of values
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/**
 * Process raw report data into dashboard format
 * @param {array} rawData - Raw report data
 * @param {string} siteId - Optional site ID filter
 * @returns {object} Processed dashboard data
 */
function processReportData(rawData, siteId = null) {
  console.log(`Processing ${rawData.length} rows of data...`);

  // Debug: Log available columns and sample data
  if (rawData.length > 0) {
    console.log('\nAvailable columns:', Object.keys(rawData[0]).join(', '));
    console.log('\nSample row:', JSON.stringify(rawData[0], null, 2));
  }

  // Filter by site ID if provided
  let data = rawData;
  if (siteId) {
    data = rawData.filter(row => row['Site ID (CM360)'] === siteId || row['Site ID'] === siteId || row['siteId'] === siteId);
    console.log(`Filtered to ${data.length} rows for site ${siteId}`);
  }

  // Initialize aggregations
  const daily = {};
  const byFormat = {};
  const byPersonagem = {};
  const byReportingLabel = {};
  const byPlacement = {};
  const byCreativePlacement = {};
  const bySite = {};
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalViewable = 0;
  let totalEligible = 0;

  // Process each row
  data.forEach(row => {
    const date = row['Date'] || '';
    const impressions = parseInt(row['Impressions'] || '0', 10);
    const clicks = parseInt(row['Clicks'] || '0', 10);
    const viewable = parseInt(row['Active View: Viewable Impressions'] || '0', 10);
    const eligible = parseInt(row['Active View: Eligible Impressions'] || '0', 10);
    const creativeName = row['Creative'] || row['Creative Name'] || '';
    const creativeId = row['Creative ID'] || row['Creative ID (CM360)'] || '';
    const reportingLabel = row['Feed 1 - Reporting label'] || row['Feed 1 - Reporting Label'] || row['Feed Reporting Label 1'] || '';

    // Totals
    totalImpressions += impressions;
    totalClicks += clicks;
    totalViewable += viewable;
    totalEligible += eligible;

    // Daily aggregation
    if (date) {
      if (!daily[date]) {
        daily[date] = { impressions: 0, clicks: 0, viewable: 0, eligible: 0 };
      }
      daily[date].impressions += impressions;
      daily[date].clicks += clicks;
      daily[date].viewable += viewable;
      daily[date].eligible += eligible;
    }

    // Format detection from creative name
    const formatMatch = creativeName.match(/(\d+x\d+)/);
    if (formatMatch) {
      const format = formatMatch[1];
      if (!byFormat[format]) {
        byFormat[format] = { impressions: 0, clicks: 0, viewable: 0, eligible: 0 };
      }
      byFormat[format].impressions += impressions;
      byFormat[format].clicks += clicks;
      byFormat[format].viewable += viewable;
      byFormat[format].eligible += eligible;
    }

    // Reporting Label processing
    if (reportingLabel) {
      if (!byReportingLabel[reportingLabel]) {
        byReportingLabel[reportingLabel] = { impressions: 0, clicks: 0, viewable: 0, eligible: 0 };
      }
      byReportingLabel[reportingLabel].impressions += impressions;
      byReportingLabel[reportingLabel].clicks += clicks;
      byReportingLabel[reportingLabel].viewable += viewable;
      byReportingLabel[reportingLabel].eligible += eligible;
    }

    // Extract personagem from reporting label OR creative name
    const personagem = extractPersonagem(reportingLabel) || extractPersonagem(creativeName);
    if (personagem) {
      if (!byPersonagem[personagem]) {
        byPersonagem[personagem] = { impressions: 0, clicks: 0, viewable: 0, eligible: 0 };
      }
      byPersonagem[personagem].impressions += impressions;
      byPersonagem[personagem].clicks += clicks;
      byPersonagem[personagem].viewable += viewable;
      byPersonagem[personagem].eligible += eligible;
    }

    // Site (domain/veículo) aggregation
    const siteName = row['Site'] || row['Site (CM360)'] || '';
    const siteIdValue = row['Site ID'] || row['Site ID (CM360)'] || '';
    if (siteName) {
      if (!bySite[siteName]) {
        bySite[siteName] = {
          siteId: siteIdValue,
          impressions: 0,
          clicks: 0,
          viewable: 0,
          eligible: 0
        };
      }
      bySite[siteName].impressions += impressions;
      bySite[siteName].clicks += clicks;
      bySite[siteName].viewable += viewable;
      bySite[siteName].eligible += eligible;
    }

    // Placement aggregation
    const placementName = row['Placement'] || row['Placement Name'] || '';
    const placementId = row['Placement ID'] || row['Placement ID (CM360)'] || '';
    if (placementName) {
      if (!byPlacement[placementName]) {
        byPlacement[placementName] = {
          placementId: placementId,
          impressions: 0,
          clicks: 0,
          viewable: 0,
          eligible: 0
        };
      }
      byPlacement[placementName].impressions += impressions;
      byPlacement[placementName].clicks += clicks;
      byPlacement[placementName].viewable += viewable;
      byPlacement[placementName].eligible += eligible;
    }

    // Creative x Placement combination
    if (reportingLabel && placementName) {
      const key = `${reportingLabel}|||${placementName}`;
      if (!byCreativePlacement[key]) {
        byCreativePlacement[key] = {
          creative: reportingLabel,
          placement: placementName,
          placementId: placementId,
          impressions: 0,
          clicks: 0,
          viewable: 0,
          eligible: 0
        };
      }
      byCreativePlacement[key].impressions += impressions;
      byCreativePlacement[key].clicks += clicks;
      byCreativePlacement[key].viewable += viewable;
      byCreativePlacement[key].eligible += eligible;
    }
  });

  // Calculate derived metrics
  const calculateMetrics = (obj) => ({
    ...obj,
    ctr: obj.impressions > 0 ? (obj.clicks / obj.impressions) * 100 : 0,
    viewabilityRate: obj.eligible > 0 ? (obj.viewable / obj.eligible) * 100 : 0
  });

  // Build final output
  const now = new Date();
  const nextUpdate = new Date(now.getTime() + 6 * 60 * 60 * 1000); // +6 hours

  return {
    lastUpdated: now.toISOString(),
    nextUpdate: nextUpdate.toISOString(),
    campaign: {
      name: 'GDF Uniforme Escolar 2025',
      siteId: siteId || '',
      siteName: 'Uniforme Escolar',
      startDate: Object.keys(daily).sort()[0] || '',
      endDate: Object.keys(daily).sort().pop() || ''
    },
    summary: {
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      viewableImpressions: totalViewable,
      eligibleImpressions: totalEligible,
      viewabilityRate: totalEligible > 0 ? (totalViewable / totalEligible) * 100 : 0
    },
    daily: Object.keys(daily).sort().map(date => ({
      date,
      ...calculateMetrics(daily[date])
    })),
    byFormat: Object.keys(byFormat).reduce((acc, format) => {
      acc[format] = calculateMetrics(byFormat[format]);
      return acc;
    }, {}),
    byPersonagem: Object.keys(byPersonagem).reduce((acc, personagem) => {
      acc[personagem] = calculateMetrics(byPersonagem[personagem]);
      return acc;
    }, {}),
    byReportingLabel: Object.keys(byReportingLabel)
      .map(label => {
        const parts = parseReportingLabel(label);
        return {
          label,
          ...parts,
          ...calculateMetrics(byReportingLabel[label])
        };
      })
      .sort((a, b) => b.ctr - a.ctr),
    topPerformers: {
      byCTR: getTopLabels(byReportingLabel, 'ctr', 3),
      byViewability: getTopLabels(byReportingLabel, 'viewabilityRate', 3),
      byVolume: getTopLabels(byReportingLabel, 'impressions', 3)
    },
    bySite: Object.keys(bySite)
      .map(name => ({
        name,
        siteId: bySite[name].siteId,
        ...calculateMetrics(bySite[name])
      }))
      .sort((a, b) => b.impressions - a.impressions),
    byPlacement: Object.keys(byPlacement)
      .map(name => ({
        name,
        placementId: byPlacement[name].placementId,
        ...calculateMetrics(byPlacement[name])
      }))
      .sort((a, b) => b.impressions - a.impressions),
    byCreativePlacement: Object.values(byCreativePlacement)
      .map(item => ({
        ...item,
        ctr: item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0,
        viewabilityRate: item.eligible > 0 ? (item.viewable / item.eligible) * 100 : 0
      }))
      .sort((a, b) => b.impressions - a.impressions)
  };
}

/**
 * Extract personagem from reporting label or creative name
 * @param {string} text - Reporting label or creative name
 * @returns {string} Personagem name
 */
function extractPersonagem(text) {
  if (!text) return '';
  const lower = text.toLowerCase();

  // Check for specific personagens
  if (lower.includes('menina') || lower.includes('girl')) return 'menina';
  if (lower.includes('menino02') || lower.includes('menino_02') || lower.includes('boy02') || lower.includes('boy_02')) return 'menino02';
  if (lower.includes('menino01') || lower.includes('menino_01') || lower.includes('boy01') || lower.includes('boy_01')) return 'menino01';
  if (lower.includes('menino') || lower.includes('boy')) return 'menino01';

  // Check for personagem patterns like "p1", "p2", "personagem1"
  const personagemMatch = lower.match(/(?:personagem|persona|pers|p)[\s_-]?(\d+)/);
  if (personagemMatch) {
    return `personagem${personagemMatch[1]}`;
  }

  return '';
}

/**
 * Parse reporting label into components
 * @param {string} label - Reporting label
 * @returns {object} Parsed components
 */
function parseReportingLabel(label) {
  const parts = label.toLowerCase().split('_');
  let personagem = '';
  let headline = '';
  let cta = '';

  parts.forEach(part => {
    if (part.includes('menina') || part.includes('menino')) {
      personagem = part;
    } else if (part.includes('titulo') || part.match(/^h\d+$/)) {
      headline = part;
    } else if (part.includes('cta') || part.match(/^c\d+$/)) {
      cta = part;
    }
  });

  return { personagem, headline, cta };
}

/**
 * Get top labels by a metric
 * @param {object} data - Data object
 * @param {string} metric - Metric to sort by
 * @param {number} n - Number of top items
 * @returns {array} Top label names
 */
function getTopLabels(data, metric, n) {
  return Object.keys(data)
    .map(label => ({
      label,
      value: metric === 'viewabilityRate'
        ? (data[label].eligible > 0 ? (data[label].viewable / data[label].eligible) * 100 : 0)
        : metric === 'ctr'
        ? (data[label].impressions > 0 ? (data[label].clicks / data[label].impressions) * 100 : 0)
        : data[label][metric] || 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n)
    .map(item => item.label);
}

/**
 * Save data to JSON file
 * @param {object} data - Data to save
 */
function saveData(data) {
  const dir = path.dirname(CONFIG.outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(CONFIG.outputPath, JSON.stringify(data, null, 2));
  console.log(`Data saved to ${CONFIG.outputPath}`);
}

/**
 * Main function
 */
async function main() {
  console.log('Starting CM360 data sync...\n');

  try {
    // Check for required environment variables
    const profileId = process.env.CM360_PROFILE_ID;
    // Site ID: try config.json first, then environment variable
    const siteId = loadSiteIdFromConfig();

    if (!profileId) {
      throw new Error('CM360_PROFILE_ID environment variable is required');
    }

    // Initialize authentication
    initAuth();

    // Create CM360 API client
    const dfareporting = google.dfareporting({
      version: 'v4',
      auth: oauth2Client
    });

    // Create and run report
    const report = await createReport(dfareporting, profileId);
    const file = await runReport(dfareporting, profileId, report.id);
    const completedFile = await waitForReport(dfareporting, profileId, report.id, file.id);

    // Download and process report data
    const rawData = await downloadReport(dfareporting, completedFile);
    const processedData = processReportData(rawData, siteId);

    // Save to file
    saveData(processedData);

    // Clean up - delete the report
    try {
      await dfareporting.reports.delete({
        profileId: profileId,
        reportId: report.id
      });
      console.log('Temporary report deleted');
    } catch (e) {
      console.warn('Could not delete temporary report:', e.message);
    }

    console.log('\n✅ Sync completed successfully!');

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);

    // If credentials are missing, generate mock data for testing
    if (error.message.includes('Missing required OAuth credentials') ||
        error.message.includes('CM360_PROFILE_ID')) {
      console.log('\nGenerating mock data for testing...');

      // Read existing mock data and update timestamp
      try {
        const existingData = JSON.parse(fs.readFileSync(CONFIG.outputPath, 'utf8'));
        existingData.lastUpdated = new Date().toISOString();
        existingData.nextUpdate = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
        saveData(existingData);
        console.log('Mock data updated with new timestamp');
      } catch (e) {
        console.error('Could not update mock data:', e.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
}

// Run
main();
