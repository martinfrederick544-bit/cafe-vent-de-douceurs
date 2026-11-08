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
  CUP_BASE: "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/",
  CUP_PERSO: "6af08ffa1ac4234dcdf59f1b.jpg",
  CUP_IDS: ["6af08ffa4b6e00bd1b3b9e2f.jpg","6af08ffa3f4edcbb00425326.jpg","6af08ffa4b6e00bd1b3b9e57.jpg","6af08ffa3f4edcbb00425346.jpg","6af08ffb4b6e00bd1b3b9e77.jpg","6af08ffbaf2d4b8b2ff3edfc.jpg","6af08ffb4b6e00bd1b3b9e87.jpg","6af08ffb4b6e00bd1b3b9e93.jpg","6af08ffbe9d59b97b0729466.jpg","6af08ffb1ac4234dcdf59f68.jpg","6af08ffb3f4edcbb0042536a.jpg","6af08ffcaf2d4b8b2ff3ee20.jpg","6af08ffce9d59b97b0729482.jpg","6af08ff73f4edcbb004252b2.jpg","6af08ff71ac4234dcdf59e99.jpg","6af08ff71ac4234dcdf59e98.jpg","6af08ff7e9d59b97b07293d2.jpg","6af08ff7e9d59b97b07293d8.jpg","6af08ff7e9d59b97b07293cd.jpg","6af08ff8af2d4b8b2ff3ed70.jpg","6af08ff81ac4234dcdf59ebe.jpg","6af08ff81ac4234dcdf59eca.jpg","6af08ff8af2d4b8b2ff3ed80.jpg","6af08ff83f4edcbb004252e6.jpg","6af08ff8e9d59b97b0729412.jpg","6af08ff8e9d59b97b0729426.jpg","6af08ff94b6e00bd1b3b9dff.jpg","6af08ff94b6e00bd1b3b9e0f.jpg","6af08ff93f4edcbb004252fe.jpg","6af08ff93f4edcbb0042530a.jpg"],
  PICTO_DELIVER: "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6af08ff91ac4234dcdf59ef6.jpg",
  PICTO_PICKUP: "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6af08ffa4b6e00bd1b3b9e23.jpg",
  DELIVERY_EMAIL: "livraison@synccrm.ca",   // compte partagé du groupe livraison

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
    "latte-glace.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6af08ffde9d59b97b07294d5.png?v=2",
    "chocolat-chaud.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6ac1408422bc27f58f382353.jpg",
    "americano.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6af08ffce9d59b97b072949a.png?v=2",
    "cafe-glace.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6af08ffde9d59b97b07294cb.png?v=2",
    "latte-macchiato.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6af08ffde9d59b97b07294ba.png?v=2",
    "espresso.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6af08ffcaf2d4b8b2ff3ee2c.png?v=2",
    "cafe.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6af08ffc4b6e00bd1b3b9ea7.png?v=2",
    "cappuccino.jpg": "https://assets.cdn.filesafe.space/0DkpRaoTql6L7OixzlfA/media/6af08ffd1ac4234dcdf59fa4.png?v=2",
  },
};

window.VD.isConfigured = function () {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(VD.SUPABASE_URL) && VD.SUPABASE_URL.indexOf("REMPLACER") === -1 &&
         VD.SUPABASE_ANON_KEY && VD.SUPABASE_ANON_KEY !== "REMPLACER";
};
