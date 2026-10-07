/* =========================================================
   AIDE INTÉGRÉE : visite guidée + guide + FAQ + assistant IA
   Contenu écrit pour CETTE app (Café Vent de douceurs express).
   - **gras** et retours à la ligne uniquement, jamais de HTML
   - {variables} remplacées par les réglages réels du café (prix, horaires, limites…) → toujours à jour
========================================================= */

const GUIDE_CLIENT = [
  { i: "☕", t: "Bienvenue au Café Vent de douceurs", d: "Commande ta boisson chaude ou froide **depuis ton téléphone, ton iPad ou ton ordinateur**. Les élèves du café la préparent, puis la **livrent à ton local** (avec leur chariot) ou elle t'attend pour que tu viennes la chercher." },
  { i: "🛒", t: "Commander", d: "1. Dans **Commander**, touche une boisson\n2. Choisis un **sirop** si tu veux (+{supplement}) : **léger** (½ c. à thé) ou **prononcé** (1 c. à thé)\n3. Ajoute lait, crème, sucre, édulcorant (de 0 à 3) et des guimauves\n4. Touche **Ajouter au panier**\n5. Choisis **livraison ou ramassage**, vérifie ton local, puis **Envoyer la commande**" },
  { i: "💰", t: "Ton portefeuille", d: "Tu **donnes l'argent comptant au café**, qui l'ajoute à ton compte. Chaque commande est déduite automatiquement et ton solde est toujours visible en haut de l'écran. Tu peux commander à crédit jusqu'à **{decouvert}** de solde négatif. Quand ton solde passe sous **{seuil}**, tu reçois une alerte." },
  { i: "🎁", t: "Fidélité : 10 + 1", d: "Après **10 boissons payées, la suivante est gratuite**. Ta progression est dans **Mon compte**. Quand une boisson gratuite est disponible, une case apparaît dans ton panier." },
  { i: "🔔", t: "Suivre ta commande", d: "Dans **Mes commandes**, tu vois le statut et le **numéro de ta tasse**. Active les **notifications** (dans **Mon compte**) pour être averti quand ta boisson est prête. Sur iPhone/iPad : ajoute d'abord le site à l'écran d'accueil." },
];

const GUIDE_STAFF = [
  { i: "🧾", t: "Bienvenue dans l'espace staff", d: "Ici, le café reçoit les commandes, prépare, livre et gère les portefeuilles. Tout est dans **7 onglets** en haut de l'écran : Commandes, Clients, Tasses, Menu, Horaires, Rapports, Réglages." },
  { i: "📥", t: "Recevoir une commande", d: "Les **nouvelles commandes arrivent toutes seules** (et sonnent sur les appareils qui ont activé les notifications). Chaque carte montre la **photo du client**, son **local** (📍) ou « Ramassage », le total, et les **pictogrammes** de chaque boisson et de chaque ajout (sirop, lait, crème, sucre, édulcorant, guimauves, sans lait). Les plus anciennes sont en premier." },
  { i: "🥤", t: "Préparer, livrer, tasses", d: "1. Touche **＋ Tasse auto** (ou **＋ Toutes les tasses** pour une commande de plusieurs boissons, ou **Choisir…** pour un numéro précis) : il faut **une tasse par boisson**\n2. Prépare la boisson dans cette tasse\n3. Touche **✔ Complétée** quand c'est prêt : le client reçoit « Commande prête » avec son numéro de tasse\n4. Quand la tasse revient, touche-la (**Tasse n · retourner**) ou va dans l'onglet **Tasses**" },
  { i: "💰", t: "Clients et portefeuilles", d: "Onglet **Clients** : cherche quelqu'un et touche **＋ Recharger** (5, 10, 20, 50 $ ou autre montant) quand il te remet de l'argent. **Profil / photo** pour ajouter sa photo, **Historique** pour voir tous ses mouvements. Une erreur ? **− Retirer (correction)**. Le filtre **Solde bas** montre qui doit recharger." },
  { i: "📋", t: "Menu, horaires, rapports, réglages", d: "**Menu** : prix, nouveaux produits, ajouts, boissons ou sirops offerts ou non. **Horaires** : les périodes d'ouverture. **Rapports** : le roulement d'argent du mois (ventes, recharges, argent dans les portefeuilles) avec exports CSV pour Excel. **Réglages** : photo obligatoire ou non, limite de solde négatif, seuil « solde bas », mot de passe du café." },
  { i: "🔔", t: "Notifications", d: "Active-les dans **Réglages** (ou dans le bandeau en haut de l'écran Commandes) : **chaque appareil** reçoit une alerte à chaque nouvelle commande, même app fermée. Sur iPhone/iPad : ajoute d'abord le site à l'écran d'accueil et ouvre-le depuis l'icône." },
];

const FAQ = [
  // ================= tout le monde =================
  { r: "all", q: "Quand le café est-il ouvert ?", a: "Le café sert pendant les périodes de l'école :\n{horaires}\nEn dehors de ces périodes, l'app indique « fermé », mais tu peux **quand même envoyer ta commande** : elle sera préparée à la prochaine période d'ouverture." },
  { r: "all", q: "Comment mettre l'app sur mon téléphone ou mon iPad ?", a: "**iPhone / iPad (Safari)** : touche le bouton Partager, puis « Sur l'écran d'accueil ». Ouvre ensuite l'app depuis cette icône.\n**Android (Chrome)** : menu ⋮, puis « Ajouter à l'écran d'accueil » ou « Installer l'application ».\n**Ordinateur** : l'app fonctionne directement dans le navigateur." },
  { r: "all", q: "J'ai oublié mon mot de passe", a: "Sur la page de connexion, touche **Mot de passe oublié ?**, entre ton courriel : tu reçois un lien (de la part de info@synccrm.ca) pour en choisir un nouveau. Vérifie aussi les courriels indésirables. Le mot de passe doit avoir **au moins 8 caractères**." },
  { r: "all", q: "Comment activer les notifications ?", a: "Touche **🔔 Activer les notifications** (dans **Mon compte**, ou dans le bandeau en haut de l'écran) et accepte la permission. Sur iPhone/iPad, ça ne marche que si tu as d'abord ajouté le site à l'écran d'accueil et que tu l'ouvres depuis l'icône. Si tu as refusé par erreur, autorise-les dans les réglages de ton appareil pour ce site." },
  { r: "all", q: "Je ne reçois pas les notifications", a: "1. Vérifie que tu as bien touché « Autoriser »\n2. Sur iPhone/iPad, ouvre l'app depuis l'**icône de l'écran d'accueil** (pas dans Safari)\n3. Vérifie que les notifications ne sont pas coupées dans les réglages de ton appareil\n4. Déconnecte-toi, reconnecte-toi, puis réactive-les" },
  { r: "all", q: "L'app ne s'affiche pas bien ou semble figée", a: "Ferme complètement l'app (glisse-la hors de la liste des applications) et rouvre-la : elle se met à jour toute seule. Vérifie aussi ta connexion Internet. Si le problème continue, préviens le café." },

  // ================= client =================
  { r: "client", q: "Comment commander une boisson ?", a: "Dans **Commander**, touche la boisson, choisis tes options, **Ajouter au panier**, vérifie ton local et touche **✅ Envoyer la commande**. Tu peux mettre **plusieurs boissons** dans le même panier (**＋ Une autre** copie une boisson)." },
  { r: "client", q: "Quelles boissons et quels sirops sont offerts ?", a: "**Boissons** : {boissons}\n**Sirops** : {sirops}\n**Ajouts gratuits** : lait, crème, sucre, édulcorant (de 0 à 3 chacun) et guimauves. Le chocolat chaud peut être fait **sans produits laitiers**." },
  { r: "client", q: "Combien coûte une boisson ?", a: "Prix des boissons : **{prix}**. Ajouter un **sirop** coûte **{supplement}** de plus. Le lait, la crème, le sucre, l'édulcorant et les guimauves sont gratuits. Le total est affiché dans ton panier avant d'envoyer." },
  { r: "client", q: "C'est quoi « léger » et « prononcé » pour les sirops ?", a: "**Léger** = ½ c. à thé de sirop. **Prononcé** = 1 c. à thé, donc un goût plus fort. Le prix est le même." },
  { r: "client", q: "Où voir mon solde ?", a: "Ton solde est **toujours affiché en haut de l'écran** (le bouton avec le sac d'argent). Touche-le, ou va dans **Mon compte**, pour voir ton historique : recharges, commandes et remboursements." },
  { r: "client", q: "Comment recharger mon portefeuille ?", a: "Tu donnes l'**argent comptant** au café : une personne du café ajoute le montant à ton compte. Ton nouveau solde apparaît tout de suite. Il n'y a pas de paiement par carte dans l'app." },
  { r: "client", q: "Mon solde est négatif, que se passe-t-il ?", a: "Le café te laisse commander **à crédit jusqu'à {decouvert}** de solde négatif. Au-delà, ta commande est refusée jusqu'à ce que tu recharges ton portefeuille. Quand ton solde passe sous **{seuil}**, tu reçois une alerte « Solde bas »." },
  { r: "client", q: "Je veux changer mon local de livraison", a: "Pour **une commande seulement**, modifie le champ « Local / endroit de livraison » dans le panier. Pour changer ton **local par défaut**, va dans **Mon compte**, modifie-le et touche **Enregistrer**." },
  { r: "client", q: "Je préfère aller chercher ma boisson", a: "Dans le panier, choisis **🚶 Je viens la chercher** au lieu de « Livrer à mon local »." },
  { r: "client", q: "Le café est fermé, puis-je commander quand même ?", a: "Oui. Un message t'avertit que le café est fermé : si tu continues, ta commande sera préparée à la **prochaine période d'ouverture**." },
  { r: "client", q: "Pourquoi ma boisson n'est pas encore prête ?", a: "Les élèves préparent les commandes **dans l'ordre d'arrivée**. Regarde **Mes commandes** : « NOUVELLE » = en attente, « COMPLÉTÉE » = prête. Tu reçois une notification quand elle est prête (si tu les as activées). Si le café est fermé, ta commande attend la prochaine période." },
  { r: "client", q: "Comment fonctionne la boisson gratuite ?", a: "Chaque **10 boissons payées**, tu gagnes **1 boisson gratuite**. Dans le panier, coche **🎁 Utiliser ma boisson gratuite** : elle s'applique à la boisson la plus chère du panier (sirop inclus). Ta progression est dans **Mon compte > Fidélité**." },
  { r: "client", q: "Comment refaire la même commande ?", a: "Dans **Mes commandes**, touche **↻ Recommander** sur la commande voulue : elle se copie dans ton panier, tu n'as plus qu'à l'envoyer." },
  { r: "client", q: "Qu'est-ce que le numéro de tasse ?", a: "Le café met ta boisson dans une **tasse numérotée**. Tu vois ce numéro dans **Mes commandes** (et dans la notification « prête ») pour reconnaître ta boisson." },
  { r: "client", q: "Pourquoi ajouter une photo ?", a: "Elle aide les élèves à **te reconnaître quand ils livrent**. Elle est **facultative** : ajoute-la dans **Mon compte > 📷 Ajouter ma photo**, ou demande au café de le faire pour toi." },
  { r: "client", q: "Ma commande a été annulée", a: "Si le café annule une commande, tu es **remboursé automatiquement** dans ton portefeuille (visible dans l'historique de **Mon compte**) et tu reçois une notification." },
  { r: "client", q: "Je me suis trompé dans ma commande", a: "Une fois envoyée, tu ne peux plus la modifier toi-même. **Va voir le café tout de suite** : le staff peut l'annuler (tu es remboursé) et tu en refais une." },
  { r: "client", q: "Comment changer mon nom, mon local ou ma photo ?", a: "Va dans **Mon compte > Mon profil**, modifie le nom ou le local et touche **Enregistrer**. Pour la photo, touche **📷 Changer ma photo**." },

  // ================= staff =================
  { r: "staff", q: "Comment entrer dans l'espace staff ?", a: "Sur la page de connexion, touche **Espace staff** et entre le **mot de passe du café** : c'est le même pour toute l'équipe. Quand tu as fini, touche **Déconnexion** en haut à droite." },
  { r: "staff", q: "Comment changer le mot de passe du café ?", a: "Onglet **Réglages > Mot de passe staff** : entre le nouveau mot de passe (8 caractères minimum) deux fois, puis **Changer le mot de passe**. Pense à le communiquer à l'équipe. Les appareils déjà connectés restent connectés jusqu'à leur déconnexion." },
  { r: "staff", q: "Comment traiter une commande ?", a: "Onglet **Commandes** : touche **＋ Tasse auto** (ou **Choisir…** pour un numéro précis), prépare la boisson, puis **✔ Complétée**. Le client reçoit « Commande prête » avec son numéro de tasse. Les boissons identiques sont regroupées (ex. « 10 × Café »)." },
  { r: "staff", q: "Comment savoir où livrer ?", a: "Sur la carte de la commande : **📍 + le local** si c'est une livraison, ou **Ramassage** si le client vient la chercher. Le **commentaire** du client (s'il y en a un) apparaît aussi, et sa **photo** t'aide à le reconnaître. Il n'y a pas d'étape « livré » : tu touches **✔ Complétée** quand la boisson est prête." },
  { r: "staff", q: "Comment annuler une commande ?", a: "Touche **Annuler** sur la commande, puis confirme. Le client est **remboursé automatiquement** et les tasses redeviennent disponibles. Une commande annulée ne peut pas être remise en route : le client doit en refaire une." },
  { r: "staff", q: "J'ai marqué « Complétée » par erreur", a: "Touche **↩ Remettre en nouvelle** sur la commande complétée (dans la colonne de droite)." },
  { r: "staff", q: "Comment marquer une tasse comme revenue ?", a: "Dans la carte de la commande, touche **Tasse n · retourner**, ou va dans l'onglet **Tasses**, touche la tasse en usage puis **Tasse retournée**." },
  { r: "staff", q: "Combien de tasses avons-nous ?", a: "Il y en a **{tasses}** pour l'instant. Onglet **Tasses** : modifie le **Nombre total de tasses** et touche **Enregistrer**. Impossible de réduire sous le numéro d'une tasse encore en usage." },
  { r: "staff", q: "Comment recharger le portefeuille d'un client ?", a: "Onglet **Clients** > cherche le nom > **＋ Recharger** > choisis ou entre le montant, ajoute une note si tu veux > **Confirmer**. Le nouveau solde s'affiche aussitôt et le client le voit." },
  { r: "staff", q: "Je me suis trompé dans une recharge", a: "Onglet **Clients** > **＋ Recharger** > choisis **− Retirer (correction)**, entre le montant à retirer et confirme. Tout reste visible dans l'**Historique** du client." },
  { r: "staff", q: "Que veut dire « solde bas » ? Et la limite de crédit ?", a: "Un client reçoit l'alerte **« Solde bas »** quand son solde passe sous **{seuil}**. Il peut commander à crédit jusqu'à **{decouvert}** de solde négatif. Filtre **Solde bas** dans **Clients** pour voir qui doit recharger. Les deux montants se règlent dans **Réglages**." },
  { r: "staff", q: "Comment ajouter la photo d'un client ?", a: "Onglet **Clients** > **Profil / photo** > **📷 Ajouter une photo**, puis choisis la photo (appareil photo, galerie ou dossier comme OneDrive). Elle est recadrée en carré automatiquement. Le filtre **Sans photo** liste ceux qui n'en ont pas." },
  { r: "client", q: "Quand suis-je notifié ?", a: "**Ramassage** : dès que le café marque ta commande « prête ». **Livraison** : quand la livraison est marquée **livrée**. Tu es aussi averti si ta commande est annulée ou si ton solde est bas." },
  { r: "staff", q: "Comment fonctionne la livraison (2e groupe) ?", a: "Quand tu touches **✔ Complétée** sur une commande en **livraison**, le groupe livraison reçoit « Café à livrer » et la voit dans son espace (bouton **🛒 Livraison** en haut de l'espace staff). Il touche **✔ Livré** une fois la boisson remise : le client est alors notifié. Tu peux passer du staff à la livraison avec le bouton **🛒 Livraison** (et revenir avec **Espace staff**). Pour un **ramassage**, le client est notifié dès « Complétée » et le groupe livraison ne voit rien. Sur la carte, tu vois « En attente de livraison » ou « Livrée à 10:42 »." },
  { r: "staff", q: "Comment changer le mot de passe du groupe livraison ?", a: "Onglet **Réglages** → carte **Mot de passe livraison** : entre le nouveau mot de passe deux fois puis touche le bouton. Les appareils du groupe livraison sont déconnectés et doivent se reconnecter avec le nouveau mot de passe." },
  { r: "staff", q: "Comment ajouter un nouveau produit ?", a: "Onglet **Menu** → **＋ Nouveau produit**. Écris le nom, touche l'image pour ajouter une photo, entre le prix (le signe $ est devant). Pour proposer des **ajouts au choix du client** (ex. beurre +0,50 $), touche **＋ Ajouter un ajout** et entre son nom et son prix. Coche **Produit simple** si le produit n'a ni sirop ni lait/sucre (ex. un muffin). Termine par **💾 Enregistrer le menu**." },
  { r: "staff", q: "Une commande a plusieurs boissons : comment attribuer les tasses ?", a: "Il faut **une tasse par boisson**. Sous la commande tu vois « Tasses : 2 / 5 boissons ». Touche **＋ Tasse auto** pour en ajouter une, ou **＋ Toutes les tasses** pour attribuer d'un coup toutes celles qui manquent. **Choisir…** permet de prendre un numéro précis." },
  { r: "staff", q: "Comment voir un ajout en plus gros ?", a: "Dans une commande, **touche la pastille de l'ajout** (sirop, lait, sucre, guimauves, ajout du menu…) : le pictogramme et le nom s'affichent en grand." },
  { r: "staff", q: "Comment changer un prix ou masquer une boisson ?", a: "Onglet **Menu** : modifie le prix (en dollars) ou décoche **Offert** pour masquer une boisson ou un sirop, puis touche **💾 Enregistrer le menu**. Le **supplément de sirop** (actuellement {supplement}) se règle aussi dans cet onglet." },
  { r: "staff", q: "Comment régler les heures d'ouverture ?", a: "Onglet **Horaires** : touche les périodes (P1 à P6) ouvertes pour chaque jour (enregistré tout de suite). Les **heures de chaque période** se règlent dans la carte de droite, puis **Enregistrer**. Actuellement :\n{horaires}" },
  { r: "staff", q: "Comment voir l'argent qui entre et qui sort ?", a: "Onglet **Rapports** : choisis le mois. Tu vois les **ventes** (argent dépensé en boissons), les **recharges encaissées** (argent comptant reçu), les remboursements et l'**argent encore dans les portefeuilles** (ce que le café doit aux clients). Deux boutons exportent en CSV (ouvrable dans Excel) : le résumé par jour et le détail de chaque mouvement." },
  { r: "staff", q: "Comment exporter les commandes du jour ?", a: "Onglet **Commandes** : choisis la date, puis **⬇ Exporter CSV**. Le fichier s'ouvre dans Excel." },
  { r: "staff", q: "Un client a oublié son mot de passe", a: "Dis-lui de toucher **Mot de passe oublié ?** sur la page de connexion : il reçoit un lien par courriel pour en choisir un nouveau. Le staff ne peut pas le faire à sa place." },
  { r: "staff", q: "Qui reçoit les notifications ?", a: "**Chaque appareil** où quelqu'un a touché « Activer les notifications » dans l'espace staff reçoit les nouvelles commandes. Chaque client reçoit les siennes (commande prête ou annulée, solde bas). Pour ajouter un appareil, connecte-le au staff et active les notifications." },
  { r: "staff", q: "Qu'est-ce que « Photo de profil obligatoire » dans les réglages ?", a: "Si c'est coché, un client **sans photo ne peut pas commander** jusqu'à ce qu'il (ou le café) en ajoute une. Actuellement, la photo est **{photo}**." },
];

const SUGG_CLIENT = ["Comment recharger mon portefeuille ?", "Quand le café est-il ouvert ?", "Comment fonctionne la boisson gratuite ?"];
const SUGG_STAFF = ["Comment recharger un client ?", "Comment annuler une commande ?", "Comment voir le rapport du mois ?"];

/* ---------- valeurs réelles tirées des réglages du café ---------- */
function helpVars() {
  const s = State.settings, m = (s && s.menu) || { drinks: [], syrups: [] };
  const offered = (m.drinks || []).filter((d) => d.available !== false);
  const prices = [...new Set(offered.map((d) => d.priceCents))].sort((a, b) => a - b);
  const hm = (v) => { const x = /^(\d{1,2}):(\d{2})/.exec(String(v || "")); return x ? `${Number(x[1])} h ${x[2]}` : null; };
  const periods = ((s && s.periods) || []).filter((p) => hm(p.start) && hm(p.end));
  const days = { mon: "lundi", tue: "mardi", wed: "mercredi", thu: "jeudi", fri: "vendredi" };
  let horaires = "heures pas encore précisées : le café accepte les commandes en tout temps";
  if (periods.length && s.hours) {
    const label = (p) => `${p.k} : ${hm(p.start)} à ${hm(p.end)}`;
    const sets = Object.keys(days).map((d) => (s.hours[d] || []).join(","));
    const same = sets.every((x) => x === sets[0]);
    if (same) {
      const open = periods.filter((p) => (s.hours.mon || []).includes(p.k));
      horaires = "Du lundi au vendredi\n" + (open.length ? open.map(label).join("\n") : "(aucune période ouverte pour le moment)");
    } else {
      horaires = Object.entries(days).map(([d, n]) => `${n.charAt(0).toUpperCase() + n.slice(1)} : ` + (periods.filter((p) => (s.hours[d] || []).includes(p.k)).map((p) => `${p.k} (${hm(p.start)}–${hm(p.end)})`).join(", ") || "fermé")).join("\n");
    }
  }
  return {
    prix: !prices.length ? "affichés sur chaque boisson" : prices.length === 1 ? money(prices[0]) : `de ${money(prices[0])} à ${money(prices[prices.length - 1])}`,
    supplement: money((m.syrupSurchargeCents != null ? m.syrupSurchargeCents : 50)),
    boissons: offered.map((d) => d.name).join(", ") || "voir l'écran Commander",
    sirops: (m.syrups || []).filter((x) => x.available !== false).map((x) => x.name).join(", ") || "voir l'écran Commander",
    seuil: money(s ? s.low_balance_cents : 400),
    decouvert: money(s ? s.credit_limit_cents : 1000),
    tasses: s ? String(s.cup_count) : "plusieurs",
    photo: s && s.require_photo ? "obligatoire" : "facultative",
    horaires,
  };
}
function fillVars(text) { const v = helpVars(); return String(text).replace(/\{(\w+)\}/g, (_m, k) => (k in v ? v[k] : "")); }

/* ---------- rendu sûr du mini-balisage ---------- */
function mdNodes(text) {
  const frag = document.createDocumentFragment();
  fillVars(text).split("**").forEach((part, i) => { if (!part) return; frag.appendChild(i % 2 ? h("b", {}, part) : document.createTextNode(part)); });
  return frag;
}
const mdEl = (cls, text) => { const d = h("div", { class: cls }); d.appendChild(mdNodes(text)); return d; };

const Help = { tab: "guide", chat: [], busy: false, introIdx: 0 };
const helpIsStaff = () => !!(State.profile && State.profile.is_staff);
const helpGuide = () => (helpIsStaff() ? GUIDE_STAFF : GUIDE_CLIENT);

function openHelp(tab) {
  Help.tab = tab || Help.tab || "guide";
  const body = h("div", { id: "helpBody" });
  const tabs = h("div", { class: "htabs" }, [["guide", "📖 Guide"], ["faq", "❓ FAQ"], ["chat", "💬 Assistant"]].map(([k, l]) =>
    h("button", { class: "htab" + (Help.tab === k ? " on" : ""), type: "button", onClick: () => openHelp(k) }, l)));
  openSheet("Aide", [tabs, body]);
  ({ guide: renderHelpGuide, faq: renderHelpFaq, chat: renderHelpChat })[Help.tab](body);
}

function renderHelpGuide(body) {
  helpGuide().forEach((s, i) => body.appendChild(h("div", { class: "gstep" }, [
    h("div", { class: "gnum" }, String(i + 1)),
    h("div", {}, [h("div", { class: "gt" }, s.i + " " + s.t), mdEl("gd", s.d)]),
  ])));
  body.appendChild(h("div", { style: "margin-top:10px" }, h("button", { class: "btn sm", type: "button", onClick: () => { closeSheet(); showIntro(true); } }, "▶ Revoir la visite guidée")));
}

function renderHelpFaq(body) {
  const role = helpIsStaff() ? "staff" : "client";
  const items = FAQ.filter((f) => f.r === "all" || f.r === role);
  const list = h("div", { class: "faqList" });
  const nodes = items.map((f) => {
    const d = h("details", {}, [h("summary", {}, f.q), mdEl("", f.a)]);
    d.dataset.s = normKey(f.q + " " + fillVars(f.a).replace(/\*/g, ""));
    list.appendChild(d); return d;
  });
  const search = h("input", { type: "search", placeholder: "🔍 Chercher une question…", style: "margin-bottom:10px", onInput: (e) => {
    const q = normKey(e.target.value);
    nodes.forEach((d) => { d.style.display = !q || d.dataset.s.includes(q) ? "" : "none"; });
  } });
  body.appendChild(search); body.appendChild(list);
  body.appendChild(h("p", { class: "muted small", style: "margin-top:8px" }, ["Pas trouvé ta réponse ? Essaie l'onglet ", h("b", {}, "💬 Assistant"), "."]));
}

/* ---------- assistant IA ---------- */
function renderHelpChat(body) {
  body.innerHTML = "";
  if (!State.session) {
    body.appendChild(h("p", { class: "muted" }, "Connecte-toi pour poser une question à l'assistant. En attendant, le Guide et la FAQ répondent à la plupart des questions."));
    return;
  }
  const chat = h("div", { class: "chat", id: "chat" });
  const sugg = helpIsStaff() ? SUGG_STAFF : SUGG_CLIENT;
  if (!Help.chat.length) {
    chat.appendChild(h("div", { class: "bub a" }, `Salut ${(State.profile && State.profile.name ? State.profile.name.split(" ")[0] : "")} 👋 Pose-moi une question sur le fonctionnement du café.`));
    chat.appendChild(h("div", { class: "chips" }, sugg.map((q) => h("button", { class: "chipq", type: "button", onClick: () => helpSend(q) }, q))));
  } else {
    Help.chat.forEach((m) => chat.appendChild(h("div", { class: "bub " + (m.role === "user" ? "u" : "a") }, m.content)));
    if (Help.busy) chat.appendChild(h("div", { class: "bub a" }, "…"));
  }
  const input = h("input", { id: "chatQ", maxlength: "400", placeholder: "Pose ta question…", onKeydown: (e) => { if (e.key === "Enter") helpSend(); } });
  body.appendChild(chat);
  body.appendChild(h("div", { class: "chatIn" }, [input, h("button", { class: "btn primary", type: "button", disabled: Help.busy, onClick: () => helpSend() }, "Envoyer")]));
  body.appendChild(h("p", { class: "muted small", style: "margin-top:6px" }, "Assistant IA : il peut se tromper, et ne partage pas d'informations personnelles dans ta question. En cas de doute, demande au café."));
  chat.scrollTop = chat.scrollHeight;
}

async function helpSend(preset) {
  if (Help.busy) return;
  const input = $("#chatQ");
  const q = String(preset || (input && input.value) || "").trim();
  if (!q) return;
  Help.chat.push({ role: "user", content: q });
  Help.busy = true; refreshHelpChat();
  let reply;
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 32000);
  try {
    const { data } = await sb.auth.getSession();
    const token = data && data.session && data.session.access_token;
    if (!token) throw new Error("NO_SESSION");
    const call = async () => {
      const res = await fetch("/api/help", {
        method: "POST", signal: ctl.signal,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ messages: Help.chat }),
      });
      return { res, j: await res.json().catch(() => null) };
    };
    let { res, j } = await call();
    if (!j || res.status >= 500) { await new Promise((r) => setTimeout(r, 1200)); ({ res, j } = await call()); }  // 2e essai automatique
    j = j || {};
    if (res.ok && j.reply) reply = j.reply;
    else if (j.error === "not_configured") reply = "L'assistant n'est pas encore activé. Consulte le Guide et la FAQ, ou demande au café.";
    else reply = j.error || "Désolé, l'assistant ne répond pas pour le moment.";
  } catch (e) {
    reply = e && e.name === "AbortError" ? "L'assistant met trop de temps à répondre. Réessaie dans un instant ou consulte la FAQ."
      : e && e.message === "NO_SESSION" ? "Ta session a expiré. Reconnecte-toi pour utiliser l'assistant."
      : "Pas de connexion. Vérifie ton réseau et réessaie.";
  }
  clearTimeout(to);
  Help.chat.push({ role: "assistant", content: reply });
  Help.busy = false; refreshHelpChat();
}
function refreshHelpChat() { const b = $("#helpBody"); if (b && Help.tab === "chat") renderHelpChat(b); }

/* ---------- visite guidée (première connexion, une fois par appareil et par compte) ---------- */
let _introFor = null; // identifiant du compte pour lequel la visite a déjà été vérifiée (change si on se reconnecte avec un autre compte)
function introKey() { return "vd_intro_" + (State.profile ? State.profile.id : "anon"); }
function maybeShowIntro() {
  if (!State.profile || State.profile.is_delivery || _introFor === State.profile.id || isSheetOpen()) return;
  _introFor = State.profile.id;
  let seen = false; try { seen = !!localStorage.getItem(introKey()); } catch (_e) {}
  if (!seen) { Help.introIdx = 0; renderIntro(); }
}
function showIntro(force) { if (force || !isSheetOpen()) { Help.introIdx = 0; renderIntro(); } }
function renderIntro() {
  const g = helpGuide(); const s = g[Help.introIdx]; const last = Help.introIdx === g.length - 1;
  const done = () => { try { localStorage.setItem(introKey(), "1"); } catch (_e) {} closeSheet(); };
  openSheet("Visite guidée", h("div", { class: "slide" }, [
    h("div", { class: "big" }, s.i), h("h3", { style: "margin:8px 0 10px" }, s.t), mdEl("gd", s.d),
    h("div", { class: "dotsP" }, g.map((_, i) => h("div", { class: "dotP" + (i === Help.introIdx ? " on" : "") }))),
    h("div", { class: "row end", style: "margin-top:14px" }, [
      h("button", { class: "btn", type: "button", onClick: done }, last ? "Fermer" : "Passer"),
      h("button", { class: "btn primary", type: "button", onClick: () => { if (last) done(); else { Help.introIdx++; renderIntro(); } } }, last ? "Commencer ✔" : "Suivant ›"),
    ]),
  ]), { onClose: () => { try { localStorage.setItem(introKey(), "1"); } catch (_e) {} } });
}
