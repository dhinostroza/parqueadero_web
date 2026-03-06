// ─── Dashboard Page ─────────────────────────────────────────────────────────
import { getTodayStats, getOccupancyByZone, getRecentActivity, getOccupancyByLot, getAllDrivers, subscribeToChanges, unsubscribeFromChanges, getActiveVehicles } from '../data/store.js';
import { ZONE_COLORS, MOVEMENT_TYPES, LOT_CAPACITY, PARKING_LOTS, PARKING_POLYGONS } from '../data/constants.js';

let _dashboardChannel = null;

export async function renderDashboard(container) {
  // Show loading state
  container.innerHTML = `
    <div class="page-header">
      <h2>🏢 Panel de Control</h2>
      <p>Cargando datos…</p>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;padding:4rem;">
      <div class="loading-spinner"></div>
    </div>`;

  try {
    const [stats, zones, recent, allDrivers, activeVehicles] = await Promise.all([
      getTodayStats(),
      getOccupancyByZone(),
      getRecentActivity(12),
      getAllDrivers(),
      getActiveVehicles()
    ]);

    // Fetch lot occupancies in parallel
    const lotData = await Promise.all(
      PARKING_LOTS.map(async lot => ({
        lot,
        cap: LOT_CAPACITY[lot],
        occupied: await getOccupancyByLot(lot),
      }))
    );

    container.innerHTML = buildDashboardHTML(stats, zones, recent, allDrivers, lotData, activeVehicles);

    // Initialize map after HTML is in DOM
    initMap(lotData, activeVehicles);

    // Set up real-time subscription
    unsubscribeFromChanges();
    _dashboardChannel = subscribeToChanges(async (table, payload) => {
      // Re-render dashboard on any data change
      const mc = document.getElementById('main-content');
      if (mc) await renderDashboard(mc);
    });

  } catch (err) {
    console.error('Dashboard load error:', err);
    container.innerHTML = `
        <div class="page-header">
          <h2>🏢 Panel de Control</h2>
          <p style="color:var(--danger);">Error cargando datos: ${err.message}</p>
        </div>`;
  }
}

function buildDashboardHTML(stats, zones, recent, allDrivers, lotData, activeVehicles) {
  return `
    <div class="page-header">
      <h2>🏢 Panel de Control</h2>
      <p>Monitoreo en tiempo real del parqueadero — ${new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <!-- Maps Area -->
    <div class="maps-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
      ${PARKING_LOTS.map((lot, idx) => `
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <span class="card-title">🗺️ ${lot}</span>
          </div>
          <div id="hpas-map-${idx}" style="height: 250px; width: 100%; border-radius: 8px; z-index: 1;"></div>
        </div>
      `).join('')}
    </div>

    <!-- Key Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">🚗</div>
        <div>
          <div class="stat-value">${stats.currentlyParked}</div>
          <div class="stat-label">Vehículos adentro</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">🔽</div>
        <div>
          <div class="stat-value">${stats.entries}</div>
          <div class="stat-label">Entradas hoy</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">🔼</div>
        <div>
          <div class="stat-value">${stats.exits}</div>
          <div class="stat-label">Salidas hoy</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">🌟</div>
        <div>
          <div class="stat-value">${zones.vip}</div>
          <div class="stat-label">VIPs activos</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon cyan">♿</div>
        <div>
          <div class="stat-value">${zones.disabled}</div>
          <div class="stat-label">Discapacitados</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">👥</div>
        <div>
          <div class="stat-value">${allDrivers.length}</div>
          <div class="stat-label">Conductores registrados</div>
        </div>
      </div>
    </div>

    <!-- Lot Occupancy -->
    <div class="lot-grid" style="margin-bottom: 2rem;">
      ${lotData.map(({ lot, cap, occupied }) => {
    const pct = Math.round((occupied / cap.total) * 100);
    return `
          <div class="lot-card">
            <div class="lot-header">
              <span class="lot-name">🅿️ ${lot}</span>
              <span class="lot-occupancy">${occupied}/${cap.total}</span>
            </div>
            <div style="font-size:0.78rem;color:var(--text-muted);">
              VIP: ${cap.vip} espacios &bull; Discapacitados: ${cap.disabled} espacios
            </div>
            <div class="occupancy-bar">
              <div class="fill ${pct > 80 ? 'high' : ''}" style="width:${pct}%"></div>
            </div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px;text-align:right;">${pct}% ocupado</div>
          </div>`;
  }).join('')}
    </div>

    <div class="two-col">
      <!-- Zone Distribution -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">📊 Distribución por Zona</span>
        </div>
        <div class="zone-bars">
          ${Object.entries(ZONE_COLORS).map(([key, z]) => `
            <div class="zone-bar">
              <span class="zone-emoji">${z.emoji}</span>
              <span class="zone-count">${zones[key] || 0}</span>
              <span class="zone-label">${z.label}</span>
            </div>
          `).join('')}
          <div class="zone-bar">
            <span class="zone-emoji">🌟</span>
            <span class="zone-count">${zones.vip}</span>
            <span class="zone-label">VIP</span>
          </div>
          <div class="zone-bar">
            <span class="zone-emoji">♿</span>
            <span class="zone-count">${zones.disabled}</span>
            <span class="zone-label">Discapacitados</span>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">📋 Actividad Reciente</span>
        </div>
        <div class="activity-feed">
          ${recent.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">📭</div>
              <p>No hay movimientos registrados</p>
            </div>
          ` : recent.map(log => {
    const mv = MOVEMENT_TYPES[log.tipo_movimiento] || { label: '?', icon: '❓' };
    const isEntry = log.tipo_movimiento === '1';
    const time = new Date(log.fecha_hora).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    const tokenInfo = log.token_type === 'vip' ? '🌟 VIP' :
      log.token_type === 'disabled' ? '♿ Discapacitado' :
        log.color_zona ? (ZONE_COLORS[log.color_zona]?.emoji || '') + ' ' + (ZONE_COLORS[log.color_zona]?.label || '') : '';
    return `
              <div class="activity-item">
                <div class="activity-badge ${isEntry ? 'entry' : 'exit'}">${mv.icon}</div>
                <div class="activity-info">
                  <div class="activity-name">${log.cedula}</div>
                  <div class="activity-detail">${mv.label} ${tokenInfo ? '• ' + tokenInfo : ''} ${log.lote ? '• ' + log.lote : ''}</div>
                </div>
                <div class="activity-time">${time}</div>
              </div>`;
  }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ─── Map Initialization ──────────────────────────────────────────────
let _leafletMaps = [];

function initMap(lotData, activeVehicles) {
  // Cleanup old maps
  _leafletMaps.forEach(map => map && map.remove());
  _leafletMaps = [];

  const lotToPolyId = {
    "Lote B - Subsuelo": "Parqueadero Subsuelo",
    "Lote A - Adoquín": "Parqueadero Adoquín",
    "Lote C - Consulta Externa": "Parqueadero Consulta Externa",
  };

  PARKING_LOTS.forEach((lotName, idx) => {
    const containerId = `hpas-map-${idx}`;
    const mapContainer = document.getElementById(containerId);
    if (!mapContainer) return;

    // Default center (general hospital area)
    let center = [-0.1281, -78.4974];
    let defaultZoom = 18;

    const map = L.map(containerId).setView(center, defaultZoom);
    _leafletMaps.push(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 21,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    const lotStats = lotData.find(l => l.lot === lotName);
    const polyId = lotToPolyId[lotName];
    const polyDef = PARKING_POLYGONS.find(p => p.id === polyId);

    let color = "#3b82f6"; // default blue
    if (lotStats) {
      const pct = Math.round((lotStats.occupied / lotStats.cap.total) * 100);
      if (pct > 80) color = "#ef4444"; // red
      else if (pct > 50) color = "#f59e0b"; // orange
      else color = "#22c55e"; // green
    }

    if (polyDef) {
      let popupContent = `<b>${lotName}</b><br>`;
      if (lotStats) {
        const pct = Math.round((lotStats.occupied / lotStats.cap.total) * 100);
        popupContent += `<hr style="margin:4px 0;border-color:#eee"><br><b>Ocupación:</b> ${lotStats.occupied} / ${lotStats.cap.total} (${pct}%)`;
      }

      const polygon = L.polygon(polyDef.coordinates, {
        color: color,
        fillColor: color,
        fillOpacity: 0.4,
        weight: 2
      }).addTo(map);

      polygon.bindPopup(popupContent);
      polygon.bindTooltip(`${lotName}`, { permanent: false, direction: "center" });

      // Fit to polygon bounds
      map.fitBounds(L.latLngBounds(polyDef.coordinates));
    } else {
      // For lots without a specific polygon (e.g. Temporal), add a marker in a generic location
      const genericLocation = [-0.12805, -78.4975];
      const marker = L.circleMarker(genericLocation, {
        radius: 12,
        color: color,
        fillColor: color,
        fillOpacity: 0.6,
      }).addTo(map);
      marker.bindPopup(`<b>${lotName}</b><br>Espacio sin delimitar`);
      map.setView(genericLocation, 19);
    }
  });
}
