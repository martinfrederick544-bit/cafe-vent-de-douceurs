-- =====================================================================
-- Démarrage — à exécuter UNE fois dans Supabase > SQL Editor, APRÈS supabase/schema.sql
-- =====================================================================

-- 1) Notifications push : URL du service + secret partagé (même valeur que PUSH_SECRET dans Vercel)
insert into public.vd_config (key, value) values
  ('push_url',    'https://cafe-vent-de-douceurs.synccrm.ca/api/push'),
  ('push_secret', 'COLLER-ICI-LE-SECRET-PUSH')
on conflict (key) do update set value = excluded.value;
