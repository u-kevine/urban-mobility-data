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

  if (!data.trips || data.trips.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading">No trips found</td></tr>';
    return;
  }

  tbody.innerHTML = data.trips.map(trip => `
    <tr>
      <td>${trip.id || '—'}</td>
      <td>${trip.pickup_datetime || '—'}</td>
      <td>${trip.duration_minutes ? trip.duration_minutes.toFixed(1) : '—'}</td>
      <td>${trip.distance_km ? trip.distance_km.toFixed(2) : '—'}</td>
      <td>${trip.speed_kmh ? trip.speed_kmh.toFixed(1) : '—'}</td>
      <td>$${trip.fare_amount ? trip.fare_amount.toFixed(2) : '0.00'}</td>
      <td>${trip.passenger_count || '—'}</td>
    </tr>
  `).join('');
}

function updatePagination(data) {
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');

  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = !data.has_next;
  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${data.total_pages || 1}`;
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

// (chart rendering functions remain the same as your original code)
// renderHourChart, renderDistanceChart, renderSpeedChart, renderHotspotsChart, renderRoutesChart, renderInsights
// You can copy them as-is from your previous main.js

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
    const summary = await fetchSummary(currentFilters);
    updateSummaryStats(summary);
    renderHourChart(summary);
    renderDistanceChart(summary);
    renderSpeedChart(summary);

    const trips = await fetchTrips(currentPage, currentFilters);
    updateTripsTable(trips);
    updatePagination(trips);

    const hotspots = await fetchHotspots(currentFilters);
    renderHotspotsChart(hotspots);

    const routes = await fetchTopRoutes(currentFilters);
    renderRoutesChart(routes);

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
}

// ================================
// INITIALIZATION
// ================================
async function init() {
  applyTheme();

  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.body.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  const isHealthy = await checkHealth();
  if (isHealthy) {
    setupEventListeners();
    await loadData();

    // ================================
    // AUTO-CLICK APPLY FILTERS FOR DEBUGGING
    // ================================
    const interval = setInterval(() => {
      const applyBtn = document.getElementById('apply-filters');
      if (applyBtn) {
        console.log('✅ Apply Filters button found:', applyBtn);
        applyBtn.click();
        clearInterval(interval);
      }
    }, 500);

  } else {
    const tbody = document.getElementById('trips-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7">Cannot connect to backend at ${window.API_BASE}</td></tr>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
