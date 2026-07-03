
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO anon, authenticated;
GRANT ALL ON public.flashcards TO service_role;

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flashcards readable by everyone" ON public.flashcards FOR SELECT USING (true);
CREATE POLICY "flashcards insertable by everyone" ON public.flashcards FOR INSERT WITH CHECK (true);
CREATE POLICY "flashcards deletable by everyone" ON public.flashcards FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.flashcards;
ALTER TABLE public.flashcards REPLICA IDENTITY FULL;

CREATE INDEX idx_flashcards_room ON public.flashcards(room_id, created_at DESC);
