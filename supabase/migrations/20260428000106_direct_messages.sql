-- ─────────────────────────────────────────────
-- Direct Messages (User-to-User Messaging)
-- ─────────────────────────────────────────────

CREATE TABLE direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id != recipient_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_direct_messages_conversation ON direct_messages(conversation_id);
CREATE INDEX idx_direct_messages_sender_recipient ON direct_messages(sender_id, recipient_id);
CREATE INDEX idx_direct_messages_created_at ON direct_messages(created_at DESC);
CREATE INDEX idx_direct_messages_unread ON direct_messages(recipient_id) WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view messages they sent or received
CREATE POLICY "users_can_view_own_messages"
  ON direct_messages
  FOR SELECT
  USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

-- Users can insert messages as the sender
CREATE POLICY "users_can_send_messages"
  ON direct_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
  );

-- Users can update their own sent messages (mark as read if recipient)
CREATE POLICY "users_can_update_messages"
  ON direct_messages
  FOR UPDATE
  USING (
    auth.uid() = recipient_id AND read_at IS NULL
  )
  WITH CHECK (
    auth.uid() = recipient_id
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_direct_messages_timestamp
  BEFORE UPDATE ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
