// ─── Guard Workflow Page ────────────────────────────────────────────────────
// Optimized for tablet usage at guard booth
import { searchDrivers, getDriverVehiclesStatus, getDriverByCedula, isDriverParked, addLogEntry, getLastMovement, isVipActive, getLogsByDriver, getDriverBanStatus, addInfraction } from '../data/store.js';
import { PRIVILEGE_LEVELS, ZONE_COLORS, RETURN_COLORS, PERSON_TYPES, CARGOS, AREAS, PARKING_LOTS } from '../data/constants.js';
import { showToast } from '../components/toast.js';
import { getCurrentUser } from '../data/auth.js';

let currentDriver = null;
let selectedMovement = null;
let pageRef = null;

export async function renderGuard(container) {
  pageRef = container;
  currentDriver = null;
  selectedMovement = null;

  const user = getCurrentUser();
  const assignedLot = user && user.assignedLot ? ` — ${user.assignedLot}` : '';

  container.innerHTML = `
    <div class="page-header">
      <h2>🛡️ Control de Acceso${assignedLot}</h2>
      <p>Registro de entrada y salida de vehículos</p>
    </div>

    <!-- Cédula Search -->
    <div class="card" style="margin-bottom:var(--sp-6);">
      <div class="card-header"><span class="card-title">🔍 Buscar Vehículo o Conductor</span></div>
      <div class="guard-search" style="display:flex; gap: 8px; flex-wrap: wrap;">
        <input type="text" class="form-input" style="flex:1; min-width: 200px;" id="guard-cedula" placeholder="Ingrese la cédula o placa..." maxlength="10" autofocus />
        
        <div style="display:flex; gap: 8px;">
          <button class="btn btn-primary" id="guard-search-btn" style="white-space:nowrap;">Buscar</button>
          
          <button class="btn btn-outline" id="guard-btn-camera" style="white-space:nowrap; display:flex; align-items:center; gap: 6px;" title="Cámara en vivo">
            <span>📷 Cámara</span>
          </button>

          <label class="btn btn-outline" style="cursor:pointer; white-space:nowrap; display:flex; align-items:center; gap: 6px;" title="Subir Imagen">
            <span>📁 Archivo</span>
            <input type="file" id="guard-ocr-input-file" accept="image/*" style="display:none;" />
          </label>
        </div>
      </div>
      
      <!-- Camera Container -->
      <div id="camera-container" style="display:none; margin-top: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; background: var(--bg-elevated); text-align: center;">
         <video id="camera-video" autoplay playsinline style="width: 100%; max-width: 400px; border-radius: var(--radius-sm); background: #000;"></video>
         <canvas id="camera-canvas" style="display:none;"></canvas>
         <div style="margin-top: 1rem; display: flex; gap: 8px; justify-content: center;">
             <button class="btn btn-primary" id="btn-take-photo">📸 Tomar Foto y Leer</button>
             <button class="btn btn-secondary" id="btn-close-camera">Cancelar</button>
         </div>
      </div>

      <div id="ocr-status" style="font-size: 0.8rem; margin-top: 8px; color: var(--text-muted); display: none;"></div>
      <div id="guard-driver-info" style="margin-top:var(--sp-4);"></div>
    </div>

    <!-- Workflow Steps -->
    <div id="guard-workflow" style="display:none;"></div>
  `;

  const searchInput = container.querySelector('#guard-cedula');
  const searchBtn = container.querySelector('#guard-search-btn');
  const ocrStatus = container.querySelector('#ocr-status');

  // Camera Elements
  const btnCamera = container.querySelector('#guard-btn-camera');
  const fileInput = container.querySelector('#guard-ocr-input-file');
  const cameraContainer = container.querySelector('#camera-container');
  const cameraVideo = container.querySelector('#camera-video');
  const cameraCanvas = container.querySelector('#camera-canvas');
  const btnTakePhoto = container.querySelector('#btn-take-photo');
  const btnCloseCamera = container.querySelector('#btn-close-camera');
  let mediaStream = null;

  searchBtn.addEventListener('click', () => lookupDriver(searchInput.value));
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') lookupDriver(searchInput.value);
  });

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleOCRScan(e.target.files[0], searchInput, ocrStatus);
        e.target.value = ''; // Reset
      }
    });
  }

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    cameraContainer.style.display = 'none';
  };

  btnCamera.addEventListener('click', async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        cameraVideo.srcObject = mediaStream;
        cameraContainer.style.display = 'block';
        ocrStatus.style.display = 'none';
      } catch (err) {
        showToast('No se pudo acceder a la cámara.', 'danger');
        console.error("Camera access error:", err);
      }
    } else {
      showToast('Tu navegador no soporta el acceso a la cámara web.', 'danger');
    }
  });

  btnCloseCamera.addEventListener('click', stopCamera);

  btnTakePhoto.addEventListener('click', () => {
    if (!mediaStream) return;

    const width = cameraVideo.videoWidth;
    const height = cameraVideo.videoHeight;
    cameraCanvas.width = width;
    cameraCanvas.height = height;

    const ctx = cameraCanvas.getContext('2d');
    ctx.drawImage(cameraVideo, 0, 0, width, height);

    cameraCanvas.toBlob(blob => {
      stopCamera();
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      handleOCRScan(file, searchInput, ocrStatus);
    }, 'image/jpeg', 0.95);
  });
}

async function handleOCRScan(file, inputElement, statusElement) {
  if (!file) return;

  statusElement.style.display = 'block';
  statusElement.innerHTML = `<span style="color:var(--primary);">⏳ Procesando imagen, un momento...</span>`;

  // Display a temporary preview of what the camera captured to help debug
  const previewUrl = URL.createObjectURL(file);
  const previewRenderer = `<div style="margin-top:8px;"><img src="${previewUrl}" style="max-height: 100px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);" alt="Captura a analizar"/></div>`;

  // Tesseract configuration
  try {
    const worker = await Tesseract.createWorker('spa');
    const ret = await worker.recognize(file);
    const text = ret.data.text.trim().toUpperCase();
    await worker.terminate();

    // 1. Tesseract often reads 0 as O, 1 as I, etc.
    // We do a primary generic search for 2-3 letters followed by 3-4 numbers.
    // If it's a bit fuzzy, we let it pass.
    let cleanT = text.replace(/O/g, '0').replace(/I/g, '1');
    // regex: 3 letters, optional spaces/dash, 3 to 4 numbers. 
    // Wait, typical is 3 numbers + 3-4 numbers. But the letters are first. Let's just rely on the original text, but upper cased.

    const plateRegex = /[a-zA-Z]{2,3}[-\s]*\d{3,4}/g;
    const matches = text.match(plateRegex);

    if (matches && matches.length > 0) {
      // Clean up the match (remove spaces, ensure uppercase)
      const rawPlate = matches[0].replace(/[\s-]/g, '').substring(0, 10).toUpperCase();

      // Ensure 'O' in the number section is turned into '0' (e.g. PCA12O4 -> PCA1204)
      const cleanedPlate = rawPlate.replace(/^([A-Z]{2,3})(.*)$/, (_, letters, numbers) => {
        return letters + numbers.replace(/O/g, '0').replace(/I/g, '1').replace(/S/g, '5');
      });

      inputElement.value = cleanedPlate;
      statusElement.innerHTML = `<span style="color:var(--success);">✅ Placa detectada: ${cleanedPlate}</span>${previewRenderer}`;

      // Auto trigger search
      lookupDriver(cleanedPlate);
    } else {
      statusElement.innerHTML = `<span style="color:var(--danger);">❌ No se detectó ninguna placa. La IA leyó: "${text.substring(0, 30)}...".</span>${previewRenderer}`;
      console.log("Valores crudos leídos del OCR:", text);
    }

  } catch (error) {
    statusElement.innerHTML = `<span style="color:var(--danger);">❌ Error procesando OCR: ${error.message}</span>${previewRenderer}`;
    console.error("OCR Error:", error);
  }
}

async function lookupDriver(cedula) {
  const clean = cedula.trim();
  if (!clean || clean.length < 5) {
    showToast('Ingrese un número de cédula o placa válido', 'warning');
    return;
  }

  const infoDiv = document.getElementById('guard-driver-info');
  const workflowDiv = document.getElementById('guard-workflow');

  // Show loading
  infoDiv.innerHTML = `<div style="padding:var(--sp-4);text-align:center;color:var(--text-muted);">Buscando...</div>`;

  try {
    // Attempt to find driver by plate or cedula
    const driversMatches = await searchDrivers(clean);

    // In a production app you'd handle multiple matches (e.g., partial plate search)
    // For this prototype, we'll take the first exact or closest match.
    const driver = driversMatches.length > 0 ? driversMatches[0] : null;

    if (!driver) {
      infoDiv.innerHTML = `
          <div class="alert alert-danger">
            <span class="alert-icon">❌</span>
            <div>
              <strong>Conductor o Vehículo no encontrado</strong>
              <div style="font-size:0.82rem;margin-top:4px;">No se encontraron registros para '${clean}'. Regístrelo primero en la sección de Conductores.</div>
            </div>
          </div>`;
      workflowDiv.style.display = 'none';
      currentDriver = null;
      return;
    }

    currentDriver = driver;
    const priv = PRIVILEGE_LEVELS[driver.privilegio_parqueo] || { label: '?', icon: '?' };
    const vipActive = isVipActive(driver);

    const [vehicleStatus, allLogs, banStatus] = await Promise.all([
      getDriverVehiclesStatus(driver),
      getLogsByDriver(driver.cedula),
      getDriverBanStatus(driver.cedula)
    ]);
    const recentLogs = allLogs.slice(0, 5);

    // Check if the user is completely blocked from entering due to a car inside
    let blockEntryReason = null;
    let allowedToEnterNext = true;

    // A regular lot means anything that is NOT the 15-minute temporary lot
    const isRegularLot = (lote) => lote && lote !== 'Lote Temporal (15 min)';

    const v1InsideRegular = vehicleStatus.placa_1.isParked && isRegularLot(vehicleStatus.placa_1.lastEntry?.lote);
    const v2InsideRegular = vehicleStatus.placa_2.isParked && isRegularLot(vehicleStatus.placa_2.lastEntry?.lote);
    const legacyInsideRegular = vehicleStatus.legacy.isParked && isRegularLot(vehicleStatus.legacy.lastEntry?.lote);

    if (v1InsideRegular || v2InsideRegular || legacyInsideRegular) {
      allowedToEnterNext = false;
      blockEntryReason = 'El conductor ya tiene un vehículo en un estacionamiento regular. Para ingresar otro, el primero debe salir o moverse al Lote Temporal (15 min).';
    }

    // Assign this state to the driver object so the entry form can make choices
    currentDriver._vehicleStatus = vehicleStatus;
    currentDriver._allowedToEnterNext = allowedToEnterNext;
    currentDriver._blockEntryReason = blockEntryReason;
    currentDriver._banStatus = banStatus;

    infoDiv.innerHTML = `
        <div class="driver-card-preview">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div class="driver-name">${driver.nombres} ${driver.apellidos}</div>
            <span class="badge ${driver.privilegio_parqueo === '2' ? (vipActive ? 'badge-gold' : 'badge-muted') : driver.privilegio_parqueo === '3' ? 'badge-cyan' : 'badge-blue'}">
              ${priv.icon} ${priv.label}
              ${driver.privilegio_parqueo === '2' && !vipActive ? ' (EXPIRADO)' : ''}
            </span>
          </div>
          <div class="driver-meta">
            <span>🪪 ${driver.cedula}</span>
            <span>${PERSON_TYPES[driver.tipo_persona]?.icon || ''} ${PERSON_TYPES[driver.tipo_persona]?.label || ''}</span>
            <span>${CARGOS[driver.cargo]?.icon || ''} ${CARGOS[driver.cargo]?.label || ''}</span>
            <span>${AREAS[driver.area]?.icon || ''} ${AREAS[driver.area]?.label || ''}</span>
            ${driver.placa_1 ? `<span class="${vehicleStatus.placa_1.isParked ? 'text-danger fw-bold' : ''}">🚗 ${driver.placa_1} ${vehicleStatus.placa_1.isParked ? `(Adentro: ${vehicleStatus.placa_1.lastEntry.lote})` : ''}</span>` : ''}
            ${driver.placa_2 ? `<span class="${vehicleStatus.placa_2.isParked ? 'text-danger fw-bold' : ''}">🚗 ${driver.placa_2} ${vehicleStatus.placa_2.isParked ? `(Adentro: ${vehicleStatus.placa_2.lastEntry.lote})` : ''}</span>` : ''}
          </div>
          ${banStatus.isBanned ? `
            <div class="alert alert-danger" style="margin-top:var(--sp-4);margin-bottom:0; background: #fee2e2; border: 2px solid #ef4444;">
              <span class="alert-icon">🚫</span>
              <div>
                <strong>USUARIO SUSPENDIDO POR INFRACCIÓN</strong>
                <p style="margin:4px 0 0 0; font-size: 0.85rem">Motivo: ${banStatus.lastReason}</p>
                <p style="margin:4px 0 0 0; font-size: 0.85rem">Liberación: ${banStatus.banExpiresAt.toLocaleString('es-EC')}</p>
              </div>
            </div>
          ` : !allowedToEnterNext ? `
            <div class="alert alert-danger" style="margin-top:var(--sp-4);margin-bottom:0;">
              <span class="alert-icon">⚠️</span>
              <div>
                <strong>Aviso:</strong> ${blockEntryReason}
              </div>
            </div>
          ` : ''}
        </div>

        ${recentLogs.length > 0 ? `
          <div style="margin-top:var(--sp-3);padding:var(--sp-4);background:var(--bg-elevated);border-radius:var(--radius-md);font-size:0.82rem;">
            <strong style="color:var(--text-muted);font-size:0.75rem;text-transform:uppercase;">Historial reciente:</strong>
            ${recentLogs.map(l => `
              <div style="margin-top:4px;color:var(--text-secondary);">
                ${l.tipo_movimiento === '1' ? '🔽' : '🔼'} ${new Date(l.fecha_hora).toLocaleString('es-EC')} — ${l.lote || ''} ${l.token_type === 'vip' ? '🌟' : l.token_type === 'disabled' ? '♿' : l.color_zona ? (ZONE_COLORS[l.color_zona]?.emoji || '') : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      `;

    // Show movement selection
    workflowDiv.style.display = 'block';
    selectedMovement = null;
    renderMovementSelector();

  } catch (err) {
    console.error('Lookup error:', err);
    infoDiv.innerHTML = `
      <div class="alert alert-danger">
        <span class="alert-icon">❌</span>
        <div><strong>Error:</strong> ${err.message}</div>
      </div>`;
  }
}

function renderMovementSelector() {
  const workflowDiv = document.getElementById('guard-workflow');
  workflowDiv.innerHTML = `
    <div class="card" style="margin-bottom:var(--sp-6);">
      <div class="card-header"><span class="card-title">📝 Tipo de Movimiento</span></div>
      <div class="movement-selector" style="display:flex; flex-wrap:wrap; gap: 8px;">
        <button class="movement-btn entry" id="mv-entry" style="flex:1;">
          <span class="movement-icon">🔽</span>
          ENTRADA
        </button>
        <button class="movement-btn exit" id="mv-exit" style="flex:1;">
          <span class="movement-icon">🔼</span>
          SALIDA
        </button>
        <button class="movement-btn" id="mv-infraction" style="flex:1; background: #fee2e2; color: #b91c1c; border-color: #f87171;">
          <span class="movement-icon">⚠️</span>
          INFRACCIÓN
        </button>
      </div>
      <div id="movement-form"></div>
    </div>
  `;

  document.getElementById('mv-entry').addEventListener('click', () => {
    selectedMovement = '1';
    document.querySelectorAll('.movement-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('mv-entry').classList.add('selected');
    renderEntryForm();
  });

  document.getElementById('mv-exit').addEventListener('click', () => {
    selectedMovement = '2';
    document.querySelectorAll('.movement-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('mv-exit').classList.add('selected');
    renderExitForm();
  });

  document.getElementById('mv-infraction').addEventListener('click', () => {
    selectedMovement = '3';
    document.querySelectorAll('.movement-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('mv-infraction').classList.add('selected');
    renderInfractionForm();
  });
}

function renderEntryForm() {
  const formDiv = document.getElementById('movement-form');
  const driver = currentDriver;
  const priv = driver.privilegio_parqueo;
  const vipActive = isVipActive(driver);

  // Check if blocked entirely
  const isTemporaryLot = getCurrentUser()?.assignedLot === 'Lote Temporal (15 min)';

  if (driver._banStatus?.isBanned) {
    formDiv.innerHTML = `
      <div class="alert alert-danger" style="background:#fee2e2; border:1px solid #ef4444; color:#b91c1c;">
        <span class="alert-icon">🚫</span>
        <div><strong>INGRESO BLOQUEADO:</strong> El usuario está cumpliendo suspensión disciplinaria hasta ${driver._banStatus.banExpiresAt.toLocaleString('es-EC')} por motivo de: '${driver._banStatus.lastReason}'. No puede ingresar.</div>
      </div>
    `;
    return;
  }

  // If not a temporary lot and they are blocked, prevent entry
  if (!isTemporaryLot && !driver._allowedToEnterNext) {
    formDiv.innerHTML = `
      <div class="alert alert-danger">
        <span class="alert-icon">❌</span>
        <div><strong>INGRESO BLOQUEADO:</strong> ${driver._blockEntryReason}</div>
      </div>
    `;
    return;
  }

  // Placa selection UI
  let placaSelectionHTML = '';
  if (driver.placa_1 || driver.placa_2) {
    const p1Parked = driver._vehicleStatus.placa_1.isParked;
    const p2Parked = driver._vehicleStatus.placa_2.isParked;

    placaSelectionHTML = `
      <div class="form-group">
        <label class="form-label">Vehículo que ingresa *</label>
        <div class="radio-group" style="flex-direction: column; gap: 8px;">
          ${driver.placa_1 ? `
            <div class="radio-card" style="width: 100%;">
              <input type="radio" name="entry-placa" id="p1" value="${driver.placa_1}" ${p1Parked ? 'disabled' : 'checked'} />
              <label for="p1" style="${p1Parked ? 'opacity: 0.5;' : ''}">🚗 Placa: ${driver.placa_1} ${p1Parked ? '(Ya está adentro)' : ''}</label>
            </div>
          ` : ''}
          ${driver.placa_2 ? `
            <div class="radio-card" style="width: 100%;">
              <input type="radio" name="entry-placa" id="p2" value="${driver.placa_2}" ${p2Parked ? 'disabled' : (!driver.placa_1 || p1Parked ? 'checked' : '')} />
              <label for="p2" style="${p2Parked ? 'opacity: 0.5;' : ''}">🚗 Placa: ${driver.placa_2} ${p2Parked ? '(Ya está adentro)' : ''}</label>
            </div>
          ` : ''}
        </div>
      </div>
      `;
  } else {
    placaSelectionHTML = `
      <div class="alert alert-warning" style="margin-bottom: var(--sp-4);">
        <span class="alert-icon">⚠️</span>
        <div>Este conductor no tiene placas registradas. El ingreso será bajo su cédula únicamente.</div>
      </div>`;
  }

  // Determine which flow to show
  let instructionHTML = '';
  let tokenFieldsHTML = '';

  if (driver._banStatus?.isBanned) {
    formDiv.innerHTML = `
      <div class="alert alert-danger">
        <span class="alert-icon">🚫</span>
        <div><strong>INGRESO BLOQUEADO:</strong> El usuario está cumpliendo suspensión disciplinaria. No puede ingresar.</div>
      </div>
    `;
    return;
  }

  if (priv === '2' && vipActive) {
    // VIP with active pass
    instructionHTML = `
      <div class="alert alert-vip">
        <span class="alert-icon">🌟</span>
        <div><strong>CONDUCTOR VIP:</strong> Entregar una <strong>cartilla dorada</strong>.</div>
      </div>`;
    tokenFieldsHTML = `
      <div class="form-group">
        <label class="form-label">Número de cartilla dorada asignada *</label>
        <input type="number" class="form-input" id="f-token-num" placeholder="Solo ingrese el número (Ej. 5)" min="1" />
      </div>`;
  } else if (priv === '3') {
    // Disability
    instructionHTML = `
      <div class="alert alert-disabled">
        <span class="alert-icon">♿</span>
        <div><strong>CONDUCTOR CON DISCAPACIDAD O EMBARAZO:</strong> Entregar una <strong>cartilla de discapacidad</strong> (espacios reservados).</div>
      </div>`;
    tokenFieldsHTML = `
      <div class="form-group">
        <label class="form-label">Número de cartilla de discapacidad asignado *</label>
        <input type="number" class="form-input" id="f-token-num" placeholder="Solo ingrese el número" min="1" />
      </div>`;
  } else if (priv === 'temp_45') {
    // Temp 45 min pass
    instructionHTML = `
       <div class="alert alert-vip" style="background:#f3e8ff; border-color:#8b5cf6; color:#5b21b6;">
         <span class="alert-icon">⏳</span>
         <div><strong>ACCESO TEMPORAL 45 MIN:</strong> Entregar pase temporal morado/especial.</div>
       </div>`;
    tokenFieldsHTML = `
       <div class="form-group">
         <label class="form-label">Número de pase temporal asignado *</label>
         <input type="number" class="form-input" id="f-token-num" placeholder="Solo ingrese el número" min="1" />
       </div>`;
  } else {
    // Standard (or expired VIP)
    instructionHTML = `
      <div class="alert alert-standard">
        <span class="alert-icon">🚗</span>
        <div><strong>CONDUCTOR ESTÁNDAR:</strong> Seleccione el color de la zona y entregue la cartilla.</div>
      </div>
      ${priv === '2' && !vipActive ? `
        <div class="alert alert-danger">
          <span class="alert-icon">⏰</span>
          <div>El pase VIP ha <strong>expirado</strong>. Se tratará como conductor estándar.</div>
        </div>
      ` : ''}`;
    tokenFieldsHTML = `
      <div class="form-group">
        <label class="form-label">Color de Zona Asignada *</label>
        <div class="radio-group">
          ${Object.entries(ZONE_COLORS).map(([k, z]) => `
            <div class="radio-card">
              <input type="radio" name="zone-color" id="zone-${k}" value="${k}" />
              <label for="zone-${k}" style="border-color:${z.hex}30;">
                <span class="radio-emoji">${z.emoji}</span>
                <span class="radio-text">${z.label}</span>
              </label>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Número de cartilla de color asignado *</label>
        <input type="number" class="form-input" id="f-token-num" placeholder="Solo ingrese el número (Ej. 14)" min="1" />
      </div>`;
  }

  // Custom institutional fields
  let institutionalHTML = '';
  if (driver.tipo_persona === '2') {
    institutionalHTML = `
        <div class="card" style="background:var(--bg-elevated); margin:var(--sp-4) 0; border: 1px solid var(--border-color);">
            <div style="font-weight:600; margin-bottom:var(--sp-2);">🏛️ Registro Vehículo Institucional</div>
            <div class="form-group">
              <label class="form-label">Nombre del conductor *</label>
              <input type="text" class="form-input" id="f-institucional-driver" placeholder="Nombre completo" />
            </div>
            <div class="form-group">
              <label class="form-label">Kilometraje actual (Km) *</label>
              <input type="number" class="form-input" id="f-institucional-km" placeholder="Ej. 125000" min="0" step="0.1" />
            </div>
        </div>
      `;
  }

  formDiv.innerHTML = `
    ${placaSelectionHTML}
    ${instructionHTML}
    ${institutionalHTML}
    ${tokenFieldsHTML}
    <button class="btn btn-success btn-lg btn-block" id="submit-entry" style="margin-top:var(--sp-4);">
      ✅ Registrar Entrada
    </button>
  `;

  document.getElementById('submit-entry').addEventListener('click', submitEntry);
}

async function submitEntry() {
  const driver = currentDriver;
  const priv = driver.privilegio_parqueo;
  const vipActive = isVipActive(driver);
  const tokenNum = document.getElementById('f-token-num')?.value;
  const user = getCurrentUser();
  const assignedLot = user?.assignedLot || 'N/A';

  // Get selected placa
  const placaInput = document.querySelector('input[name="entry-placa"]:checked');
  const selectedPlaca = placaInput ? placaInput.value : null;

  if (currentDriver.placa_1 || currentDriver.placa_2) {
    if (!selectedPlaca) {
      showToast('Seleccione qué vehículo va a ingresar', 'error');
      return;
    }
  }

  if (!tokenNum) {
    showToast('Ingrese el número de cartilla', 'error');
    return;
  }

  let kilometraje = null;
  let conductorInterno = null;
  if (driver.tipo_persona === '2') {
    conductorInterno = document.getElementById('f-institucional-driver')?.value;
    kilometraje = document.getElementById('f-institucional-km')?.value;

    if (!conductorInterno || !kilometraje) {
      showToast('Debe ingresar el conductor y kilometraje institucional', 'error');
      return;
    }
  }

  const entry = {
    cedula: driver.cedula,
    tipo_movimiento: '1',
    lote: assignedLot,
    token_number: parseInt(tokenNum),
    placa: selectedPlaca || null,
    kilometraje: kilometraje ? parseFloat(kilometraje) : null,
    conductor_institucional: conductorInterno || null
  };

  if (priv === '2' && vipActive) {
    entry.token_type = 'vip';
  } else if (priv === '3') {
    entry.token_type = 'disabled';
  } else if (priv === 'temp_45') {
    entry.token_type = 'temp_45';
  } else {
    const zone = document.querySelector('input[name="zone-color"]:checked')?.value;
    if (!zone) {
      showToast('Seleccione el color de zona', 'error');
      return;
    }
    entry.token_type = 'standard';
    entry.color_zona = zone;
  }

  try {
    await addLogEntry(entry);
    showToast(`✅ Entrada registrada — ${driver.nombres} ${driver.apellidos}`, 'success');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
    return;
  }

  // Reset
  document.getElementById('guard-cedula').value = '';
  document.getElementById('guard-driver-info').innerHTML = '';
  document.getElementById('guard-workflow').style.display = 'none';
  currentDriver = null;
  selectedMovement = null;
  document.getElementById('guard-cedula').focus();
}

function renderExitForm() {
  const formDiv = document.getElementById('movement-form');
  const driver = currentDriver;

  // Check if blocked entirely
  const isTemporaryLot = getCurrentUser()?.assignedLot === 'Lote Temporal (15 min)';

  // Add infraction checks to exit as well, mostly just to warn them.
  let banWarning = '';
  if (driver._banStatus?.isBanned) {
    banWarning = `
      <div class="alert alert-danger" style="margin-bottom: 1rem;">
        <span class="alert-icon">🚫</span>
        <div><strong>ATENCIÓN:</strong> El vehículo está saliendo, pero recuerde al usuario que está suspendido y no podrá reingresar hasta ${driver._banStatus.banExpiresAt.toLocaleString('es-EC')}.</div>
      </div>`;
  }

  // Placa selection UI for exit
  let placaSelectionHTML = '';
  if (driver.placa_1 || driver.placa_2) {
    const p1Parked = driver._vehicleStatus?.placa_1?.isParked;
    const p2Parked = driver._vehicleStatus?.placa_2?.isParked;

    placaSelectionHTML = `
      <div class="form-group" style="margin-bottom: var(--sp-4);">
        <label class="form-label">Vehículo que sale *</label>
        <div class="radio-group" style="flex-direction: column; gap: 8px;">
          ${driver.placa_1 && p1Parked ? `
            <div class="radio-card" style="width: 100%;">
              <input type="radio" name="exit-placa" id="exit-p1" value="${driver.placa_1}" checked />
              <label for="exit-p1">🚗 Placa: ${driver.placa_1} (Lote: ${driver._vehicleStatus.placa_1.lastEntry.lote})</label>
            </div>
          ` : ''}
          ${driver.placa_2 && p2Parked ? `
            <div class="radio-card" style="width: 100%;">
              <input type="radio" name="exit-placa" id="exit-p2" value="${driver.placa_2}" ${!p1Parked ? 'checked' : ''} />
              <label for="exit-p2">🚗 Placa: ${driver.placa_2} (Lote: ${driver._vehicleStatus.placa_2.lastEntry.lote})</label>
            </div>
          ` : ''}
          
          ${(!p1Parked && !p2Parked) ? `
             <div class="alert alert-warning" style="width: 100%;">
                <span class="alert-icon">ℹ️</span>
                <div>No hay vehículos registrados de este conductor estacionados usando placa.</div>
             </div>
          ` : ''}
        </div>
      </div>
      `;
  }

  // Custom institutional fields
  let institutionalHTML = '';
  if (driver.tipo_persona === '2') {
    institutionalHTML = `
        <div class="card" style="background:var(--bg-elevated); margin:var(--sp-4) 0; border: 1px solid var(--border-color);">
            <div style="font-weight:600; margin-bottom:var(--sp-2);">🏛️ Registro de Salida Institucional</div>
            <div class="form-group">
              <label class="form-label">Nombre del conductor *</label>
              <input type="text" class="form-input" id="f-institucional-driver" placeholder="Nombre completo" />
            </div>
            <div class="form-group">
              <label class="form-label">Kilometraje actual (Km) *</label>
              <input type="number" class="form-input" id="f-institucional-km" placeholder="Ej. 125000" min="0" step="0.1" />
            </div>
        </div>
      `;
  }

  formDiv.innerHTML = `
    ${banWarning}
    ${placaSelectionHTML}
    ${institutionalHTML}
    <div class="form-group">
      <label class="form-label">Color de cartilla devuelto *</label>
      <div class="radio-group">
        ${Object.entries(RETURN_COLORS).map(([k, c]) => `
          <div class="radio-card">
            <input type="radio" name="return-color" id="ret-${k}" value="${k}" />
            <label for="ret-${k}">
              <span class="radio-emoji">${c.emoji}</span>
              <span class="radio-text">${c.label}</span>
            </label>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Número de cartilla devuelto *</label>
      <input type="number" class="form-input" id="f-return-token" placeholder="Solo ingrese el número (Ej. 14)" min="1" />
    </div>
    <button class="btn btn-danger btn-lg btn-block" id="submit-exit" style="margin-top:var(--sp-4);">
      ✅ Registrar Salida
    </button>
  `;

  document.getElementById('submit-exit').addEventListener('click', submitExit);
}

async function submitExit() {
  const returnColor = document.querySelector('input[name="return-color"]:checked')?.value;
  const returnToken = document.getElementById('f-return-token')?.value;
  const user = getCurrentUser();
  const assignedLot = user?.assignedLot || 'N/A';

  // Get selected placa
  const placaInput = document.querySelector('input[name="exit-placa"]:checked');
  const selectedPlaca = placaInput ? placaInput.value : null;

  if (!returnColor || !returnToken) {
    showToast('Complete la información de la cartilla devuelta', 'error');
    return;
  }

  let kilometraje = null;
  let conductorInterno = null;
  if (currentDriver.tipo_persona === '2') {
    conductorInterno = document.getElementById('f-institucional-driver')?.value;
    kilometraje = document.getElementById('f-institucional-km')?.value;

    if (!conductorInterno || !kilometraje) {
      showToast('Debe ingresar el conductor y kilometraje institucional', 'error');
      return;
    }
  }

  const entry = {
    cedula: currentDriver.cedula,
    tipo_movimiento: '2',
    lote: assignedLot,
    return_color: returnColor,
    token_number: parseInt(returnToken),
    placa: selectedPlaca || null,
    kilometraje: kilometraje ? parseFloat(kilometraje) : null,
    conductor_institucional: conductorInterno || null
  };

  try {
    await addLogEntry(entry);
    showToast(`🔼 Salida registrada — ${currentDriver.nombres} ${currentDriver.apellidos}`, 'success');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
    return;
  }

  // Reset
  document.getElementById('guard-cedula').value = '';
  document.getElementById('guard-driver-info').innerHTML = '';
  document.getElementById('guard-workflow').style.display = 'none';
  currentDriver = null;
  selectedMovement = null;
  document.getElementById('guard-cedula').focus();
}


function renderInfractionForm() {
  const formDiv = document.getElementById('movement-form');

  formDiv.innerHTML = `
    <div class="alert alert-warning" style="margin-bottom: var(--sp-4);">
      <span class="alert-icon">⚠️</span>
      <div>
        <strong>Reporte de Infracción</strong><br/>
        Al registrar una infracción, se suspenderá automáticamente el acceso a espacios regulares para este usuario durante <strong>3 días</strong> (72 horas).
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Motivo de Infracción *</label>
      <select class="form-input" id="f-infraction-reason">
        <option value="">-- Seleccione un motivo --</option>
        <option value="Uso de múltiples espacios asignados">Uso de múltiples espacios (mal estacionado)</option>
        <option value="Estacionado en zona no asignada o reservada">Estacionado en zona no asignada/reservada</option>
        <option value="Suplantación de usuario o placa">Suplantación de identidad o vehículo</option>
        <option value="Daños a la propiedad / Irrespeto al personal">Daños a la propiedad / Irrespeto al personal</option>
        <option value="Otra (especificar en foto)">Otra falta grave</option>
      </select>
    </div>
    
    <div class="form-group">
      <label class="form-label">Fotografía de Evidencia</label>
      <input type="file" id="f-infraction-photo" class="form-input" accept="image/*" capture="environment" style="padding: 0.5rem;" />
      <small style="color: var(--text-muted);">Use la cámara para tomar una foto de la infracción.</small>
    </div>
    
    <button class="btn btn-danger btn-lg btn-block" id="submit-infraction" style="margin-top:var(--sp-4);">
      🚨 Registrar Infracción y Bloquear
    </button>
  `;

  document.getElementById('submit-infraction').addEventListener('click', submitInfraction);
}

async function submitInfraction() {
  const reason = document.getElementById('f-infraction-reason')?.value;
  const photoInput = document.getElementById('f-infraction-photo');
  const user = getCurrentUser();

  if (!reason) {
    showToast('Seleccione el motivo de la infracción.', 'error');
    return;
  }

  const submitBtn = document.getElementById('submit-infraction');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Registrando...';

  try {
    let fotoData = null;

    // Read file if provided
    if (photoInput.files && photoInput.files[0]) {
      // Convert to bas64 using FileReader
      fotoData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Error leyendo archivo'));
        reader.readAsDataURL(photoInput.files[0]);
      });
    }

    const payload = {
      cedula: currentDriver.cedula,
      motivo: reason,
      foto_data: fotoData,
      reporter_id: user?.id || 'Unknown Guard'
    };

    await addInfraction(payload);
    showToast(`Infracción registrada con éxito. Usuario bloqueado por 3 días.`, 'success');

    // Reset Everything
    document.getElementById('guard-cedula').value = '';
    document.getElementById('guard-driver-info').innerHTML = '';
    document.getElementById('guard-workflow').style.display = 'none';
    currentDriver = null;
    selectedMovement = null;
    document.getElementById('guard-cedula').focus();

  } catch (error) {
    console.error("Error setting infraction", error);
    showToast(`Error al registrar infracción: ${error.message}`, 'error');
    submitBtn.disabled = false;
    submitBtn.innerText = '🚨 Registrar Infracción y Bloquear';
  }
}
