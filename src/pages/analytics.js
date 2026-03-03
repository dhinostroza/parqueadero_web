import Chart from 'chart.js/auto';
import { getAllLogs } from '../data/store.js';
import { getDriverByCedula } from '../data/store.js';
import { MOVEMENT_TYPES, ZONE_COLORS } from '../data/constants.js';

let _chartInstances = {};

export async function renderAnalytics(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>📈 Reportes y Análisis</h2>
      <p>Tendencias históricas y respaldos generados para la Gerencia</p>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;padding:4rem;">
      <div class="loading-spinner"></div>
    </div>`;

  try {
    const allLogs = await getAllLogs();

    // Process Institutional specific data
    const instLogs = allLogs.filter(l => l.conductor_institucional || l.kilometraje).sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
    const instCedulas = [...new Set(instLogs.map(l => l.cedula))];
    const instDrivers = {};
    const driverPromises = instCedulas.map(async c => { instDrivers[c] = await getDriverByCedula(c); });
    await Promise.all(driverPromises);

    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h2>📈 Reportes y Análisis</h2>
          <p>Tendencias históricas y respaldos generados para la Gerencia</p>
        </div>
        <button id="btn-export-csv" class="btn btn-primary" style="margin-bottom: var(--sp-4);">
          📥 Exportar Base de Datos a CSV
        </button>
      </div>

      <div class="two-col" style="margin-bottom: var(--sp-6);">
        <!-- Trends Chart -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Ingresos Mensuales (Últimos 30 días)</span>
          </div>
          <div style="position: relative; height: 300px; width: 100%;">
            <canvas id="chart-trends"></canvas>
          </div>
        </div>

        <!-- Zones Chart -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Uso por Zona / Lote</span>
          </div>
          <div style="position: relative; height: 300px; width: 100%; display: flex; justify-content: center;">
            <canvas id="chart-zones"></canvas>
          </div>
        </div>
      </div>
      
      <div class="card" style="padding: 2rem; text-align: center; color: var(--text-muted); margin-bottom: var(--sp-6);">
        <p>Resumen rápido documental disponible para auditorías y exportaciones. Los datos son sincronizados asíncronamente y agrupados según el volumen de accesos.</p>
        <p style="font-family: var(--font-mono); font-size: 0.8rem; margin-top: 1rem;">Total de registros históricos accesibles: <strong>${allLogs.length}</strong> eventos.</p>
      </div>
      
      <!-- Institutional Vehicles Table -->
      <div class="card" style="margin-bottom: var(--sp-6); border-top: 4px solid var(--danger);">
        <div class="card-header" style="background: rgba(239,68,68,0.1);">
          <span class="card-title" style="color: var(--danger);">🚨 Auditoría de Recursos de Flota Institucional</span>
        </div>
        <div style="padding: 1rem; overflow-x: auto;">
           <p style="margin-bottom:1rem;font-size:0.9rem;color:var(--text-muted);">Seguimiento de kilometraje y consumo interno de ambulancias y camiones en fines de semana.</p>
           
           <div id="weekend-chart-container" style="position: relative; height: 250px; width: 100%; margin-bottom: 2rem;">
             <canvas id="chart-weekend-mileage"></canvas>
           </div>
           
           <h4 style="margin-bottom: var(--sp-2);">Historial Crudo de Movimientos</h4>
           ${renderInstitutionalTable(instLogs, instDrivers)}
        </div>
      </div>
    `;

    // Process Data
    const trendsData = processTrends(allLogs);
    const zonesData = processZones(allLogs);
    const weekendData = processWeekendMileage(instLogs);

    // Render Charts
    setTimeout(() => {
      renderTrendsChart('chart-trends', trendsData);
      renderZonesChart('chart-zones', zonesData);
      if (weekendData.labels.length > 0) {
        renderWeekendChart('chart-weekend-mileage', weekendData);
      } else {
        const weekendCanvasContainer = document.getElementById('weekend-chart-container');
        if (weekendCanvasContainer) {
          weekendCanvasContainer.innerHTML = '<div class="empty-state">No se registraron viajes de fin de semana en el historial.</div>';
        }
      }
    }, 50);

    // Export CSV logic
    document.getElementById('btn-export-csv').addEventListener('click', async () => {
      const csvString = await generateCSV(allLogs);
      downloadCSV(csvString, `parqueadero_bitacora_${new Date().toISOString().split('T')[0]}.csv`);
    });

  } catch (err) {
    console.error('Analytics load error:', err);
    container.innerHTML = `
      <div class="page-header">
        <h2>📈 Reportes y Análisis</h2>
        <p style="color:var(--danger);">Error cargando las analíticas: ${err.message}</p>
      </div>`;
  }
}

function renderInstitutionalTable(logs, driversDict) {
  if (logs.length === 0) return `<div class="empty-state">No hay registros institucionales recientes.</div>`;

  // Show only latest 20 for brevity
  const displayLogs = logs.slice(0, 20);

  return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Fecha/Hora</th>
            <th>Movimiento</th>
            <th>Vehículo (Placa/Detalle)</th>
            <th>Manejado Por</th>
            <th>Kilometraje</th>
          </tr>
        </thead>
        <tbody>
          ${displayLogs.map(l => {
    const mv = MOVEMENT_TYPES[l.tipo_movimiento] || { label: '?', icon: '?' };
    const driver = driversDict[l.cedula];
    const unitName = driver ? `${driver.nombres} ${driver.apellidos}` : 'Desconocido';

    const fecha = new Date(l.fecha_hora);
    const dateStr = fecha.toLocaleDateString('es-EC');
    const timeStr = fecha.toLocaleTimeString('es-EC');

    return `
                <tr>
                   <td>
                     <div style="font-size:0.82rem;">${dateStr}</div>
                     <div style="font-size:0.75rem;color:var(--text-muted);">${timeStr}</div>
                   </td>
                   <td><span class="badge ${l.tipo_movimiento === '1' ? 'badge-green' : 'badge-red'}">${mv.icon} ${mv.label}</span></td>
                   <td>
                      <strong>🚗 ${l.placa || 'N/A'}</strong><br/>
                      <small style="color:var(--text-muted);">${unitName}</small>
                   </td>
                   <td style="font-weight:500;">🧑‍✈️ ${l.conductor_institucional || 'N/R'}</td>
                   <td style="font-family:var(--font-mono);">${l.kilometraje ? `${l.kilometraje} km` : 'N/R'}</td>
                </tr>
              `;
  }).join('')}
        </tbody>
      </table>
    `;
}

// ─── Data Processing for Charts ─────────────────────────────────────────────

function processWeekendMileage(instLogs) {
  // Sort oldest to newest for chronological state processing
  const chronological = [...instLogs].sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));

  const state = {};
  const labels = [];
  const data = [];
  const bgColors = [];

  chronological.forEach(log => {
    const id = log.placa || log.cedula;
    if (log.tipo_movimiento === '2') { // Salida
      state[id] = log;
    } else if (log.tipo_movimiento === '1') { // Entrada
      const salida = state[id];
      if (salida && salida.kilometraje && log.kilometraje) {
        const startKm = parseFloat(salida.kilometraje);
        const endKm = parseFloat(log.kilometraje);
        const diff = endKm - startKm;

        if (diff > 0) {
          const dOut = new Date(salida.fecha_hora);
          const dIn = new Date(log.fecha_hora);

          // Check if either Out or In are during a weekend (0=Sun, 6=Sat)
          if (dOut.getDay() === 0 || dOut.getDay() === 6 || dIn.getDay() === 0 || dIn.getDay() === 6) {
            labels.push(`${id} (${dIn.toLocaleDateString('es-EC')})`);
            data.push(diff);
            bgColors.push(diff > 50 ? '#ef4444' : '#3b82f6'); // Red if > 50 else Blue
          }
        }
      }
      state[id] = null;
    }
  });

  return { labels, data, bgColors };
}

function processTrends(logs) {
  // Group entries by date
  const entriesOnly = logs.filter(l => l.tipo_movimiento === '1');
  const countsByDate = {};

  // For the last 30 days, initialize to 0 so the chart looks continuous
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    countsByDate[dateStr] = 0;
  }

  entriesOnly.forEach(log => {
    const dateStr = log.fecha_hora.split('T')[0];
    if (countsByDate[dateStr] !== undefined) {
      countsByDate[dateStr]++;
    } else {
      // if older than 30 days, we could ignore or track, but we ignore for UI brevity
    }
  });

  return {
    labels: Object.keys(countsByDate),
    data: Object.values(countsByDate)
  };
}

function processZones(logs) {
  const entriesOnly = logs.filter(l => l.tipo_movimiento === '1');
  const counts = {
    'Zona Morada': 0,
    'Zona Azul': 0,
    'Zona Verde': 0,
    'Zona Naranja': 0,
    'VIP': 0,
    'Discapacitado': 0,
    'Genérico / Lote': 0
  };

  entriesOnly.forEach(log => {
    if (log.token_type === 'vip') {
      counts['VIP']++;
    } else if (log.token_type === 'disabled') {
      counts['Discapacitado']++;
    } else if (log.color_zona) {
      const zoneName = ZONE_COLORS[log.color_zona]?.label;
      if (zoneName) counts[zoneName] = (counts[zoneName] || 0) + 1;
    } else {
      counts['Genérico / Lote']++;
    }
  });

  // Remove zero-counted slices for cleaner chart
  const filteredLabels = [];
  const filteredData = [];
  for (const [key, val] of Object.entries(counts)) {
    if (val > 0) {
      filteredLabels.push(key);
      filteredData.push(val);
    }
  }

  return { labels: filteredLabels, data: filteredData };
}

// ─── Chart Rendering ────────────────────────────────────────────────────────

function renderTrendsChart(canvasId, { labels, data }) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (_chartInstances[canvasId]) {
    _chartInstances[canvasId].destroy();
  }

  // Prettify dates (from YYYY-MM-DD to DD/MM)
  const prettyLabels = labels.map(d => {
    const parts = d.split('-');
    return `${parts[2]}/${parts[1]}`;
  });

  _chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: prettyLabels,
      datasets: [{
        label: 'Vehículos Ingresados',
        data: data,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, suggestedMax: 5 } // Make scale adaptive but distinct
      }
    }
  });
}

function renderZonesChart(canvasId, { labels, data }) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (_chartInstances[canvasId]) {
    _chartInstances[canvasId].destroy();
  }

  // Custom colors matching our CSS tokens broadly
  const colorMap = {
    'Zona Morada': '#a855f7',
    'Zona Azul': '#3b82f6',
    'Zona Verde': '#22c55e',
    'Zona Naranja': '#f97316',
    'VIP': '#eab308',
    'Discapacitado': '#06b6d4',
    'Genérico / Lote': '#64748b'
  };

  const bgColors = labels.map(l => colorMap[l] || '#475569');

  _chartInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: bgColors,
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#94a3b8' }
        }
      }
    }
  });
}

function renderWeekendChart(canvasId, { labels, data, bgColors }) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (_chartInstances[canvasId]) {
    _chartInstances[canvasId].destroy();
  }

  _chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Distancia Recorrida (km)',
        data: data,
        backgroundColor: bgColors,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              return context.parsed.y + ' km';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Kilómetros (km)' }
        }
      }
    }
  });
}

// ─── CSV Export ─────────────────────────────────────────────────────────────

async function generateCSV(logs) {
  // Pre-fetch names for all cedulas to include full info
  const uniqueCedulas = [...new Set(logs.map(l => l.cedula))];
  const driverDict = {};
  for (const cedula of uniqueCedulas) {
    driverDict[cedula] = await getDriverByCedula(cedula);
  }

  const headers = [
    'ID Log',
    'Fecha y Hora',
    'Cedula',
    'Conductor',
    'Movimiento',
    'Lote',
    'Zona o Beneficio',
    'Numero Token',
    'Color Devolucion',
    'Placa',
    'Conductor Institucional',
    'Kilometraje'
  ];

  const rows = logs.map(log => {
    const driver = driverDict[log.cedula];
    const driverName = driver ? `${driver.nombres} ${driver.apellidos}` : 'Desconocido';
    const movement = log.tipo_movimiento === '1' ? 'Entrada' : 'Salida';

    let zoneBenefitStr = '';
    if (log.tipo_movimiento === '1') {
      if (log.token_type === 'vip') zoneBenefitStr = 'VIP Dorado';
      else if (log.token_type === 'disabled') zoneBenefitStr = 'Discapacitado';
      else if (log.color_zona) zoneBenefitStr = ZONE_COLORS[log.color_zona]?.label || log.color_zona;
      else zoneBenefitStr = 'Estandar';
    }

    return [
      log.id,
      log.fecha_hora,
      log.cedula,
      driverName,
      movement,
      log.lote || '-',
      zoneBenefitStr || '-',
      log.token_number || '-',
      log.return_color ? (ZONE_COLORS[log.return_color]?.label || log.return_color) : '-',
      log.placa || '-',
      log.conductor_institucional || '-',
      log.kilometraje || '-'
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
  ].join('\\n');

  return csvContent;
}

function downloadCSV(csvString, filename) {
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' }); // Add BOM for excel compat
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
