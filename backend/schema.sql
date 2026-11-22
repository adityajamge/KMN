CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY,
  plan TEXT NOT NULL CHECK (plan IN ('core', 'comprehensive')),
  status TEXT NOT NULL CHECK (status IN ('paid', 'unpaid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hold_until TIMESTAMPTZ,
  invoice_no TEXT NOT NULL DEFAULT '',
  payment_ref TEXT NOT NULL DEFAULT '',
  subtotal NUMERIC(12, 2) NOT NULL,
  gst NUMERIC(12, 2) NOT NULL,
  total NUMERIC(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  role TEXT NOT NULL,
  age INTEGER NOT NULL,
  goals JSONB NOT NULL DEFAULT '[]',
  health_note TEXT NOT NULL DEFAULT '',
  relation TEXT NOT NULL DEFAULT '',
  guardian_name TEXT NOT NULL DEFAULT '',
  guardian_phone TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  is_payer BOOLEAN NOT NULL DEFAULT FALSE,
  programme TEXT NOT NULL CHECK (programme IN ('core', 'comprehensive')),
  upgraded BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  attendance JSONB NOT NULL DEFAULT '[]'
);

CREATE UNIQUE INDEX IF NOT EXISTS participants_code_unique
  ON participants (code)
  WHERE code <> '';

CREATE INDEX IF NOT EXISTS participants_booking_id_idx ON participants (booking_id);

CREATE TABLE IF NOT EXISTS upgrades (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('paid', 'unpaid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  gross NUMERIC(12, 2) NOT NULL,
  credit NUMERIC(12, 2) NOT NULL,
  gst NUMERIC(12, 2) NOT NULL,
  total NUMERIC(12, 2) NOT NULL,
  invoice_no TEXT NOT NULL,
  payment_ref TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS upgrade_participants (
  upgrade_id UUID NOT NULL REFERENCES upgrades(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id),
  PRIMARY KEY (upgrade_id, participant_id)
);

CREATE TABLE IF NOT EXISTS invoice_seq (
  id INTEGER PRIMARY KEY,
  next_no INTEGER NOT NULL
);

INSERT INTO invoice_seq (id, next_no)
VALUES (1, 1050)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS event_settings (
  id INTEGER PRIMARY KEY,
  core_group TEXT NOT NULL DEFAULT '',
  full_group TEXT NOT NULL DEFAULT ''
);

INSERT INTO event_settings (id, core_group, full_group)
VALUES (1, '', '')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS payment_orders (
  order_id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL CHECK (purpose IN ('registration', 'upgrade')),
  booking_id UUID,
  participant_ids JSONB NOT NULL DEFAULT '[]',
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_auth (
  id INTEGER PRIMARY KEY,
  totp_secret TEXT NOT NULL,
  session_key TEXT NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_sends (
  id UUID PRIMARY KEY,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  template_name TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '[]',
  dedupe_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  detail TEXT NOT NULL DEFAULT '',
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
