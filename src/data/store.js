// ─── Data Store ─────────────────────────────────────────────────────────────
// Dual-mode: Supabase when configured, localStorage as fallback.
// All public functions are async to support both modes transparently.

import { supabase, isSupabaseReady } from './supabaseClient.js';

// ═══════════════════════════════════════════════════════════════════════════
// LocalStorage helpers (fallback mode)
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
    DRIVERS: 'parqueadero_drivers',
    LOG: 'parqueadero_log',
    INFRACTIONS: 'parqueadero_infractions',
    COUNTER: 'parqueadero_id_counter',
};

function getJSON(key, fallback = []) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function setJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function nextLocalId() {
    const current = parseInt(localStorage.getItem(STORAGE_KEYS.COUNTER) || '0', 10);
    const next = current + 1;
    localStorage.setItem(STORAGE_KEYS.COUNTER, String(next));
    return next;
}

// ═══════════════════════════════════════════════════════════════════════════
// Driver CRUD
// ═══════════════════════════════════════════════════════════════════════════

export async function getAllDrivers() {
    if (isSupabaseReady()) {
        const { data, error } = await supabase
            .from('drivers')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }
    return getJSON(STORAGE_KEYS.DRIVERS);
}

export async function getDriverById(id) {
    if (isSupabaseReady()) {
        const { data, error } = await supabase
            .from('drivers')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
    }
    return getJSON(STORAGE_KEYS.DRIVERS).find(d => d.id === id) || null;
}

export async function getDriverByCedula(cedula) {
    const clean = String(cedula).trim();
    if (isSupabaseReady()) {
        const { data, error } = await supabase
            .from('drivers')
            .select('*')
            .eq('cedula', clean)
            .maybeSingle();
        if (error) throw error;
        return data || null;
    }
    return getJSON(STORAGE_KEYS.DRIVERS).find(d => String(d.cedula).trim() === clean) || null;
}

export async function searchDrivers(query) {
    const q = query.toLowerCase().trim();
    if (!q) return getAllDrivers();

    if (isSupabaseReady()) {
        const { data, error } = await supabase
            .from('drivers')
            .select('*')
            .or(`cedula.ilike.%${q}%,nombres.ilike.%${q}%,apellidos.ilike.%${q}%,placa_1.ilike.%${q}%,placa_2.ilike.%${q}%`);
        if (error) throw error;
        return data;
    }

    return getJSON(STORAGE_KEYS.DRIVERS).filter(d =>
        String(d.cedula).includes(q) ||
        `${d.nombres} ${d.apellidos}`.toLowerCase().includes(q) ||
        (d.placa_1 && d.placa_1.toLowerCase().includes(q)) ||
        (d.placa_2 && d.placa_2.toLowerCase().includes(q))
    );
}

export async function saveDriver(driver) {
    if (isSupabaseReady()) {
        if (driver.id) {
            // Update
            const { data, error } = await supabase
                .from('drivers')
                .update({
                    ...driver,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', driver.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            // Create — let Supabase auto-generate id
            const { id, ...driverData } = driver;
            const { data, error } = await supabase
                .from('drivers')
                .insert(driverData)
                .select()
                .single();
            if (error) {
                if (error.code === '23505') {
                    throw new Error(`Ya existe un conductor con cédula ${driver.cedula}`);
                }
                throw error;
            }
            return data;
        }
    }

    // localStorage fallback
    const drivers = getJSON(STORAGE_KEYS.DRIVERS);
    if (driver.id) {
        const idx = drivers.findIndex(d => d.id === driver.id);
        if (idx >= 0) {
            drivers[idx] = { ...drivers[idx], ...driver, updated_at: new Date().toISOString() };
        }
    } else {
        const existing = drivers.find(d => String(d.cedula).trim() === String(driver.cedula).trim());
        if (existing) throw new Error(`Ya existe un conductor con cédula ${driver.cedula}`);
        driver.id = nextLocalId();
        driver.created_at = new Date().toISOString();
        driver.updated_at = driver.created_at;
        drivers.push(driver);
    }
    setJSON(STORAGE_KEYS.DRIVERS, drivers);
    return driver;
}

export async function deleteDriver(id) {
    if (isSupabaseReady()) {
        const { error } = await supabase
            .from('drivers')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return;
    }
    const drivers = getJSON(STORAGE_KEYS.DRIVERS).filter(d => d.id !== id);
    setJSON(STORAGE_KEYS.DRIVERS, drivers);
}

// ═══════════════════════════════════════════════════════════════════════════
// Parking Log CRUD
// ═══════════════════════════════════════════════════════════════════════════

export async function getAllLogs() {
    if (isSupabaseReady()) {
        const { data, error } = await supabase
            .from('parking_logs')
            .select('*')
            .order('fecha_hora', { ascending: false });
        if (error) throw error;
        return data;
    }
    return getJSON(STORAGE_KEYS.LOG);
}

export async function getLogsByDriver(cedula) {
    if (isSupabaseReady()) {
        const { data, error } = await supabase
            .from('parking_logs')
            .select('*')
            .eq('cedula', String(cedula))
            .order('fecha_hora', { ascending: false });
        if (error) throw error;
        return data;
    }
    return getJSON(STORAGE_KEYS.LOG)
        .filter(l => String(l.cedula) === String(cedula))
        .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
}

export async function getLastMovement(cedula) {
    if (isSupabaseReady()) {
        const { data, error } = await supabase
            .from('parking_logs')
            .select('*')
            .eq('cedula', String(cedula))
            .order('fecha_hora', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        return data || null;
    }
    const logs = getJSON(STORAGE_KEYS.LOG)
        .filter(l => String(l.cedula) === String(cedula))
        .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
    return logs.length > 0 ? logs[0] : null;
}

export async function isDriverParked(cedula) {
    const last = await getLastMovement(cedula);
    return last && last.tipo_movimiento === '1';
}

export async function addLogEntry(entry) {
    if (isSupabaseReady()) {
        const logData = {
            cedula: entry.cedula,
            tipo_movimiento: entry.tipo_movimiento,
            lote: entry.lote,
            token_type: entry.token_type || 'standard',
            color_zona: entry.color_zona || null,
            token_number: entry.token_number || null,
            placa: entry.placa || null,
            kilometraje: entry.kilometraje || null,
            conductor_institucional: entry.conductor_institucional || null,
            fecha_hora: entry.fecha_hora || new Date().toISOString(),
        };
        const { data, error } = await supabase
            .from('parking_logs')
            .insert(logData)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // localStorage fallback
    const logs = getJSON(STORAGE_KEYS.LOG);
    entry.log_id = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    entry.fecha_hora = entry.fecha_hora || new Date().toISOString();
    logs.push(entry);
    setJSON(STORAGE_KEYS.LOG, logs);
    return entry;
}

// ═══════════════════════════════════════════════════════════════════════════
// Infractions CRUD
// ═══════════════════════════════════════════════════════════════════════════

export async function addInfraction(data) {
    if (isSupabaseReady()) {
        const { data: result, error } = await supabase
            .from('infractions')
            .insert(data)
            .select()
            .single();
        if (error) throw error;
        return result;
    }

    // Local Storage
    const infractions = getJSON(STORAGE_KEYS.INFRACTIONS);
    const entry = {
        ...data,
        id: nextLocalId(),
        fecha_hora: data.fecha_hora || new Date().toISOString()
    };
    infractions.push(entry);
    setJSON(STORAGE_KEYS.INFRACTIONS, infractions);
    return entry;
}

export async function getRecentInfractionsByCedula(cedula) {
    if (isSupabaseReady()) {
        const { data, error } = await supabase
            .from('infractions')
            .select('*')
            .eq('cedula', String(cedula))
            .order('fecha_hora', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    return getJSON(STORAGE_KEYS.INFRACTIONS)
        .filter(i => String(i.cedula) === String(cedula))
        .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
}

// Calculate if the user has been banned for 3 days
export async function getDriverBanStatus(cedula) {
    const infractions = await getRecentInfractionsByCedula(cedula);
    if (infractions.length === 0) return { isBanned: false, banExpiresAt: null };

    const lastInfraction = new Date(infractions[0].fecha_hora);
    const banDurationMs = 3 * 24 * 60 * 60 * 1000; // 3 days
    const banExpiresAt = new Date(lastInfraction.getTime() + banDurationMs);

    return {
        isBanned: Date.now() < banExpiresAt.getTime(),
        banExpiresAt: banExpiresAt,
        lastReason: infractions[0].motivo
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard Queries
// ═══════════════════════════════════════════════════════════════════════════

export async function getActiveVehicles() {
    const drivers = await getAllDrivers();
    const active = [];
    for (const driver of drivers) {
        const statuses = await getDriverVehiclesStatus(driver);
        // Add placa_1 if parked
        if (statuses.placa_1 && statuses.placa_1.isParked) {
            active.push({ driver, entry: statuses.placa_1.lastEntry, activePlaca: driver.placa_1 || 'N/A' });
        }
        // Add placa_2 if parked
        if (statuses.placa_2 && statuses.placa_2.isParked) {
            active.push({ driver, entry: statuses.placa_2.lastEntry, activePlaca: driver.placa_2 });
        }
        // Fallback for older legacy logs without placa
        if (statuses.legacy && statuses.legacy.isParked) {
            active.push({ driver, entry: statuses.legacy.lastEntry, activePlaca: 'Sin Placa Registrada' });
        }
    }
    return active;
}

export async function getDriverVehiclesStatus(driver) {
    const logs = await getLogsByDriver(driver.cedula);

    // Sort logs oldest to newest to replay state
    const sortedLogs = [...logs].reverse();

    const state = {
        placa_1: { isParked: false, lastEntry: null },
        placa_2: { isParked: false, lastEntry: null },
        legacy: { isParked: false, lastEntry: null } // Logs with no placa
    };

    for (const log of sortedLogs) {
        const isEntry = log.tipo_movimiento === '1';

        if (log.placa && log.placa === driver.placa_1) {
            state.placa_1.isParked = isEntry;
            state.placa_1.lastEntry = isEntry ? log : null;
        } else if (log.placa && log.placa === driver.placa_2) {
            state.placa_2.isParked = isEntry;
            state.placa_2.lastEntry = isEntry ? log : null;
        } else if (!log.placa) {
            // Legacy assumption
            state.legacy.isParked = isEntry;
            state.legacy.lastEntry = isEntry ? log : null;
        }
    }

    return state;
}

export async function getOccupancyByLot(lot) {
    const active = await getActiveVehicles();
    return active.filter(a => a.entry.lote === lot).length;
}

export async function getOccupancyByZone() {
    const active = await getActiveVehicles();
    const zones = { 1: 0, 2: 0, 3: 0, 4: 0, vip: 0, disabled: 0 };
    for (const { entry } of active) {
        if (entry.token_type === 'vip') zones.vip++;
        else if (entry.token_type === 'disabled') zones.disabled++;
        else if (entry.color_zona) zones[entry.color_zona] = (zones[entry.color_zona] || 0) + 1;
    }
    return zones;
}

export async function getTodayStats() {
    const today = new Date().toISOString().split('T')[0];

    if (isSupabaseReady()) {
        const { data: todayLogs, error } = await supabase
            .from('parking_logs')
            .select('*')
            .gte('fecha_hora', today + 'T00:00:00')
            .lte('fecha_hora', today + 'T23:59:59');
        if (error) throw error;

        const entries = todayLogs.filter(l => l.tipo_movimiento === '1').length;
        const exits = todayLogs.filter(l => l.tipo_movimiento === '2').length;
        const active = await getActiveVehicles();
        return { entries, exits, currentlyParked: active.length, totalLogs: todayLogs.length };
    }

    const logs = getJSON(STORAGE_KEYS.LOG).filter(l => l.fecha_hora.startsWith(today));
    const entries = logs.filter(l => l.tipo_movimiento === '1').length;
    const exits = logs.filter(l => l.tipo_movimiento === '2').length;
    const active = await getActiveVehicles();
    return { entries, exits, currentlyParked: active.length, totalLogs: logs.length };
}

export async function getRecentActivity(limit = 15) {
    if (isSupabaseReady()) {
        const { data, error } = await supabase
            .from('parking_logs')
            .select('*')
            .order('fecha_hora', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    }
    return getJSON(STORAGE_KEYS.LOG)
        .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora))
        .slice(0, limit);
}

// ═══════════════════════════════════════════════════════════════════════════
// VIP Utils
// ═══════════════════════════════════════════════════════════════════════════

export function isVipActive(driver) {
    if (String(driver.privilegio_parqueo) !== '2') return false;
    if (!driver.fecha_expiracion_vip) return false;
    const expDate = new Date(driver.fecha_expiracion_vip);
    return expDate >= new Date(new Date().toISOString().split('T')[0]);
}

export function calculateVipExpiration(startDate, durationDays) {
    const start = new Date(startDate);
    start.setDate(start.getDate() + parseInt(durationDays, 10));
    return start.toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// Realtime Subscriptions (Supabase only)
// ═══════════════════════════════════════════════════════════════════════════

let _realtimeChannel = null;

export function subscribeToChanges(callback) {
    if (!isSupabaseReady()) return null;

    // Clean up previous subscription
    if (_realtimeChannel) {
        supabase.removeChannel(_realtimeChannel);
    }

    _realtimeChannel = supabase
        .channel('parqueadero-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_logs' }, (payload) => {
            callback('parking_logs', payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, (payload) => {
            callback('drivers', payload);
        })
        .subscribe();

    return _realtimeChannel;
}

export function unsubscribeFromChanges() {
    if (_realtimeChannel && isSupabaseReady()) {
        supabase.removeChannel(_realtimeChannel);
        _realtimeChannel = null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Seed Data
// ═══════════════════════════════════════════════════════════════════════════

export async function seedDemoData() {
    const existing = await getAllDrivers();
    if (existing.length > 0) return; // Already seeded

    const drivers = [
        { cedula: '1712345678', nombres: 'Carlos', apellidos: 'Mendoza Ruiz', tipo_persona: '1', cargo: '1', area: '1', privilegio_parqueo: '2', fecha_inicio_vip: '2026-02-01', duracion_vip: 90, fecha_expiracion_vip: '2026-05-02', placa_1: 'PAB-1234', placa_2: '' },
        { cedula: '1798765432', nombres: 'María', apellidos: 'Torres Lara', tipo_persona: '1', cargo: '2', area: '2', privilegio_parqueo: '1', placa_1: 'PCX-5678', placa_2: 'PBR-9012' },
        { cedula: '1756781234', nombres: 'José', apellidos: 'García Ponce', tipo_persona: '2', cargo: '3', area: '4', privilegio_parqueo: '3', placa_1: 'PDE-3456', placa_2: '' },
        { cedula: '1734567890', nombres: 'Ana', apellidos: 'Sánchez Villa', tipo_persona: '1', cargo: '1', area: '3', privilegio_parqueo: '1', placa_1: 'QAB-7890', placa_2: '' },
        { cedula: '1723456789', nombres: 'Luis', apellidos: 'Herrera Moya', tipo_persona: '3', cargo: '4', area: '4', privilegio_parqueo: '1', placa_1: 'PAC-2345', placa_2: '' },
    ];

    for (const d of drivers) {
        try { await saveDriver(d); } catch { /* ignore duplicates */ }
    }

    // Seed some log entries
    const now = new Date();
    const entries = [
        { cedula: '1712345678', tipo_movimiento: '1', lote: 'Lote A - Adoquín', token_type: 'vip', token_number: 3, fecha_hora: new Date(now - 3600000 * 2).toISOString() },
        { cedula: '1798765432', tipo_movimiento: '1', lote: 'Lote B - Subsuelo', token_type: 'standard', color_zona: '2', token_number: 14, fecha_hora: new Date(now - 3600000).toISOString() },
        { cedula: '1756781234', tipo_movimiento: '1', lote: 'Lote C - Consulta Externa', token_type: 'disabled', token_number: 1, fecha_hora: new Date(now - 1800000).toISOString() },
    ];

    for (const e of entries) {
        try { await addLogEntry(e); } catch { /* ignore */ }
    }
}
