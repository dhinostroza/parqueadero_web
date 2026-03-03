// ─── History / Log Page ─────────────────────────────────────────────────────
import { getAllLogs, getDriverByCedula } from '../data/store.js';
import { MOVEMENT_TYPES, ZONE_COLORS, RETURN_COLORS } from '../data/constants.js';

// Cache drivers for rendering (avoid async in table cell rendering)
let _driversCache = {};

export async function renderHistory(container) {
  // Show loading
  container.innerHTML = `
    <div class="page-header">
      <h2>📜 Bitácora del Parqueadero</h2>
      <p>Cargando historial…</p>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;padding:4rem;">
      <div class="loading-spinner"></div>
    </div>`;

  try {
    const allLogs = await getAllLogs();

    // Pre-fetch driver names for all unique cedulas
    const uniqueCedulas = [...new Set(allLogs.map(l => l.cedula))];
    const driverPromises = uniqueCedulas.map(async cedula => {
      const driver = await getDriverByCedula(cedula);
      _driversCache[cedula] = driver;
    });
    await Promise.all(driverPromises);

    container.innerHTML = `
        <div class="page-header">
          <h2>📜 Bitácora del Parqueadero</h2>
          <p>Historial completo de movimientos de entrada y salida</p>
        </div>

        <div style="display:flex;gap:var(--sp-4);flex-wrap:wrap;margin-bottom:var(--sp-6);">
          <div class="search-bar" style="flex:1;min-width:200px;margin-bottom:0;">
            <span class="search-icon">🔍</span>
            <input type="text" class="form-input" id="log-search" placeholder="Filtrar por cédula..." />
          </div>
          <select class="form-select" id="log-filter-type" style="width:160px;">
            <option value="">Todos los tipos</option>
            <option value="1">🔽 Entradas</option>
            <option value="2">🔼 Salidas</option>
          </select>
          <input type="date" class="form-input" id="log-filter-date" style="width:180px;" />
          <button class="btn btn-ghost" id="log-clear-filters">Limpiar filtros</button>
        </div>

        <div class="card">
          <div id="log-table-wrapper">
            ${renderLogTable(allLogs)}
          </div>
        </div>

        <div style="margin-top:var(--sp-4);display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:0.82rem;color:var(--text-muted);">Total: <strong>${allLogs.length}</strong> registros</span>
        </div>
      `;

    // Filters
    const searchInput = container.querySelector('#log-search');
    const typeFilter = container.querySelector('#log-filter-type');
    const dateFilter = container.querySelector('#log-filter-date');
    const clearBtn = container.querySelector('#log-clear-filters');

    const applyFilters = async () => {
      try {
        let filtered = await getAllLogs();
        const q = searchInput.value.trim();
        const type = typeFilter.value;
        const date = dateFilter.value;

        if (q) filtered = filtered.filter(l => String(l.cedula).includes(q));
        if (type) filtered = filtered.filter(l => l.tipo_movimiento === type);
        if (date) filtered = filtered.filter(l => l.fecha_hora.startsWith(date));

        container.querySelector('#log-table-wrapper').innerHTML = renderLogTable(filtered);
      } catch (err) {
        console.error('Filter error:', err);
      }
    };

    let filterTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(filterTimeout);
      filterTimeout = setTimeout(applyFilters, 300);
    });
    typeFilter.addEventListener('change', applyFilters);
    dateFilter.addEventListener('change', applyFilters);
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      typeFilter.value = '';
      dateFilter.value = '';
      applyFilters();
    });

  } catch (err) {
    console.error('History load error:', err);
    container.innerHTML = `
        <div class="page-header">
          <h2>📜 Bitácora del Parqueadero</h2>
          <p style="color:var(--danger);">Error cargando historial: ${err.message}</p>
        </div>`;
  }
}

function renderLogTable(logs) {
  if (logs.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>No hay registros de movimiento</p>
      </div>`;
  }

  return `
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Fecha/Hora</th>
            <th>Cédula</th>
            <th>Conductor</th>
            <th>Movimiento</th>
            <th>Tipo Token</th>
            <th>Zona/Color</th>
            <th># Token</th>
            <th>Placa/Detalles</th>
            <th>Lote</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(l => {
    const mv = MOVEMENT_TYPES[l.tipo_movimiento] || { label: '?', icon: '?', color: '#666' };
    const isEntry = l.tipo_movimiento === '1';
    const driver = _driversCache[l.cedula];
    const driverName = driver ? `${driver.nombres} ${driver.apellidos}` : '—';

    let zoneDisplay = '—';
    if (isEntry) {
      if (l.token_type === 'vip') zoneDisplay = '🌟 VIP Dorado';
      else if (l.token_type === 'disabled') zoneDisplay = '♿ Discapacitado';
      else if (l.color_zona) {
        const z = ZONE_COLORS[l.color_zona];
        zoneDisplay = z ? `${z.emoji} ${z.label}` : '—';
      }
    } else {
      if (l.return_color !== undefined) {
        const rc = RETURN_COLORS[l.return_color];
        zoneDisplay = rc ? `${rc.emoji} ${rc.label}` : '—';
      }
    }

    const tokenType = l.token_type === 'vip' ? 'Dorado' : l.token_type === 'disabled' ? 'Discapacidad' : l.token_type === 'standard' ? 'Estándar' : isEntry ? '—' : 'Devuelto';

    const fecha = new Date(l.fecha_hora);
    const dateStr = fecha.toLocaleDateString('es-EC');
    const timeStr = fecha.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return `
              <tr>
                <td>
                  <div style="font-size:0.82rem;">${dateStr}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono);">${timeStr}</div>
                </td>
                <td style="font-family:var(--font-mono);font-size:0.82rem;">${l.cedula}</td>
                <td>${driverName}</td>
                <td>
                  <span class="badge ${isEntry ? 'badge-green' : 'badge-red'}">
                    ${mv.icon} ${mv.label}
                  </span>
                </td>
                <td style="font-size:0.82rem;">${tokenType}</td>
                <td>${zoneDisplay}</td>
                <td style="font-family:var(--font-mono);font-weight:600;">${l.token_number || '—'}</td>
                <td style="font-size:0.82rem;">
                  ${l.placa ? `<b>🚗 ${l.placa}</b><br/>` : ''}
                  ${l.conductor_institucional ? `🧑‍✈️ ${l.conductor_institucional}<br/>` : ''}
                  ${l.kilometraje ? `🛣️ ${l.kilometraje} km` : (!l.placa && !l.conductor_institucional) ? '—' : ''}
                </td>
                <td>${l.lote || '—'}</td>
              </tr>`;
  }).join('')}
        </tbody>
      </table>
    </div>`;
}
