// ================================
// API BASE URL SETUP
// ================================
function getApiBase() {
  const hostname = window.location.hostname;

  // GitHub Codespaces detection
  if (hostname.includes('github.dev') || hostname.includes('githubpreview.dev')) {
    // Extract the base URL and change port to 3000 (Flask API port)
    const baseUrl = window.location.origin.replace('-3306.', '-3000.');
    return baseUrl;
  }

  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:3000';
  }

  // Production or other environments
  return `${window.location.protocol}//${hostname}:3000`;
}

// Make API_BASE global
window.API_BASE = getApiBase();
console.log('API Base URL:', window.API_BASE);

// ================================
// GLOBAL VARIABLES
// ================================
let currentPage = 1;
let currentFilters = {};
const TRIPS_PER_PAGE = 50;
let charts = {};

// ================================
// THEME MANAGEMENT
// ================================
function applyTheme(theme) {
  const t = theme || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.body.setAttribute('data-theme', t);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = t === 'dark' ? 'Light Mode' : 'Dark Mode';
}

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.body.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
});

// ================================
// API FUNCTIONS
// ================================
async function checkHealth() {
  try {
    const res = await fetch(`${window.API_BASE}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
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

async function fetchFareStats(filters = {}) {
  const params = new URLSearchParams(filters);
  const res = await fetch(`${window.API_BASE}/api/fare-stats?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ================================
// UI UPDATE FUNCTIONS
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
  tbody.innerHTML = '';

  const trips = data.rows || [];
  if (trips.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">No trips found</td></tr>';
    return;
  }

  trips.forEach(trip => {
    const row = document.createElement('tr');
    const duration = trip.trip_duration_seconds ? (trip.trip_duration_seconds / 60).toFixed(1) : '—';
    row.innerHTML = `
      <td>${trip.id || '—'}</td>
      <td>${trip.pickup_datetime ? new Date(trip.pickup_datetime).toLocaleString() : '—'}</td>
      <td>${duration}</td>
      <td>${trip.trip_distance_km ? trip.trip_distance_km.toFixed(2) : '—'}</td>
      <td>${trip.trip_speed_kmh ? trip.trip_speed_kmh.toFixed(1) : '—'}</td>
      <td>$${trip.fare_amount ? trip.fare_amount.toFixed(2) : '0.00'}</td>
      <td>${trip.passenger_count || '—'}</td>
    `;
    tbody.appendChild(row);
  });

  const totalPages = Math.ceil((data.total || 0) / TRIPS_PER_PAGE);
  const pageInfo = document.getElementById('page-info');
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

// ================================
// INIT AND LOAD DATA
// ================================
async function loadData() {
  try {
    const [summary, trips, hotspots, insights, routes, fareStats] = await Promise.all([
      fetchSummary(currentFilters),
      fetchTrips(currentPage, currentFilters),
      fetchHotspots(currentFilters),
      fetchInsights(currentFilters),
      fetchTopRoutes(currentFilters),
      fetchFareStats(currentFilters)
    ]);

    updateSummaryStats(summary);
    updateTripsTable(trips);
    // Charts and insights updating omitted here for brevity
  } catch (err) {
    console.error('Error loading data:', err);
    updateStatus(false, `Error: ${err.message}`);
  }
}

async function init() {
  applyTheme();
  console.log('Initializing dashboard...');
  console.log('Checking backend health at:', window.API_BASE);

  const isHealthy = await checkHealth();
  if (isHealthy) {
    await loadData();
  } else {
    const tbody = document.getElementById('trips-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7">Cannot connect to backend at ${window.API_BASE}</td></tr>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});
