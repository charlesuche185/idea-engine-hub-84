CREATE TABLE public.profiles (id uuid PRIMARY KEY, display_name text, bio text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated; GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1))); RETURN NEW; END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.conversations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), title text NOT NULL DEFAULT 'New conversation', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated; GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversations" ON public.conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE, user_id uuid NOT NULL DEFAULT auth.uid(), role text NOT NULL, content text NOT NULL DEFAULT '', image_url text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated; GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.messages (conversation_id, created_at);

CREATE TABLE public.problems (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid DEFAULT auth.uid(), title text NOT NULL, description text NOT NULL, category text NOT NULL DEFAULT 'Other', analysis text, is_sample boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.problems TO anon; GRANT SELECT, INSERT, UPDATE, DELETE ON public.problems TO authenticated; GRANT ALL ON public.problems TO service_role;
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "problems public read" ON public.problems FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "problems own insert" ON public.problems FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "problems own update" ON public.problems FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "problems own delete" ON public.problems FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ideas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid DEFAULT auth.uid(), problem_id uuid REFERENCES public.problems(id) ON DELETE SET NULL, title text NOT NULL, summary text NOT NULL, category text NOT NULL DEFAULT 'Other', details text, is_sample boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.ideas TO anon; GRANT SELECT, INSERT, UPDATE, DELETE ON public.ideas TO authenticated; GRANT ALL ON public.ideas TO service_role;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ideas public read" ON public.ideas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ideas own insert" ON public.ideas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ideas own update" ON public.ideas FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ideas own delete" ON public.ideas FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.saved_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), item_type text NOT NULL CHECK (item_type IN ('problem','idea')), item_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (user_id, item_type, item_id));
GRANT SELECT, INSERT, DELETE ON public.saved_items TO authenticated; GRANT ALL ON public.saved_items TO service_role;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved" ON public.saved_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO public.problems (user_id, title, description, category, is_sample) VALUES
(NULL, 'No reliable electricity for studying at night', 'Students in my community don''t have reliable access to electricity for studying at night, so homework and exam preparation suffer.', 'Education', true),
(NULL, 'Tomatoes spoil before reaching the market', 'Farmers in our village lose a large share of their tomatoes because there is no cool storage and transport to the market is slow.', 'Agriculture', true),
(NULL, 'Long queues at the local health clinic', 'Patients wait many hours at our clinic because there is no appointment system and records are kept on paper.', 'Healthcare', true),
(NULL, 'Plastic waste blocking street drains', 'Plastic bags and bottles block drains in our area, causing flooding every rainy season.', 'Environment', true),
(NULL, 'Unsafe road crossing near the school', 'Children cross a busy road near our school with no crossing guard, signs or speed bumps.', 'Cars & Transport', true);

INSERT INTO public.ideas (user_id, title, summary, category, is_sample) VALUES
(NULL, 'Solar Study Lamp Library', 'A community-run lending service for small rechargeable solar lamps that students borrow for evening study and return weekly.', 'Education', true),
(NULL, 'Evaporative Clay Cooler for Produce', 'A low-cost pot-in-pot cooler made from clay and wet sand that keeps vegetables fresher for longer without electricity.', 'Agriculture', true),
(NULL, 'SMS Queue Ticket for Clinics', 'Patients text a short code to get a queue number and receive a message when their turn is close.', 'Healthcare', true),
(NULL, 'Plastic-to-Paver Workshop', 'Collect waste plastic and melt it with sand into durable paving blocks that youth groups can sell.', 'Environment', true);