-- ═══════════════════════════════════════════════════════════════════════════
-- Parqueadero — Database Bootstrap (Self-Hosted Supabase)
-- Runs automatically on first container start via docker-entrypoint-initdb.d
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Create roles required by PostgREST / Supabase ──────────────────────

-- Authenticator role (PostgREST connects as this)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD current_setting('app.settings.postgres_password', true);
  END IF;
END $$;

-- Anonymous role (unauthenticated API requests)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END $$;

-- Authenticated role (authenticated API requests)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

-- Service role (admin bypass)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

-- Grant role switching
GRANT anon          TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role  TO authenticator;

-- Set authenticator password from env
ALTER ROLE authenticator WITH PASSWORD :'POSTGRES_PASSWORD';

-- ─── Create the publication for Supabase Realtime ────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- ─── Create schema for Realtime ──────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS _realtime;
GRANT USAGE ON SCHEMA _realtime TO postgres;
GRANT ALL ON SCHEMA _realtime TO postgres;

-- ─── Application Tables ─────────────────────────────────────────────────

-- Drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
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

-- Parking logs table
CREATE TABLE IF NOT EXISTS public.parking_logs (
  id               BIGSERIAL PRIMARY KEY,
  log_id           TEXT NOT NULL UNIQUE DEFAULT (
    'LOG-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 5)
  ),
  cedula           TEXT NOT NULL REFERENCES public.drivers(cedula) ON DELETE CASCADE,
  tipo_movimiento  TEXT NOT NULL CHECK (tipo_movimiento IN ('1', '2')),
  lote             TEXT NOT NULL,
  token_type       TEXT DEFAULT 'standard',
  color_zona       TEXT,
  token_number     INTEGER,
  fecha_hora       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ─────────────────────────────────────────────────

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_logs ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated full access (tighten when auth is added)
CREATE POLICY "anon_drivers" ON public.drivers
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "auth_drivers" ON public.drivers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_logs" ON public.parking_logs
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "auth_logs" ON public.parking_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role bypasses RLS automatically

-- ─── Indexes ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_logs_cedula   ON public.parking_logs(cedula);
CREATE INDEX IF NOT EXISTS idx_logs_fecha    ON public.parking_logs(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_drivers_cedula ON public.drivers(cedula);

-- ─── Auto-update trigger ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── Grant table access to roles ────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- ─── Enable Realtime for app tables ─────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.parking_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;

-- ═══════════════════════════════════════════════════════════════════════════
-- Done. Database is ready for Parqueadero.
-- ═══════════════════════════════════════════════════════════════════════════
