
CREATE TYPE public.app_role AS ENUM ('client','coach');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'client',
  coach_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_coach(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND role = 'coach');
$$;

CREATE OR REPLACE FUNCTION public.is_coach_of(_client uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _client AND coach_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.my_coach_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coach_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_select_clients" ON public.profiles FOR SELECT TO authenticated USING (coach_id = auth.uid());
CREATE POLICY "profiles_select_my_coach" ON public.profiles FOR SELECT TO authenticated USING (id = public.my_coach_id());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_clients" ON public.profiles FOR UPDATE TO authenticated
  USING (coach_id = auth.uid() OR (public.is_coach(auth.uid()) AND coach_id IS NULL))
  WITH CHECK (coach_id = auth.uid() OR coach_id IS NULL);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN NEW.raw_user_meta_data->>'role' = 'coach' THEN 'coach'::public.app_role ELSE 'client'::public.app_role END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.weight_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT (now()::date),
  weight_kg numeric(5,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, entry_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_entries TO authenticated;
GRANT ALL ON public.weight_entries TO service_role;
ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weights_client_all" ON public.weight_entries FOR ALL TO authenticated USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
CREATE POLICY "weights_coach_read" ON public.weight_entries FOR SELECT TO authenticated USING (public.is_coach_of(client_id));

CREATE TABLE public.meal_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  entry_date date NOT NULL DEFAULT (now()::date),
  note text,
  calories_raw integer,
  calories_final integer,
  detected_items jsonb,
  analysis_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.meal_photos TO authenticated;
GRANT ALL ON public.meal_photos TO service_role;
ALTER TABLE public.meal_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meals_client_insert" ON public.meal_photos FOR INSERT TO authenticated WITH CHECK (client_id = auth.uid() AND calories_raw IS NULL AND calories_final IS NULL);
CREATE POLICY "meals_client_select" ON public.meal_photos FOR SELECT TO authenticated USING (client_id = auth.uid());
CREATE POLICY "meals_client_delete" ON public.meal_photos FOR DELETE TO authenticated USING (client_id = auth.uid());
CREATE POLICY "meals_coach_read" ON public.meal_photos FOR SELECT TO authenticated USING (public.is_coach_of(client_id));

CREATE TABLE public.activity_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT (now()::date),
  steps integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, entry_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_entries TO authenticated;
GRANT ALL ON public.activity_entries TO service_role;
ALTER TABLE public.activity_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_client_all" ON public.activity_entries FOR ALL TO authenticated USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
CREATE POLICY "activity_coach_read" ON public.activity_entries FOR SELECT TO authenticated USING (public.is_coach_of(client_id));

CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT (now()::date),
  workout_type text NOT NULL,
  duration_min integer NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workouts_client_all" ON public.workouts FOR ALL TO authenticated USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
CREATE POLICY "workouts_coach_read" ON public.workouts FOR SELECT TO authenticated USING (public.is_coach_of(client_id));

CREATE POLICY "meal_photos_client_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "meal_photos_client_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'meal-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_coach_of(((storage.foldername(name))[1])::uuid)));
CREATE POLICY "meal_photos_client_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'meal-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
