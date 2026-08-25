CREATE TABLE application_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_status TEXT,           -- NULL means "initial creation"
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_automatic BOOLEAN DEFAULT FALSE NOT NULL
);

ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own status history"
  ON application_status_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own status history"
  ON application_status_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_status_history_application_id ON application_status_history(application_id);
CREATE INDEX idx_status_history_changed_at ON application_status_history(changed_at DESC);
