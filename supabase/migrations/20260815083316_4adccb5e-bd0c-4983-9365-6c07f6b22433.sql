
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_coach(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_coach_of(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_coach_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_coach(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coach_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_coach_id() TO authenticated;
