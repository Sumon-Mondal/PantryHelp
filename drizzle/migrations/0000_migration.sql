CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Untitled plan',
  snapshot jsonb NOT NULL,
  snapshot_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read shared plans" ON public.plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can save a plan" ON public.plans FOR INSERT TO anon, authenticated WITH CHECK (length(name) <= 120 AND length(snapshot::text) < 20000);