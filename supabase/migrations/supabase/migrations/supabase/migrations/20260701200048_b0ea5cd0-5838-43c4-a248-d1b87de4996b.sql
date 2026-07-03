
CREATE TABLE public.rooms (
  id text PRIMARY KEY,
  name text NOT NULL,
  content text NOT NULL DEFAULT '',
  locked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms are readable by everyone"
  ON public.rooms FOR SELECT
  USING (true);

CREATE POLICY "rooms are writable by everyone"
  ON public.rooms FOR UPDATE
  USING (true) WITH CHECK (true);

INSERT INTO public.rooms (id, name) VALUES
  ('math', 'math'),
  ('physics', 'physics'),
  ('chemistry', 'chemistry'),
  ('history', 'history');

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
