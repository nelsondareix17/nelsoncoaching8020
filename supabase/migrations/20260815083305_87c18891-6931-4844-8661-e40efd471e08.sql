
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_coach(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_coach_of(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.my_coach_id() FROM anon;
