-- ═══════════════════════════════════════════════════════════════════════════
-- Parqueadero — Supabase Database Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Drivers Table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS drivers (
  id         BIGSERIAL PRIMARY KEY,
  cedula     TEXT NOT NULL UNIQUE,
  nombres    TEXT NOT NULL,
  apellidos  TEXT NOT NULL,
  tipo_persona      TEXT DEFAULT '1',
  cargo             TEXT DEFAULT '1',
  area              TEXT DEFAULT '1',
  privilegio_parqueo TEXT DEFAULT '1',
  fecha_inicio_vip       DATE,
  duracion_vip           INTEGER,
  fecha_expiracion_vip   DATE,
  placa_1   TEXT DEFAULT '',
  placa_2   TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Parking Logs Table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS parking_logs (
  id               BIGSERIAL PRIMARY KEY,
  log_id           TEXT NOT NULL UNIQUE DEFAULT (
    'LOG-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 5)
  ),
  cedula           TEXT NOT NULL REFERENCES drivers(cedula) ON DELETE CASCADE,
  tipo_movimiento  TEXT NOT NULL CHECK (tipo_movimiento IN ('1', '2')),
  lote             TEXT NOT NULL,
  token_type       TEXT DEFAULT 'standard',
  color_zona       TEXT,
  token_number     INTEGER,
  placa            TEXT,
  kilometraje      NUMERIC,
  conductor_institucional TEXT,
  fecha_hora       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Infractions Table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS infractions (
  id               BIGSERIAL PRIMARY KEY,
  cedula           TEXT NOT NULL REFERENCES drivers(cedula) ON DELETE CASCADE,
  motivo           TEXT NOT NULL,
  foto_data        TEXT, -- Can hold a URL or Base64 temporary payload
  fecha_hora       TIMESTAMPTZ DEFAULT NOW(),
  reporter_id      TEXT
);

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE infractions ENABLE ROW LEVEL SECURITY;

-- Public access policies (tighten these when auth is added)
CREATE POLICY "Allow all on drivers"
  ON drivers FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on parking_logs"
  ON parking_logs FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on infractions"
  ON infractions FOR ALL
  USING (true) WITH CHECK (true);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_logs_cedula   ON parking_logs(cedula);
CREATE INDEX IF NOT EXISTS idx_logs_fecha    ON parking_logs(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_drivers_cedula ON drivers(cedula);
CREATE INDEX IF NOT EXISTS idx_infractions_cedula ON infractions(cedula);

-- ─── Auto-update updated_at trigger ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Enable Realtime ────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE parking_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
