/* =========================================================
   Configuration — Café Vent de douceurs express
   (la clé "anon" Supabase est publique par conception : la sécurité est
    assurée par les politiques RLS et les fonctions SQL, voir supabase/schema.sql)
========================================================= */
window.VD = {
  APP_NAME: "Café Vent de douceurs express",

  // ⬇️ À remplir avec le NOUVEAU projet Supabase (Settings > API)
  SUPABASE_URL: "https://REMPLACER.supabase.co",
  SUPABASE_ANON_KEY: "REMPLACER",

  // ⬇️ Clé publique VAPID pour les notifications push (laisser vide = bouton notifications masqué)
  VAPID_PUBLIC_KEY: "BFYBqglv3KUL77W1Bt-msjJwHCnCG3jY9dT_ULjw2pC5GSQk1N8DU2rrX7IRZ6b4Tp9CGJ2-bQE4Zx0g5fxfbwQ",

  TZ: "America/Toronto",

  // Pictogrammes : par défaut servis depuis /icons/. Pour les héberger ailleurs (ex. médiathèque GHL),
  // ajouter ici "nom-du-fichier.jpg": "https://…/image.jpg" ; ça prend le dessus sur /icons/.
  ICON_BASE: "/icons/",
  ICON_OVERRIDES: {
    // "cafe.jpg": "https://storage.googleapis.com/msgsndr/<locationId>/media/<id>.jpg",
  },
};

window.VD.isConfigured = function () {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(VD.SUPABASE_URL) && VD.SUPABASE_URL.indexOf("REMPLACER") === -1 &&
         VD.SUPABASE_ANON_KEY && VD.SUPABASE_ANON_KEY !== "REMPLACER";
};
