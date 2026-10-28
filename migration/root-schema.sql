-- Application tables only: do not replace Supabase's auth/storage schemas.
-- Import the original rows with their ids, password_hash values, and timestamps.
BEGIN;

CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  verified BOOLEAN DEFAULT FALSE,
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sessions (
  token TEXT PRIMARY KEY,
  user_email TEXT REFERENCES public.users(email) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.embeds (
  id SERIAL PRIMARY KEY,
  user_email TEXT REFERENCES public.users(email) ON DELETE CASCADE,
  type TEXT,
  source_url TEXT,
  embed_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id SERIAL PRIMARY KEY,
  user_email TEXT REFERENCES public.users(email) ON DELETE CASCADE,
  plan_key TEXT,
  subscription_id TEXT,
  status TEXT,
  activated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_email_unique ON public.subscriptions(user_email);
CREATE INDEX IF NOT EXISTS sessions_user_email_idx ON public.sessions(user_email);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON public.sessions(expires_at);
CREATE INDEX IF NOT EXISTS embeds_user_created_at_idx ON public.embeds(user_email, created_at DESC, id DESC);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- The existing application authorizes requests on its server. No browser key
-- can read its password hashes, sessions, saved embeds, or subscription records.
REVOKE ALL ON TABLE public.users, public.sessions, public.embeds, public.subscriptions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.users_id_seq, public.embeds_id_seq, public.subscriptions_id_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users, public.sessions, public.embeds, public.subscriptions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.users_id_seq, public.embeds_id_seq, public.subscriptions_id_seq TO service_role;

-- Run this schema again AFTER importing explicit legacy ids. It safely aligns
-- all sequences with the imported maximum so the next signup cannot collide.
SELECT setval(pg_get_serial_sequence('public.users', 'id'), GREATEST(COALESCE(MAX(id), 0), 1), COUNT(*) > 0) FROM public.users;
SELECT setval(pg_get_serial_sequence('public.embeds', 'id'), GREATEST(COALESCE(MAX(id), 0), 1), COUNT(*) > 0) FROM public.embeds;
SELECT setval(pg_get_serial_sequence('public.subscriptions', 'id'), GREATEST(COALESCE(MAX(id), 0), 1), COUNT(*) > 0) FROM public.subscriptions;

NOTIFY pgrst, 'reload schema';
COMMIT;
