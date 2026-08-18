ALTER TABLE public.meal_photos
  ADD COLUMN calories_source text NOT NULL DEFAULT 'ia' CHECK (calories_source IN ('ia','coach')),
  ADD COLUMN corrected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN corrected_at timestamptz;

GRANT UPDATE ON public.meal_photos TO authenticated;

CREATE POLICY "meals_coach_correct" ON public.meal_photos
  FOR UPDATE TO authenticated
  USING (public.is_coach_of(client_id))
  WITH CHECK (public.is_coach_of(client_id));

CREATE OR REPLACE FUNCTION public.guard_meal_coach_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> OLD.client_id THEN
    IF NEW.client_id <> OLD.client_id
       OR NEW.image_path <> OLD.image_path
       OR NEW.entry_date <> OLD.entry_date
       OR NEW.taken_at <> OLD.taken_at
       OR COALESCE(NEW.calories_raw, -1) <> COALESCE(OLD.calories_raw, -1) THEN
      RAISE EXCEPTION 'Seule la valeur calorique peut etre corrigee';
    END IF;
    NEW.calories_source := 'coach';
    NEW.corrected_by := auth.uid();
    NEW.corrected_at := now();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_meal_coach_update() FROM PUBLIC, anon;

CREATE TRIGGER meal_photos_coach_guard
  BEFORE UPDATE ON public.meal_photos
  FOR EACH ROW EXECUTE FUNCTION public.guard_meal_coach_update();