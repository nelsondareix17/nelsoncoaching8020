ALTER TABLE public.meal_photos
  ADD COLUMN IF NOT EXISTS total_protein_g numeric,
  ADD COLUMN IF NOT EXISTS total_carbs_g numeric,
  ADD COLUMN IF NOT EXISTS total_fat_g numeric;