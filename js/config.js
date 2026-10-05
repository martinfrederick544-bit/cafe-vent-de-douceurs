/* =========================================================
   Configuration — Café Vent de douceurs express
   (la clé "anon" Supabase est publique par conception : la sécurité est
    assurée par les politiques RLS et les fonctions SQL, voir supabase/schema.sql)
========================================================= */
window.VD = {
  APP_NAME: "Café Vent de douceurs express",

  // ⬇️ À remplir avec le NOUVEAU projet Supabase (Settings > API)
  SUPABASE_URL: "https://gsucuwsrsabiflwebxbo.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzdWN1d3Nyc2FiaWZsd2VieGJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NTM4ODgsImV4cCI6MjA5ODIyOTg4OH0.0d4Hwsdwn6ibiKk-nrl0pJZgT-UC4fxy-AItsSTZQI4",

  // ⬇️ Clé publique VAPID pour les notifications push (laisser vide = bouton notifications masqué)
  VAPID_PUBLIC_KEY: "BFYBqglv3KUL77W1Bt-msjJwHCnCG3jY9dT_ULjw2pC5GSQk1N8DU2rrX7IRZ6b4Tp9CGJ2-bQE4Zx0g5fxfbwQ",

  TZ: "America/Toronto",

  // Compte staff UNIVERSEL : tout le café partage ce compte ; seul le mot de passe est demandé sur la page staff.
  STAFF_EMAIL: "info@synccrm.ca",

  // Pictogrammes : par défaut servis depuis /icons/. Pour les héberger ailleurs (ex. médiathèque GHL),
  // ajouter ici "nom-du-fichier.jpg": "https://…/image.jpg" ; ça prend le dessus sur /icons/.
  ICON_BASE: "/icons/",
  // Pictogrammes hébergés dans la médiathèque GHL (Sync CRM > dossier cafe_vent_de_douceur).
  // Les .png (boissons) sont les images d'origine 1024×768 : l'interface les recadre automatiquement.
  ICON_OVERRIDES: {
    "edulcorant.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac14086c478ac5535a51eb7.jpg",
    "sucre.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac14086c478ac5535a51eab.jpg",
    "sirop-vanille.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac14085c478ac5535a51e97.jpg",
    "sirop-noisette.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac14085bbad531ac88cc034.jpg",
    "lait.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac14085bbad531ac88cc028.jpg",
    "guimauves.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac140857d735ea2a1ff440d.jpg",
    "creme.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac140857d735ea2a1ff4418.jpg",
    "sirop-marula.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac14085bbad531ac88cc00c.jpg",
    "sirop-caramel.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac14084c478ac5535a51e82.jpg",
    "latte-glace.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac14084c478ac5535a51e77.png",
    "chocolat-chaud.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac1408422bc27f58f382353.jpg",
    "americano.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac1408322bc27f58f382302.png",
    "cafe-glace.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac14083195f9172ed4bc7b2.png",
    "latte-macchiato.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac1408322bc27f58f382323.png",
    "espresso.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac1408322bc27f58f382301.png",
    "cafe.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac14083bbad531ac88cbfbc.png",
    "cappuccino.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac1408322bc27f58f382313.png",
  },
};

window.VD.isConfigured = function () {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(VD.SUPABASE_URL) && VD.SUPABASE_URL.indexOf("REMPLACER") === -1 &&
         VD.SUPABASE_ANON_KEY && VD.SUPABASE_ANON_KEY !== "REMPLACER";
};
