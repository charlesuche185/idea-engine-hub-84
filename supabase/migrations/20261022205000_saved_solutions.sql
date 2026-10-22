CREATE TABLE public.saved_solutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  source_message_id uuid NOT NULL,
  title text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_message_id)
);

GRANT SELECT, INSERT, DELETE ON public.saved_solutions TO authenticated;
GRANT ALL ON public.saved_solutions TO service_role;

ALTER TABLE public.saved_solutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own saved solutions"
  ON public.saved_solutions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX saved_solutions_user_created_idx
  ON public.saved_solutions (user_id, created_at DESC);
