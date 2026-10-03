-- =====================================================================
-- Démarrage — à exécuter UNE fois dans Supabase > SQL Editor, APRÈS supabase/schema.sql
-- =====================================================================

-- 1) Code d'accès staff : ce code permet à un employé de créer son compte sur
--    « Espace staff > Créer un compte staff ». À donner seulement aux gens du café.
--    (Modifiable ensuite dans l'app : Staff > Réglages.)
update public.vd_staff_code
   set code_hash = encode(sha256(convert_to('CHANGER-CE-CODE', 'UTF8')), 'hex')
 where id = 1;

-- 2) Notifications push : URL du service + secret partagé (même valeur que PUSH_SECRET dans Vercel)
insert into public.vd_config (key, value) values
  ('push_url',    'https://cafe-vent-de-douceurs.synccrm.ca/api/push'),
  ('push_secret', 'COLLER-ICI-LE-SECRET-PUSH')
on conflict (key) do update set value = excluded.value;
