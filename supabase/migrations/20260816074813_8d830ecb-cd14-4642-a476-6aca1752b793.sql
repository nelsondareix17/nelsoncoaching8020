CREATE TABLE public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subs_client_all ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE TRIGGER push_subscriptions_touch BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  entry_date date not null,
  slot_hour integer not null,
  created_at timestamptz not null default now(),
  unique (client_id, kind, entry_date, slot_hour)
);

GRANT ALL ON public.reminder_log TO service_role;
ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'push-reminders-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--0d30ce9a-b3c3-4e52-8a08-b01abf03675d-dev.lovable.app/api/public/hooks/push-reminders',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_HxvU-khOkWSPvaZk1QLx3g_sYQ5UHmp"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) as request_id;
  $$
);