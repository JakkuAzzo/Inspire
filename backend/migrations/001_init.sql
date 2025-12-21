CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fuel_packs (
  id TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES users(id),
  mode TEXT NOT NULL,
  submode TEXT,
  headline TEXT,
  filters JSONB,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_packs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  pack_id TEXT NOT NULL REFERENCES fuel_packs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pack_id)
);

CREATE TABLE IF NOT EXISTS remix_history (
  id SERIAL PRIMARY KEY,
  parent_pack_id TEXT REFERENCES fuel_packs(id),
  child_pack_id TEXT REFERENCES fuel_packs(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  progress JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  pack_id TEXT REFERENCES fuel_packs(id),
  action TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS share_tokens (
  token TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL REFERENCES fuel_packs(id),
  owner_id TEXT REFERENCES users(id),
  visibility TEXT DEFAULT 'private',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
