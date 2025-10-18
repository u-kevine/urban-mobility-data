// ================================
// GLOBAL API BASE
// ================================
(function () {
  const hostname = window.location.hostname;
  let apiBase;

  if (hostname.includes('github.dev') || hostname.includes('githubpreview.dev')) {
    apiBase = "https://upgraded-fishstick-x5pvwv5g44rgc6rrp-3000.app.github.dev";
  } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    apiBase = 'http://127.0.0.1:3000';
  } else {
    apiBase = `${window.location.protocol}//${hostname}:3000`;
  }

  window.API_BASE = apiBase;
  console.log("✅ API Base set to:", window.API_BASE);
})();

// ================================
// VARIABLES
// ================================
let currentPage = 1;
let currentFilters = {};
const TRIPS_PER_PAGE = 50;
let chartInstances = {};

// ================================
// THEME MANAGEMENT
// ================================
function applyTheme(theme) {
  const t = theme || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.body.setAttribute('data-theme', t);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = t === 'dark' ? 'Light Mode' : 'Dark Mode';
}

// ================================
// API FUNCTIONS
// ================================
async function checkHealth() {
  try {
    const res = await fetch(`${window.API_BASE}/health`, { method: 'GET', headers: { Accept: 'application/json' } });
    const data = await res.json();
    updateStatus(true, `Connected • ${data.trips_count?.toLocaleString()} trips in database`);
    return true;
  } catch (err) {
    console.error('Health check failed:', err);
    updateStatus(false, `Backend unreachable at ${window.API_BASE}`);
    return false;
  }
}

function updateStatus(isHealthy, message) {
  const indicator = document.getElementById('status-indicator');
  const text = document.getElementById('status-text');
  if (indicator) indicator.className = `status-indicator ${isHealthy ? '' : 'error'}`;
  if (text) text.textContent = message;
}

async function fetchSummary(filters = {}) {
  const params = new URLSearchParams(filters);
  const res = await fetch(`${window.API_BASE}/api/summary?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchTrips(page = 1, filters = {}) {
  const params = new URLSearchParams({ page: page, limit: TRIPS_PER_PAGE, ...filters });
  const res = await fetch(`${window.API_BASE}/api/trips?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Fetch more trips for chart data generation
async function fetchTripsForCharts(filters = {}) {
  const params = new URLSearchParams({ page: 1, limit: 1000, ...filters });
  const res = await fetch(`${window.API_BASE}/api/trips?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchHotspots(filters = {}) {
  const params = new URLSearchParams({ k: 10, ...filters });
  const res = await fetch(`${window.API_BASE}/api/hotspots?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchInsights(filters = {}) {
  const params = new URLSearchParams(filters);
  const res = await fetch(`${window.API_BASE}/api/insights?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchTopRoutes(filters = {}) {
  const params = new URLSearchParams({ n: 10, ...filters });
  const res = await fetch(`${window.API_BASE}/api/top-routes?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ================================
// UI & CHART FUNCTIONS
// ================================
function updateSummaryStats(data) {
  const elements = {
    'total-trips': (data.total_trips || 0).toLocaleString(),
    'avg-distance': (data.avg_distance_km || 0).toFixed(2),
    'avg-fare': '$' + (data.avg_fare || 0).toFixed(2),
    'avg-speed': (data.avg_speed_kmh || 0).toFixed(1)
  };
  Object.entries(elements).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
}

function updateTripsTable(data) {
  const tbody = document.getElementById('trips-tbody');
  if (!tbody) return;

  if (!data.rows || data.rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading">No trips found</td></tr>';
    return;
  }

  tbody.innerHTML = data.rows.map(trip => {
    const duration = trip.trip_duration_seconds ? (trip.trip_duration_seconds / 60).toFixed(1) : '—';
    const distance = trip.trip_distance_km ? trip.trip_distance_km.toFixed(2) : '—';
    const speed = trip.trip_speed_kmh ? trip.trip_speed_kmh.toFixed(1) : '—';
    const fare = trip.fare_amount ? trip.fare_amount.toFixed(2) : '0.00';
    
    return `
      <tr>
        <td>${trip.id || '—'}</td>
        <td>${trip.pickup_datetime || '—'}</td>
        <td>${duration}</td>
        <td>${distance}</td>
        <td>${speed}</td>
        <td>$${fare}</td>
        <td>${trip.passenger_count || '—'}</td>
      </tr>
    `;
  }).join('');
}

function updatePagination(data) {
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');

  const totalPages = data.total > 0 ? Math.ceil(data.total / TRIPS_PER_PAGE) : 1;
  const hasNext = currentPage < totalPages;

  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = !hasNext;
  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

function destroyChart(chartId) {
  if (chartInstances[chartId]) {
    chartInstances[chartId].destroy();
    delete chartInstances[chartId];
  }
}

function createChart(canvasId, config) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (canvas) {
    const ctx = canvas.getContext('2d');
    chartInstances[canvasId] = new Chart(ctx, config);
  }
}

function getChartColors() {
  const theme = document.body.getAttribute('data-theme') || 'light';
  if (theme === 'dark') {
    return {
      primary: '#0d6efd',
      secondary: '#6c757d',
      success: '#198754',
      text: '#e9ecef',
      grid: '#495057'
    };
  }
  return {
    primary: '#0d6efd',
    secondary: '#6c757d',
    success: '#198754',
    text: '#212529',
    grid: '#dee2e6'
  };
}

// ================================
// DISTRIBUTION GENERATION FUNCTIONS
// ================================

function generateHourDistribution(trips) {
  const hourCounts = new Array(24).fill(0);
  
  trips.forEach(trip => {
    if (trip.hour_of_day !== null && trip.hour_of_day !== undefined) {
      const hour = parseInt(trip.hour_of_day);
      if (hour >= 0 && hour < 24) {
        hourCounts[hour]++;
      }
    }
  });
  
  return hourCounts;
}

function generateDistanceDistribution(trips) {
  const bins = [0, 5, 10, 15, 20, 25, 30, 40, 50];
  const binCounts = new Array(bins.length - 1).fill(0);
  
  trips.forEach(trip => {
    const dist = parseFloat(trip.trip_distance_km);
    if (!isNaN(dist) && dist >= 0) {
      for (let i = 0; i < bins.length - 1; i++) {
        if (dist >= bins[i] && dist < bins[i + 1]) {
          binCounts[i]++;
          break;
        } else if (dist >= bins[bins.length - 1]) {
          binCounts[bins.length - 2]++;
          break;
        }
      }
    }
  });
  
  return { bins, counts: binCounts };
}

function generateSpeedDistribution(trips) {
  const bins = [0, 10, 20, 30, 40, 50, 60, 80, 100];
  const binCounts = new Array(bins.length - 1).fill(0);
  
  trips.forEach(trip => {
    const speed = parseFloat(trip.trip_speed_kmh);
    if (!isNaN(speed) && speed >= 0 && speed < 150) {
      for (let i = 0; i < bins.length - 1; i++) {
        if (speed >= bins[i] && speed < bins[i + 1]) {
          binCounts[i]++;
          break;
        }
      }
    }
  });
  
  return { bins, counts: binCounts };
}

// ================================
// CHART RENDERING FUNCTIONS
// ================================

function renderHourChart(trips) {
  const colors = getChartColors();
  const hours = Array.from({length: 24}, (_, i) => i);
  const hourData = generateHourDistribution(trips);

  createChart('hourChart', {
    type: 'bar',
    data: {
      labels: hours.map(h => `${h}:00`),
      datasets: [{
        label: 'Trips',
        data: hourData,
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: colors.text },
          grid: { color: colors.grid }
        },
        x: {
          ticks: { color: colors.text },
          grid: { color: colors.grid }
        }
      }
    }
  });
}

function renderDistanceChart(trips) {
  const colors = getChartColors();
  const { bins, counts } = generateDistanceDistribution(trips);
  const labels = [];
  
  for (let i = 0; i < bins.length - 1; i++) {
    labels.push(`${bins[i]}-${bins[i + 1]} km`);
  }

  createChart('distanceChart', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Trips',
        data: counts,
        backgroundColor: colors.success,
        borderColor: colors.success,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: colors.text },
          grid: { color: colors.grid }
        },
        x: {
          ticks: { color: colors.text },
          grid: { color: colors.grid }
        }
      }
    }
  });
}

function renderSpeedChart(trips) {
  const colors = getChartColors();
  const { bins, counts } = generateSpeedDistribution(trips);
  const labels = [];
  
  for (let i = 0; i < bins.length - 1; i++) {
    labels.push(`${bins[i]}-${bins[i + 1]} km/h`);
  }

  createChart('speedChart', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Trips',
        data: counts,
        backgroundColor: colors.secondary,
        borderColor: colors.secondary,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: colors.text },
          grid: { color: colors.grid }
        },
        x: {
          ticks: { color: colors.text },
          grid: { color: colors.grid }
        }
      }
    }
  });
}

function renderHotspotsChart(hotspots) {
  const colors = getChartColors();
  
  if (!hotspots || hotspots.length === 0) {
    console.log('No hotspot data available');
    return;
  }

  const labels = hotspots.map(h => h.zone_name || `Zone ${h.zone_id}` || 'Unknown');
  const data = hotspots.map(h => h.trips || 0);

  createChart('hotspotsChart', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Trips',
        data: data,
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: colors.text },
          grid: { color: colors.grid }
        },
        y: {
          ticks: { color: colors.text },
          grid: { color: colors.grid }
        }
      }
    }
  });
}

function renderRoutesChart(routes) {
  const colors = getChartColors();
  
  if (!routes || routes.length === 0) {
    console.log('No routes data available');
    return;
  }

  const labels = routes.map(r => {
    const pickup = r.pickup_zone_name || 'Unknown';
    const dropoff = r.dropoff_zone_name || 'Unknown';
    return `${pickup} → ${dropoff}`;
  });
  const data = routes.map(r => r.trips || 0);

  createChart('routesChart', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Trips',
        data: data,
        backgroundColor: colors.success,
        borderColor: colors.success,
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: colors.text },
          grid: { color: colors.grid }
        },
        y: {
          ticks: { 
            color: colors.text,
            font: { size: 10 }
          },
          grid: { color: colors.grid }
        }
      }
    }
  });
}

function renderInsights(insights) {
  const container = document.getElementById('insights-container');
  if (!container) return;

  if (!insights || Object.keys(insights).length === 0) {
    container.innerHTML = '<div class="loading">No insights available</div>';
    return;
  }

  let html = '';

  if (insights.rush_hour && insights.rush_hour.data) {
    const rushData = insights.rush_hour.data;
    const maxTrips = Math.max(...rushData.map(d => d.trips || 0));
    const peakHour = rushData.find(d => d.trips === maxTrips);
    
    if (peakHour) {
      html += `
        <div class="insight-card">
          <h4>🚦 Peak Rush Hour</h4>
          <p>The busiest hour is <span class="metric-highlight">${peakHour.hour_of_day}:00</span> 
          with <span class="metric-highlight">${peakHour.trips.toLocaleString()}</span> trips.</p>
        </div>
      `;
    }
  }

  if (insights.spatial_hotspots) {
    const morning = insights.spatial_hotspots.morning || [];
    const evening = insights.spatial_hotspots.evening || [];

    if (morning.length > 0) {
      html += `
        <div class="insight-card">
          <h4>🌅 Morning Demand (7-9 AM)</h4>
          <p>Top pickup zone: <span class="metric-highlight">${morning[0].zone_name}</span> 
          with <span class="metric-highlight">${morning[0].trips.toLocaleString()}</span> trips.</p>
        </div>
      `;
    }

    if (evening.length > 0) {
      html += `
        <div class="insight-card">
          <h4>🌆 Evening Demand (5-7 PM)</h4>
          <p>Top pickup zone: <span class="metric-highlight">${evening[0].zone_name}</span> 
          with <span class="metric-highlight">${evening[0].trips.toLocaleString()}</span> trips.</p>
        </div>
      `;
    }
  }

  container.innerHTML = html || '<div class="loading">No insights available</div>';
}

// ================================
// FILTER MANAGEMENT
// ================================
function getFiltersFromUI() {
  const filters = {};
  
  const dateFrom = document.getElementById('date-from')?.value;
  const dateTo = document.getElementById('date-to')?.value;
  const distMin = document.getElementById('distance-min')?.value;
  const distMax = document.getElementById('distance-max')?.value;

  if (dateFrom) filters.date_from = dateFrom;
  if (dateTo) filters.date_to = dateTo;
  if (distMin) filters.distance_min = distMin;
  if (distMax) filters.distance_max = distMax;

  console.log('Filters from UI:', filters);
  return filters;
}

function resetFilters() {
  console.log('Resetting filters');
  document.getElementById('date-from').value = '';
  document.getElementById('date-to').value = '';
  document.getElementById('distance-min').value = '';
  document.getElementById('distance-max').value = '';
  
  currentFilters = {};
  currentPage = 1;
  loadData();
}

function applyFilters() {
  console.log('Applying filters');
  currentFilters = getFiltersFromUI();
  currentPage = 1;
  loadData();
}

// ================================
// DATA LOADING
// ================================
async function loadData() {
  console.log('Loading data with filters:', currentFilters);
  
  try {
    // Fetch summary stats
    const summary = await fetchSummary(currentFilters);
    updateSummaryStats(summary);

    // Fetch trips for charts (larger sample)
    const chartTrips = await fetchTripsForCharts(currentFilters);
    renderHourChart(chartTrips.rows || []);
    renderDistanceChart(chartTrips.rows || []);
    renderSpeedChart(chartTrips.rows || []);

    // Fetch trips for table (paginated)
    const trips = await fetchTrips(currentPage, currentFilters);
    updateTripsTable(trips);
    updatePagination(trips);

    // Fetch hotspots
    const hotspots = await fetchHotspots(currentFilters);
    renderHotspotsChart(hotspots);

    // Fetch routes
    const routes = await fetchTopRoutes(currentFilters);
    renderRoutesChart(routes);

    // Fetch insights
    const insights = await fetchInsights(currentFilters);
    renderInsights(insights);

    console.log('✅ All data loaded successfully');

  } catch (err) {
    console.error('Error loading data:', err);
    const tbody = document.getElementById('trips-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="error-message">Error loading data: ${err.message}</td></tr>`;
    }
  }
}

// ================================
// EVENT LISTENERS
// ================================
function setupEventListeners() {
  const applyBtn = document.getElementById('apply-filters');
  if (applyBtn) applyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    applyFilters();
  });

  const resetBtn = document.getElementById('reset-filters');
  if (resetBtn) resetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetFilters();
  });

  const prevBtn = document.getElementById('prev-page');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        loadData();
      }
    });
  }

  const nextBtn = document.getElementById('next-page');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentPage++;
      loadData();
    });
  }

  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.body.getAttribute('data-theme') || 'light';
      const newTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      loadData();
    });
  }
}

// ================================
// INITIALIZATION
// ================================
async function init() {
  console.log('🚀 Initializing dashboard...');
  
  applyTheme();

  const isHealthy = await checkHealth();
  if (isHealthy) {
    setupEventListeners();
    await loadData();
  } else {
    const tbody = document.getElementById('trips-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="error-message">Cannot connect to backend at ${window.API_BASE}. Please ensure the API server is running.</td></tr>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', init);