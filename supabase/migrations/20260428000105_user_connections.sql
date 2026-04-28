-- ─────────────────────────────────────────────
-- User Connections (Follow/Friend System)
-- ─────────────────────────────────────────────

CREATE TABLE user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_user_connections_follower ON user_connections(follower_id);
CREATE INDEX idx_user_connections_following ON user_connections(following_id);
CREATE INDEX idx_user_connections_status ON user_connections(status);

-- Enable RLS
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view all connections (public social data)
CREATE POLICY "anyone_can_view_connections"
  ON user_connections
  FOR SELECT
  USING (true);

-- Users can insert their own follow connections
CREATE POLICY "users_can_create_connections"
  ON user_connections
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can update/delete their own connections
CREATE POLICY "users_can_update_own_connections"
  ON user_connections
  FOR UPDATE
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "users_can_delete_own_connections"
  ON user_connections
  FOR DELETE
  USING (auth.uid() = follower_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_user_connections_timestamp
  BEFORE UPDATE ON user_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();
