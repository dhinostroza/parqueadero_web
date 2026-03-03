// ─── Drivers Management Page ────────────────────────────────────────────────
import { getAllDrivers, saveDriver, deleteDriver, searchDrivers, isVipActive, calculateVipExpiration, getDriverById } from '../data/store.js';
import { PERSON_TYPES, CARGOS, AREAS, PRIVILEGE_LEVELS, VIP_DURATIONS } from '../data/constants.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal } from '../components/modal.js';

export async function renderDrivers(container) {
  // Show loading
  container.innerHTML = `
    <div class="page-header">
      <h2>👥 Registro de Conductores</h2>
      <p>Gestión de conductores y privilegios de parqueadero</p>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;padding:4rem;">
      <div class="loading-spinner"></div>
    </div>`;

  try {
    const drivers = await getAllDrivers();

    container.innerHTML = `
        <div class="page-header">
          <h2>👥 Registro de Conductores</h2>
          <p>Gestión de conductores y privilegios de parqueadero</p>
        </div>

        <div style="display:flex;gap:var(--sp-4);align-items:center;margin-bottom:var(--sp-6);">
          <div class="search-bar" style="flex:1;margin-bottom:0;">
            <span class="search-icon">🔍</span>
            <input type="text" class="form-input" id="driver-search" placeholder="Buscar por cédula, nombre o placa..." />
          </div>
          <button class="btn btn-primary btn-lg" id="add-driver-btn">+ Nuevo Conductor</button>
        </div>

        <div class="card">
          <div id="drivers-table-wrapper">
            ${renderDriversTable(drivers)}
          </div>
        </div>
      `;

    // Event: Search (debounced)
    let searchTimeout;
    container.querySelector('#driver-search').addEventListener('input', e => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        try {
          const results = await searchDrivers(e.target.value);
          container.querySelector('#drivers-table-wrapper').innerHTML = renderDriversTable(results);
          hookTableActions(container);
        } catch (err) {
          console.error('Search error:', err);
        }
      }, 300);
    });

    // Event: Add driver
    container.querySelector('#add-driver-btn').addEventListener('click', () => openDriverForm(null, container));

    hookTableActions(container);

  } catch (err) {
    console.error('Drivers load error:', err);
    container.innerHTML = `
        <div class="page-header">
          <h2>👥 Registro de Conductores</h2>
          <p style="color:var(--danger);">Error cargando conductores: ${err.message}</p>
        </div>`;
  }
}

function renderDriversTable(drivers) {
  if (drivers.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">🚗</div>
        <p>No hay conductores registrados</p>
      </div>`;
  }

  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Cédula</th>
          <th>Nombre</th>
          <th>Tipo</th>
          <th>Cargo</th>
          <th>Área</th>
          <th>Privilegio</th>
          <th>Placas</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${drivers.map(d => {
    const priv = PRIVILEGE_LEVELS[d.privilegio_parqueo] || { label: '?', icon: '?', cssClass: 'standard' };
    const vipActive = isVipActive(d);
    const privBadge = d.privilegio_parqueo === '2'
      ? (vipActive ? 'badge-gold' : 'badge-muted')
      : d.privilegio_parqueo === '3' ? 'badge-cyan' : 'badge-blue';

    return `
            <tr>
              <td style="font-family:var(--font-mono);font-size:0.82rem;">${d.cedula}</td>
              <td><strong>${d.nombres} ${d.apellidos}</strong></td>
              <td>${PERSON_TYPES[d.tipo_persona]?.icon || ''} ${PERSON_TYPES[d.tipo_persona]?.label || ''}</td>
              <td>${CARGOS[d.cargo]?.label || ''}</td>
              <td>${AREAS[d.area]?.label || ''}</td>
              <td>
                <span class="badge ${privBadge}">
                  ${priv.icon} ${priv.label}
                  ${d.privilegio_parqueo === '2' && vipActive ? ` (→${d.fecha_expiracion_vip})` : ''}
                  ${d.privilegio_parqueo === '2' && !vipActive ? ' (Expirado)' : ''}
                </span>
              </td>
              <td style="font-size:0.82rem;">${d.placa_1 || '—'}${d.placa_2 ? ', ' + d.placa_2 : ''}</td>
              <td>
                <button class="btn btn-ghost btn-sm edit-driver" data-id="${d.id}">✏️</button>
                <button class="btn btn-ghost btn-sm delete-driver" data-id="${d.id}" data-name="${d.nombres} ${d.apellidos}">🗑️</button>
              </td>
            </tr>`;
  }).join('')}
      </tbody>
    </table>`;
}

function hookTableActions(container) {
  container.querySelectorAll('.edit-driver').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const driver = await getDriverById(parseInt(btn.dataset.id));
        if (driver) openDriverForm(driver, container);
      } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
      }
    });
  });

  container.querySelectorAll('.delete-driver').forEach(btn => {
    btn.addEventListener('click', () => {
      openModal('Confirmar eliminación', `
        <p>¿Está seguro de eliminar al conductor <strong>${btn.dataset.name}</strong>?</p>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:var(--sp-3);">Esta acción no se puede deshacer.</p>
      `, [
        { id: 'cancel', label: 'Cancelar', class: 'btn-ghost', onClick: closeModal },
        {
          id: 'confirm', label: 'Eliminar', class: 'btn-danger', onClick: async () => {
            try {
              await deleteDriver(parseInt(btn.dataset.id));
              closeModal();
              showToast('Conductor eliminado', 'success');
              await renderDrivers(container);
            } catch (err) {
              showToast(`Error: ${err.message}`, 'error');
            }
          }
        },
      ]);
    });
  });
}

function openDriverForm(driver, pageContainer) {
  const isEdit = !!driver;
  const today = new Date().toISOString().split('T')[0];

  const formHTML = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Número de Cédula *</label>
        <input type="text" class="form-input" id="f-cedula" value="${driver?.cedula || ''}" placeholder="10 dígitos" maxlength="10" ${isEdit ? 'readonly style="opacity:0.6"' : ''} />
        <span class="form-hint">Ingrese los 10 dígitos</span>
      </div>
      <div class="form-group">
        <label class="form-label">Tipo de Persona *</label>
        <select class="form-select" id="f-tipo">
          <option value="">Seleccione...</option>
          ${Object.entries(PERSON_TYPES).map(([k, v]) => `<option value="${k}" ${driver?.tipo_persona === k ? 'selected' : ''}>${v.icon} ${v.label}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Nombres *</label>
        <input type="text" class="form-input" id="f-nombres" value="${driver?.nombres || ''}" placeholder="Nombres" />
      </div>
      <div class="form-group">
        <label class="form-label">Apellidos *</label>
        <input type="text" class="form-input" id="f-apellidos" value="${driver?.apellidos || ''}" placeholder="Apellidos" />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Cargo *</label>
        <select class="form-select" id="f-cargo">
          <option value="">Seleccione...</option>
          ${Object.entries(CARGOS).map(([k, v]) => `<option value="${k}" ${driver?.cargo === k ? 'selected' : ''}>${v.icon} ${v.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Área *</label>
        <select class="form-select" id="f-area">
          <option value="">Seleccione...</option>
          ${Object.entries(AREAS).map(([k, v]) => `<option value="${k}" ${driver?.area === k ? 'selected' : ''}>${v.icon} ${v.label}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Nivel de Privilegio *</label>
      <div class="radio-group" id="f-privilegio-group">
        ${Object.entries(PRIVILEGE_LEVELS).map(([k, v]) => `
          <div class="radio-card">
            <input type="radio" name="privilegio" id="priv-${k}" value="${k}" ${driver?.privilegio_parqueo === k ? 'checked' : ''} />
            <label for="priv-${k}">
              <span class="radio-emoji">${v.icon}</span>
              <span class="radio-text">${v.label}</span>
            </label>
          </div>
        `).join('')}
      </div>
    </div>

    <div id="vip-fields" style="display:none;">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Fecha de Inicio VIP</label>
          <input type="date" class="form-input" id="f-vip-start" value="${driver?.fecha_inicio_vip || today}" />
        </div>
        <div class="form-group">
          <label class="form-label">Duración del Pase VIP</label>
          <select class="form-select" id="f-vip-duration">
            ${Object.entries(VIP_DURATIONS).map(([k, v]) => `<option value="${k}" ${String(driver?.duracion_vip) === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Fecha de Expiración VIP (calculada)</label>
        <input type="date" class="form-input" id="f-vip-expiry" value="${driver?.fecha_expiracion_vip || ''}" readonly style="opacity:0.7" />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Placa Vehículo 1</label>
        <input type="text" class="form-input" id="f-placa1" value="${driver?.placa_1 || ''}" placeholder="Ej. PAB-1234" style="text-transform:uppercase" />
      </div>
      <div class="form-group">
        <label class="form-label">Placa Vehículo 2</label>
        <input type="text" class="form-input" id="f-placa2" value="${driver?.placa_2 || ''}" placeholder="Ej. PCX-5678 (Pico y Placa)" style="text-transform:uppercase" />
      </div>
    </div>
  `;

  openModal(isEdit ? '✏️ Editar Conductor' : '➕ Nuevo Conductor', formHTML, [
    { id: 'cancel', label: 'Cancelar', class: 'btn-ghost', onClick: closeModal },
    { id: 'save', label: isEdit ? 'Guardar Cambios' : 'Registrar', class: 'btn-primary', onClick: () => handleSave(driver, pageContainer) },
  ]);

  // VIP field toggle
  const toggleVip = () => {
    const selected = document.querySelector('input[name="privilegio"]:checked');
    const vipFields = document.getElementById('vip-fields');
    if (vipFields) vipFields.style.display = selected?.value === '2' ? 'block' : 'none';
    updateVipExpiry();
  };

  const updateVipExpiry = () => {
    const start = document.getElementById('f-vip-start')?.value;
    const dur = document.getElementById('f-vip-duration')?.value;
    const expiry = document.getElementById('f-vip-expiry');
    if (start && dur && expiry) {
      expiry.value = calculateVipExpiration(start, dur);
    }
  };

  document.querySelectorAll('input[name="privilegio"]').forEach(r => r.addEventListener('change', toggleVip));
  document.getElementById('f-vip-start')?.addEventListener('change', updateVipExpiry);
  document.getElementById('f-vip-duration')?.addEventListener('change', updateVipExpiry);

  toggleVip();
}

async function handleSave(existingDriver, pageContainer) {
  const cedula = document.getElementById('f-cedula').value.trim();
  const nombres = document.getElementById('f-nombres').value.trim();
  const apellidos = document.getElementById('f-apellidos').value.trim();
  const tipo_persona = document.getElementById('f-tipo').value;
  const cargo = document.getElementById('f-cargo').value;
  const area = document.getElementById('f-area').value;
  const privilegio = document.querySelector('input[name="privilegio"]:checked')?.value;

  // Validation
  if (!cedula || !nombres || !apellidos || !tipo_persona || !cargo || !area || !privilegio) {
    showToast('Complete todos los campos obligatorios (*)', 'error');
    return;
  }
  if (cedula.length !== 10 || !/^\d+$/.test(cedula)) {
    showToast('La cédula debe tener exactamente 10 dígitos', 'error');
    return;
  }

  const driver = {
    ...(existingDriver || {}),
    cedula, nombres, apellidos, tipo_persona, cargo, area,
    privilegio_parqueo: privilegio,
    placa_1: document.getElementById('f-placa1').value.trim().toUpperCase(),
    placa_2: document.getElementById('f-placa2').value.trim().toUpperCase(),
  };

  if (privilegio === '2') {
    driver.fecha_inicio_vip = document.getElementById('f-vip-start').value;
    driver.duracion_vip = parseInt(document.getElementById('f-vip-duration').value);
    driver.fecha_expiracion_vip = document.getElementById('f-vip-expiry').value;
  }

  try {
    await saveDriver(driver);
    closeModal();
    showToast(existingDriver ? 'Conductor actualizado' : 'Conductor registrado exitosamente', 'success');
    await renderDrivers(pageContainer);
  } catch (err) {
    showToast(err.message, 'error');
  }
}
