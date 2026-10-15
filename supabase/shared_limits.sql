-- =====================================================
-- Shared rate limits and cache
-- Run this once in the Supabase SQL Editor.
--
-- Used by the name finder, the ORC name check and their Discord notices, so limits and cached
-- answers hold across every server instance instead of each one counting on its own.
-- Until this runs, the app falls back to per-instance memory, so nothing breaks.
-- Only the service role (server code) can use these; RLS with no policies blocks browsers.
-- =====================================================

CREATE TABLE IF NOT EXISTS graydocket.rate_counters (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS graydocket.shared_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_counters_expires_idx ON graydocket.rate_counters (expires_at);
CREATE INDEX IF NOT EXISTS shared_cache_expires_idx ON graydocket.shared_cache (expires_at);

ALTER TABLE graydocket.rate_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE graydocket.shared_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON graydocket.rate_counters FROM anon, authenticated;
REVOKE ALL ON graydocket.shared_cache FROM anon, authenticated;

-- Count one hit against `p_key` in a fixed window and return the count so far in that window.
-- A single statement, so two servers counting at the same moment can't both slip under a limit.
CREATE OR REPLACE FUNCTION graydocket.hit_counter(p_key TEXT, p_window_seconds INTEGER, p_amount INTEGER DEFAULT 1)
RETURNS INTEGER
LANGUAGE sql
AS $$
  INSERT INTO graydocket.rate_counters AS r (key, count, window_start, expires_at)
  VALUES (p_key, p_amount, now(), now() + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN r.expires_at <= now() THEN p_amount ELSE r.count + p_amount END,
    window_start = CASE WHEN r.expires_at <= now() THEN now() ELSE r.window_start END,
    expires_at = CASE WHEN r.expires_at <= now() THEN now() + make_interval(secs => p_window_seconds) ELSE r.expires_at END
  RETURNING count;
$$;

-- Clear out expired rows; the app calls this now and then
CREATE OR REPLACE FUNCTION graydocket.prune_shared_limits()
RETURNS VOID
LANGUAGE sql
AS $$
  DELETE FROM graydocket.rate_counters WHERE expires_at < now() - interval '1 hour';
  DELETE FROM graydocket.shared_cache WHERE expires_at < now();
$$;

REVOKE EXECUTE ON FUNCTION graydocket.hit_counter(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION graydocket.prune_shared_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION graydocket.hit_counter(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION graydocket.prune_shared_limits() TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON graydocket.rate_counters, graydocket.shared_cache TO service_role;
