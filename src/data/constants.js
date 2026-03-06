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
  2: { label: 'VIP', icon: '🌟', color: '#f59e0b', cssClass: 'vip' },
  3: { label: 'Discapacitado', icon: '♿', color: '#06b6d4', cssClass: 'disabled' },
  'temp_45': { label: 'Acceso temporal 45 min', icon: '⏳', color: '#8b5cf6', cssClass: 'temp' },
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

export const PARKING_LOTS = ['Lote A - Adoquín', 'Lote B - Subsuelo', 'Lote C - Consulta Externa', 'Lote Temporal (15 min)'];

export const LOT_CAPACITY = {
  'Lote A - Adoquín': { total: 80, vip: 10, disabled: 5 },
  'Lote B - Subsuelo': { total: 60, vip: 5, disabled: 3 },
  'Lote C - Consulta Externa': { total: 40, vip: 3, disabled: 2 },
  'Lote Temporal (15 min)': { total: 20, vip: 0, disabled: 0 },
};

export const PARKING_POLYGONS = [
  {
    id: "Parqueadero Adoquín",
    name: "Parqueadero Adoquín",
    coordinates: [[-0.12872, -78.497605], [-0.1287373, -78.4976738], [-0.128768, -78.49774], [-0.128796, -78.497883], [-0.128502, -78.497981], [-0.128415, -78.497996], [-0.128326, -78.49792], [-0.128156, -78.497966], [-0.127965, -78.498014], [-0.127973, -78.498096], [-0.128067, -78.498088], [-0.12807, -78.498019], [-0.128169, -78.498012], [-0.128178, -78.498076], [-0.128518, -78.498045], [-0.128791, -78.498004], [-0.1287995, -78.4979139], [-0.1288106, -78.4979016], [-0.1288464, -78.4977696], [-0.1288603, -78.4976498], [-0.1288421, -78.4974013], [-0.1288566, -78.4972771], [-0.1288883, -78.49727], [-0.1289062, -78.4971379], [-0.1288882, -78.4970078], [-0.1288389, -78.4970131], [-0.128826, -78.4969218], [-0.1288593, -78.4969081], [-0.128848, -78.496575], [-0.128189, -78.496605], [-0.128186, -78.496643], [-0.128102, -78.496643], [-0.128142, -78.496807], [-0.128265, -78.496779], [-0.128299, -78.496824], [-0.128488, -78.496771], [-0.1285344, -78.4969098], [-0.1285164, -78.4969379], [-0.128477, -78.496946], [-0.128501, -78.497046], [-0.128531, -78.49706], [-0.1285504, -78.4971007], [-0.128553, -78.497139], [-0.128549, -78.49716], [-0.128505, -78.497228], [-0.128322, -78.497288], [-0.128251, -78.497306], [-0.128366, -78.497697], [-0.128563, -78.497649], [-0.12872, -78.497605]]
  },
  {
    id: "Parqueadero Consulta Externa",
    name: "Parqueadero Consulta Externa",
    coordinates: [[-0.127451, -78.498134], [-0.127449, -78.497988], [-0.127706, -78.497901], [-0.127946, -78.497835], [-0.127917, -78.497752], [-0.12777, -78.497792], [-0.127701, -78.497805], [-0.127629, -78.497815], [-0.127619, -78.497799], [-0.127584, -78.497698], [-0.127551, -78.497705], [-0.127543, -78.497682], [-0.127535, -78.497661], [-0.127313, -78.497715], [-0.127327, -78.497774], [-0.12728, -78.497801], [-0.127288, -78.497853], [-0.127327, -78.497979], [-0.127302, -78.497979], [-0.127308, -78.498004], [-0.127237, -78.498028], [-0.127262, -78.498147], [-0.1273431, -78.4981164], [-0.127451, -78.498134]]
  },
  {
    id: "Parqueadero Subsuelo",
    name: "Parqueadero Personal/Logística",
    coordinates: [[-0.127796, -78.496903], [-0.127759, -78.496718], [-0.127394, -78.496798], [-0.127411, -78.496856], [-0.127427, -78.496917], [-0.127429, -78.496949], [-0.127439, -78.496998], [-0.127464, -78.496986], [-0.127488, -78.496979], [-0.127542, -78.496961], [-0.127603, -78.49694], [-0.127796, -78.496903]]
  }
];
