// ─── Domain Constants (extracted from REDCap XML) ───────────────────────────

export const PERSON_TYPES = {
  1: { label: 'Funcionario', icon: '👔' },
  2: { label: 'Institucional', icon: '🏛️' },
  3: { label: 'Invitado', icon: '🎫' },
  4: { label: 'Público', icon: '👥' },
};

export const CARGOS = {
  1: { label: 'Médico', icon: '🩺' },
  2: { label: 'Enfermería', icon: '💉' },
  3: { label: 'Administrativo', icon: '📋' },
  4: { label: 'Otro', icon: '🔧' },
};

export const AREAS = {
  1: { label: 'Emergencia', icon: '🚑' },
  2: { label: 'UCI', icon: '🏥' },
  3: { label: 'Pediatría', icon: '👶' },
  4: { label: 'General', icon: '🏢' },
};

export const PRIVILEGE_LEVELS = {
  1: { label: 'Estándar', icon: '🚗', color: '#64748b', cssClass: 'standard' },
  2: { label: 'VIP / Golden Box', icon: '🌟', color: '#f59e0b', cssClass: 'vip' },
  3: { label: 'Discapacitado', icon: '♿', color: '#06b6d4', cssClass: 'disabled' },
  'temp_45': { label: 'Acceso Temporal 45 min', icon: '⏳', color: '#8b5cf6', cssClass: 'temp' },
};

export const VIP_DURATIONS = {
  30: '30 días',
  60: '60 días',
  90: '90 días',
};

export const ZONE_COLORS = {
  1: { label: 'Zona Morada', emoji: '🟪', hex: '#9333ea', cssVar: '--zone-purple' },
  2: { label: 'Zona Azul', emoji: '🟦', hex: '#2563eb', cssVar: '--zone-blue' },
  3: { label: 'Zona Verde', emoji: '🟩', hex: '#16a34a', cssVar: '--zone-green' },
  4: { label: 'Zona Naranja', emoji: '🟧', hex: '#ea580c', cssVar: '--zone-orange' },
};

export const RETURN_COLORS = {
  0: { label: 'Dorado (VIP)', emoji: '🌟', hex: '#f59e0b' },
  1: { label: 'Morado', emoji: '🟪', hex: '#9333ea' },
  2: { label: 'Azul', emoji: '🟦', hex: '#2563eb' },
  3: { label: 'Verde', emoji: '🟩', hex: '#16a34a' },
  4: { label: 'Naranja', emoji: '🟧', hex: '#ea580c' },
  5: { label: 'Discapacidad', emoji: '♿', hex: '#06b6d4' },
};

export const MOVEMENT_TYPES = {
  1: { label: 'Entrada', icon: '🔽', color: '#22c55e' },
  2: { label: 'Salida', icon: '🔼', color: '#ef4444' },
};

export const PARKING_LOTS = ['Lote A - Adoquin', 'Lote B - Subsuelo', 'Lote C - Consulta externa', 'Lote Temporal (15 min)'];

export const LOT_CAPACITY = {
  'Lote A - Adoquin': { total: 80, vip: 10, disabled: 5 },
  'Lote B - Subsuelo': { total: 60, vip: 5, disabled: 3 },
  'Lote C - Consulta externa': { total: 40, vip: 3, disabled: 2 },
  'Lote Temporal (15 min)': { total: 20, vip: 0, disabled: 0 },
};
