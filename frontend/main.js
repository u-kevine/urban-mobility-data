const API_BASE = 'http://localhost:5001';
let currentPage = 1;
let currentFilters = {};
const TRIPS_PER_PAGE = 50;

// Theme management
function applyTheme(theme) {
  const t = theme || localStorage.getItem('theme') || 'light';
  document.body.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
  const btn = document.getElementById('theme-toggle');
  btn.textContent = t === 'dark' ? 'Light Mode' : 'Dark Mode';
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.body.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// API functions
async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    updateStatus(true, `Connected • ${data.trips_count?.toLocaleString()} trips in database`);
    return true;
  } catch (err) {
    updateStatus(false, `Backend unreachable: ${err.message}`);
    return false;
  }
}

function updateStatus(isHealthy, message) {
  const indicator = document.getElementById('status-indicator');
  const text = document.getElementById('status-text');
  indicator.className = `status-indicator ${isHealthy ? '' : 'error'}`;
  text.textContent = message;
}

async function fetchSummary(filters = {}) {
  const params = new URLSearchParams();
  if (filters.start) params.set('start', filters.start);
  if (filters.end) params.set('end', filters.end);
  
  const res = await fetch(`${API_BASE}/api/summary?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchTrips(page = 1, filters = {}) {
  const params = new URLSearchParams({
    page: page,
    limit: TRIPS_PER_PAGE
  });
  
  if (filters.start) params.set('start', filters.start);
  if (filters.end) params.set('end', filters.end);
  if (filters.min_distance) params.set('min_distance', filters.min_distance);
  if (filters.max_distance) params.set('max_distance', filters.max_distance);
  
  const res = await fetch(`${API_BASE}/api/trips?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchHotspots(filters = {}) {
  const params = new URLSearchParams({ k: 10 });
  if (filters.start) params.set('start', filters.start);
  if (filters.end) params.set('end', filters.end);
  
  const res = await fetch(`${API_BASE}/api/hotspots?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchInsights(filters = {}) {
  const params = new URLSearchParams();
  if (filters.start) params.set('start', filters.start);
  if (filters.end) params.set('end', filters.end);
  
  const res = await fetch(`${API_BASE}/api/insights?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchTopRoutes(filters = {}) {
  const params = new URLSearchParams({ n: 10 });
  if (filters.start) params.set('start', filters.start);
  if (filters.end) params.set('end', filters.end);
  
  const res = await fetch(`${API_BASE}/api/top-routes?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchFareStats(filters = {}) {
  const params = new URLSearchParams();
  if (filters.start) params.set('start', filters.start);
  if (filters.end) params.set('end', filters.end);
  
  const res = await fetch(`${API_BASE}/api/fare-stats?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// UI update functions
function updateSummaryStats(data) {
  document.getElementById('total-trips').textContent = (data.total_trips || 0).toLocaleString();
  document.getElementById('avg-distance').textContent = (data.avg_distance_km || 0).toFixed(2);
  document.getElementById('avg-fare').textContent = '$' + (data.avg_fare || 0).toFixed(2);
  document.getElementById('avg-speed').textContent = (data.avg_speed_kmh || 0).toFixed(1);
}

function updateTripsTable(data) {
  const tbody = document.getElementById('trips-tbody');
  tbody.innerHTML = '';
  
  const trips = data.rows || [];
  if (trips.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No trips found</td></tr>';
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

  // Update pagination
  const totalPages = Math.ceil((data.total || 0) / TRIPS_PER_PAGE);
  document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById('prev-page').disabled = currentPage <= 1;
  document.getElementById('next-page').disabled = currentPage >= totalPages;
}

let charts = {};

function updateHourChart(data) {
  const ctx = document.getElementById('hourChart').getContext('2d');
  const hourData = data.rush_hour?.data || [];
  
  if (charts.hour) charts.hour.destroy();
  
  charts.hour = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hourData.map(d => d.hour_of_day + ':00'),
      datasets: [{
        label: 'Trips',
        data: hourData.map(d => d.trips),
        backgroundColor: '#0d6efd'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function updateHotspotsChart(data) {
  const ctx = document.getElementById('hotspotsChart').getContext('2d');
  const hotspots = data.slice(0, 10);
  
  if (charts.hotspots) charts.hotspots.destroy();
  
  charts.hotspots = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hotspots.map(h => (h.zone_name || 'Unknown').substring(0, 20)),
      datasets: [{
        label: 'Trips',
        data: hotspots.map(h => h.trips),
        backgroundColor: '#198754'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } }
    }
  });
}

function updateDistanceChart(trips) {
  const ctx = document.getElementById('distanceChart').getContext('2d');
  const bins = [0, 2, 5, 10, 20, 50];
  const labels = ['0-2', '2-5', '5-10', '10-20', '20-50', '50+'];
  const counts = new Array(labels.length).fill(0);
  
  trips.forEach(t => {
    const dist = t.trip_distance_km;
    if (!dist) return;
    const idx = bins.findIndex(b => dist < b);
    counts[idx === -1 ? counts.length - 1 : idx]++;
  });
  
  if (charts.distance) charts.distance.destroy();
  
  charts.distance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Trips',
        data: counts,
        backgroundColor: '#0dcaf0'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function updateSpeedChart(trips) {
  const ctx = document.getElementById('speedChart').getContext('2d');
  const bins = [0, 10, 20, 30, 40, 60, 80];
  const labels = ['0-10', '10-20', '20-30', '30-40', '40-60', '60-80', '80+'];
  const counts = new Array(labels.length).fill(0);
  
  trips.forEach(t => {
    const speed = t.trip_speed_kmh;
    if (!speed) return;
    const idx = bins.findIndex(b => speed < b);
    counts[idx === -1 ? counts.length - 1 : idx]++;
  });
  
  if (charts.speed) charts.speed.destroy();
  
  charts.speed = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Trips',
        data: counts,
        backgroundColor: '#ffc107'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function updateTopRoutesChart(routes) {
  const ctx = document.getElementById('routesChart').getContext('2d');
  const topRoutes = routes.slice(0, 8);
  
  if (charts.routes) charts.routes.destroy();
  
  charts.routes = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: topRoutes.map(r => `${r.pickup_zone_name.substring(0, 15)} → ${r.dropoff_zone_name.substring(0, 15)}`),
      datasets: [{
        label: 'Trips',
        data: topRoutes.map(r => r.trips),
        backgroundColor: '#dc3545'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } }
    }
  });
}

function updateInsightsSection(insights, fareStats, routes) {
  const container = document.getElementById('insights-container');
  if (!container) return;
  
  const morningHotspots = insights.spatial_hotspots?.morning || [];
  const eveningHotspots = insights.spatial_hotspots?.evening || [];
  const topRoute = routes[0];
  const fareData = fareStats.summary || {};
  
  container.innerHTML = `
    <div class="insight-card">
      <h4>Peak Hours Analysis</h4>
      <p>Morning rush (7-9 AM) top pickup: <span class="metric-highlight">${morningHotspots[0]?.zone_name || 'N/A'}</span> with ${morningHotspots[0]?.trips || 0} trips</p>
      <p>Evening rush (5-7 PM) top pickup: <span class="metric-highlight">${eveningHotspots[0]?.zone_name || 'N/A'}</span> with ${eveningHotspots[0]?.trips || 0} trips</p>
    </div>
    <div class="insight-card">
      <h4>Most Popular Route</h4>
      <p><span class="metric-highlight">${topRoute?.pickup_zone_name || 'N/A'}</span> to <span class="metric-highlight">${topRoute?.dropoff_zone_name || 'N/A'}</span></p>
      <p>Total trips: <span class="metric-highlight">${topRoute?.trips?.toLocaleString() || 0}</span></p>
    </div>
    <div class="insight-card">
      <h4>Fare Analysis</h4>
      <p>Average fare per kilometer: <span class="metric-highlight">$${fareData.avg_fare_per_km || '0.00'}</span></p>
      <p>Fare range: <span class="metric-highlight">$${fareData.min_fare || '0.00'}</span> - <span class="metric-highlight">$${fareData.max_fare || '0.00'}</span></p>
    </div>
  `;
}

// Main data loading function
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
    updateHotspotsChart(hotspots);
    updateHourChart(insights);
    updateDistanceChart(trips.rows || []);
    updateSpeedChart(trips.rows || []);
    updateTopRoutesChart(routes);
    updateInsightsSection(insights, fareStats, routes);
  } catch (err) {
    console.error('Error loading data:', err);
    updateStatus(false, `Error: ${err.message}`);
  }
}

// Filter handling
function getFilters() {
  const filters = {};
  
  const dateFrom = document.getElementById('date-from').value;
  const dateTo = document.getElementById('date-to').value;
  const minDist = document.getElementById('distance-min').value;
  const maxDist = document.getElementById('distance-max').value;
  
  if (dateFrom) filters.start = dateFrom;
  if (dateTo) filters.end = dateTo;
  if (minDist) filters.min_distance = minDist;
  if (maxDist) filters.max_distance = maxDist;
  
  return filters;
}

document.getElementById('apply-filters').addEventListener('click', () => {
  currentFilters = getFilters();
  currentPage = 1;
  loadData();
});

document.getElementById('reset-filters').addEventListener('click', () => {
  document.getElementById('date-from').value = '';
  document.getElementById('date-to').value = '';
  document.getElementById('distance-min').value = '';
  document.getElementById('distance-max').value = '';
  currentFilters = {};
  currentPage = 1;
  loadData();
});

// Pagination
document.getElementById('prev-page').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    loadData();
  }
});

document.getElementById('next-page').addEventListener('click', () => {
  currentPage++;
  loadData();
});

// Initialize
async function init() {
  applyTheme();
  
  const isHealthy = await checkHealth();
  if (isHealthy) {
    await loadData();
  } else {
    document.getElementById('trips-tbody').innerHTML = `
      <tr><td colspan="7" class="error-message">
        Cannot connect to backend at ${API_BASE}. 
        Please ensure the Flask server is running on port 5001.
      </td></tr>
    `;
  }
}

init();
