# Café Vent de douceurs express

PWA de commandes de café pour l'École Régionale du Vent-Nouveau (base : template « Café Chez Brenda »).
Site statique (HTML + JS vanilla) + 2 petites fonctions Vercel (`api/`) + backend Supabase.

## Fonctionnalités
**Client** : compte par courriel + « mot de passe oublié » en libre-service, menu en pictogrammes, sirops
(½ c. à thé / 1 c. à thé), lait/crème/sucre/édulcorant (0‑3), guimauves, chocolat chaud sans produits laitiers,
panier, portefeuille (solde + historique, **solde négatif permis jusqu'à un découvert maximal**), fidélité
10 achetées = 1 gratuite, photo de profil (facultative), notifications push (commande prête, solde bas).

**Staff** (comptes créés par les employés avec un code d'accès) : commandes en direct (photo, local, pictogrammes),
tasses numérotées (auto/manuel/retour), clients (recharge manuelle du portefeuille, photos, historique),
menu/prix, horaires, rapport mensuel + exports CSV, gestion de l'équipe et du code d'accès. Notification push à chaque commande.

Prix : boisson 2 $, +0,50 $ avec sirop (modifiable). Les prix sont calculés **côté serveur**.

## Mise en route
1. **Supabase** (projet dédié) → SQL Editor : exécuter `supabase/schema.sql`, puis `supabase/setup.sql` (code d'accès staff + secret push).
2. **Authentication → URL Configuration** : *Site URL* = `https://cafe-vent-de-douceurs.synccrm.ca`.
3. **Authentication → Emails → SMTP** : brancher un SMTP (le SMTP par défaut de Supabase est limité à quelques courriels/heure).
4. `js/config.js` : `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
5. **Vercel → Environment Variables** : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PUSH_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
6. Le premier compte staff : « Espace staff → Créer un compte staff » avec le code d'accès.

### Garde-fou « projet Supabase en pause »
`api/keepalive.js` est appelé chaque jour par Vercel Cron (`vercel.json`) et exécute une vraie requête SQL (`vd_ping`).

### Notifications push
Des triggers SQL (`vd_trg_*`) préparent le message et les abonnements puis appellent `/api/push` (pg_net → Vercel, secret partagé).
Événements : nouvelle commande (staff), commande prête / annulée (client), solde bas ou négatif (client).
iOS : le site doit être ajouté à l'écran d'accueil.

### Pictogrammes
Servis depuis `icons/`. Pour les héberger ailleurs (médiathèque GHL) : remplir `ICON_OVERRIDES` dans `js/config.js`.

## Développement local
```
node dev/serve.js          # http://localhost:5173
```
`/?mock` = faux backend en mémoire (`marie@ecole.ca / test123`, `staff@ecole.ca / staff123`, code staff `CODE123`).

`.vercelignore` exclut `supabase/`, `dev/` et les images sources.
