-- Per-user preferences, one row per user. A user without a row has the defaults.
--
-- unlikely_after_days: how long an application can sit in Applied before the nightly job moves it
-- to Unlikely. NULL means never. The backend allows only the values the Settings page offers.
CREATE TABLE user_settings (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  unlikely_after_days  SMALLINT DEFAULT 14 CHECK (unlikely_after_days IN (7, 14, 21, 30, 60)),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY insert_own ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY update_own ON user_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
