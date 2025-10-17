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

function renderHourChart(data) {
  console.log('Rendering hour chart with data:', data);
  
  if (!data.hourly_trips || data.hourly_trips.length === 0) {
    console.log('No hourly_trips data available');
    return;
  }

  const labels = data.hourly_trips.map(d => `${d.hour}:00`);
  const values = data.hourly_trips.map(d => d.count);

  createChart('hourChart', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Trips',
        data: values,
        backgroundColor: 'rgba(13, 110, 253, 0.6)',
        borderColor: 'rgba(13, 110, 253, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function renderDistanceChart(data) {
  console.log('Rendering distance chart with data:', data);
  
  if (!data.distance_bins || data.distance_bins.length === 0) {
    console.log('No distance_bins data available');
    return;
  }

  const labels = data.distance_bins.map(d => `${d.bin_start}-${d.bin_end}km`);
  const values = data.distance_bins.map(d => d.count);

  createChart('distanceChart', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Trips',
        data: values,
        backgroundColor: 'rgba(25, 135, 84, 0.6)',
        borderColor: 'rgba(25, 135, 84, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function renderSpeedChart(data) {
  console.log('Rendering speed chart with data:', data);
  
  if (!data.speed_bins || data.speed_bins.length === 0) {
    console.log('No speed_bins data available');
    return;
  }

  const labels = data.speed_bins.map(d => `${d.bin_start}-${d.bin_end}km/h`);
  const values = data.speed_bins.map(d => d.count);

  createChart('speedChart', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Trips',
        data: values,
        backgroundColor: 'rgba(255, 193, 7, 0.6)',
        borderColor: 'rgba(255, 193, 7, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function renderHotspotsChart(hotspots) {
  console.log('Rendering hotspots chart with data:', hotspots);
  
  if (!hotspots || hotspots.length === 0) {
    console.log('No hotspots data available');
    return;
  }

  const labels = hotspots.map(h => h.zone || `Zone ${h.pickup_zone}`);
  const values = hotspots.map(h => h.trip_count);

  createChart('hotspotsChart', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Pickups',
        data: values,
        backgroundColor: 'rgba(220, 53, 69, 0.6)',
        borderColor: 'rgba(220, 53, 69, 1)',
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.5,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { beginAtZero: true }
      }
    }
  });
}

function renderRoutesChart(routes) {
  console.log('Rendering routes chart with data:', routes);
  
  if (!routes || routes.length === 0) {
    console.log('No routes data available');
    return;
  }

  const labels = routes.map(r => `${r.pickup_zone} → ${r.dropoff_zone}`);
  const values = routes.map(r => r.trip_count);

  createChart('routesChart', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Trips',
        data: values,
        backgroundColor: 'rgba(111, 66, 193, 0.6)',
        borderColor: 'rgba(111, 66, 193, 1)',
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.5,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { beginAtZero: true }
      }
    }
  });
}

function renderInsights(insights) {
  const container = document.getElementById('insights-container');
  if (!container) return;

  console.log('Rendering insights:', insights);

  if (!insights || Object.keys(insights).length === 0) {
    container.innerHTML = '<div class="loading">No insights available</div>';
    return;
  }

  let html = '';

  if (insights.peak_hour) {
    html += `
      <div class="insight-card">
        <h4>Peak Hour</h4>
        <p>Most trips occur at <span class="metric-highlight">${insights.peak_hour.hour}:00</span> 
        with <span class="metric-highlight">${insights.peak_hour.count.toLocaleString()}</span> trips</p>
      </div>
    `;
  }

  if (insights.busiest_day) {
    html += `
      <div class="insight-card">
        <h4>Busiest Day</h4>
        <p><span class="metric-highlight">${insights.busiest_day.day}</span> 
        with <span class="metric-highlight">${insights.busiest_day.count.toLocaleString()}</span> trips</p>
      </div>
    `;
  }

  if (insights.avg_speed_by_hour && insights.avg_speed_by_hour.length > 0) {
    const fastest = insights.avg_speed_by_hour.reduce((a, b) => a.avg_speed > b.avg_speed ? a : b);
    html += `
      <div class="insight-card">
        <h4>Fastest Hour</h4>
        <p>Highest average speed at <span class="metric-highlight">${fastest.hour}:00</span> 
        (<span class="metric-highlight">${fastest.avg_speed.toFixed(1)} km/h</span>)</p>
      </div>
    `;
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
    // Load summary stats
    console.log('Fetching summary...');
    const summary = await fetchSummary(currentFilters);
    console.log('Summary data received:', summary);
    updateSummaryStats(summary);
    renderHourChart(summary);
    renderDistanceChart(summary);
    renderSpeedChart(summary);

    // Load trips table
    console.log('Fetching trips...');
    const trips = await fetchTrips(currentPage, currentFilters);
    console.log('Trips data received:', trips);
    updateTripsTable(trips);
    updatePagination(trips);

    // Load hotspots
    console.log('Fetching hotspots...');
    const hotspots = await fetchHotspots(currentFilters);
    console.log('Hotspots data received:', hotspots);
    renderHotspotsChart(hotspots);

    // Load top routes
    console.log('Fetching top routes...');
    const routes = await fetchTopRoutes(currentFilters);
    console.log('Routes data received:', routes);
    renderRoutesChart(routes);

    // Load insights
    console.log('Fetching insights...');
    const insights = await fetchInsights(currentFilters);
    console.log('Insights data received:', insights);
    renderInsights(insights);

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
  console.log('Setting up event listeners');
  
  // Apply filters button
  const applyBtn = document.getElementById('apply-filters');
  if (applyBtn) {
    console.log('Apply button found, adding listener');
    applyBtn.addEventListener('click', (e) => {
      console.log('Apply button clicked');
      e.preventDefault();
      applyFilters();
    });
  } else {
    console.error('Apply button not found!');
  }

  // Reset filters button
  const resetBtn = document.getElementById('reset-filters');
  if (resetBtn) {
    console.log('Reset button found, adding listener');
    resetBtn.addEventListener('click', (e) => {
      console.log('Reset button clicked');
      e.preventDefault();
      resetFilters();
    });
  } else {
    console.error('Reset button not found!');
  }

  // Pagination
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
  console.log('Initializing dashboard...');
  console.log('Checking backend health at:', window.API_BASE);

  // Apply theme toggle listener
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
  } else {
    const tbody = document.getElementById('trips-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7">Cannot connect to backend at ${window.API_BASE}</td></tr>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', init);