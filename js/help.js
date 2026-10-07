/* =========================================================
   AIDE INTÉGRÉE : visite guidée + guide + FAQ + assistant IA
   (le contenu est écrit par nous ; **gras** et retours à la ligne uniquement, jamais de HTML)
========================================================= */

const GUIDE_CLIENT = [
  { i: "☕", t: "Bienvenue au Café Vent de douceurs", d: "Commande ta boisson chaude ou froide **depuis ton téléphone, ton iPad ou ton ordinateur**. Elle est préparée par les élèves du café, puis **livrée dans ton local** ou prête à ramasser." },
  { i: "🛒", t: "Commander", d: "1. Dans **Commander**, touche une boisson\n2. Choisis un **sirop** si tu veux (+0,50 $) : léger (½ c. à thé) ou prononcé (1 c. à thé)\n3. Ajoute lait, crème, sucre, édulcorant (de 0 à 3) et des guimauves\n4. **Ajouter au panier**, puis vérifie ton local\n5. Touche **Envoyer la commande**" },
  { i: "💰", t: "Ton portefeuille", d: "Tu **recharges au café, en argent comptant**. Chaque commande est déduite automatiquement et ton solde est toujours visible en haut. Le café peut te permettre un petit solde négatif : tu seras averti quand ton solde devient bas." },
  { i: "🎁", t: "Fidélité : 10 + 1", d: "Après **10 boissons payées, la suivante est gratuite**. Ta progression est dans **Mon compte**. Quand tu as une boisson gratuite, une case apparaît dans ton panier." },
  { i: "🔔", t: "Suivre ta commande", d: "Dans **Mes commandes**, tu vois le statut et le **numéro de ta tasse**. Active les **notifications** dans **Mon compte** pour être averti quand ta boisson est prête (sur iPhone/iPad : ajoute d'abord le site à l'écran d'accueil)." },
];

const GUIDE_STAFF = [
  { i: "🧾", t: "Bienvenue dans l'espace staff", d: "Ici, le café reçoit les commandes, prépare, livre et gère les portefeuilles. Tout est dans **7 onglets** en haut de l'écran." },
  { i: "🥤", t: "Commandes et tasses", d: "Les **nouvelles commandes** arrivent toutes seules (avec la photo, le local et les pictogrammes de chaque ajout). Touche **＋ Tasse auto** pour attribuer une tasse numérotée, puis **✔ Complétée** quand c'est prêt : le client est averti. Quand la tasse revient, touche-la (**Tasse n · retourner**) ou va dans l'onglet **Tasses**." },
  { i: "💰", t: "Clients et portefeuilles", d: "Onglet **Clients** : cherche quelqu'un, touche **＋ Recharger** (5, 10, 20 ou 50 $, ou un autre montant) quand il donne de l'argent. **Profil / photo** pour ajouter sa photo, **Historique** pour voir tous ses mouvements. Une erreur ? Utilise **− Retirer (correction)**." },
  { i: "📋", t: "Menu, horaires, rapports", d: "**Menu** : prix, boissons ou sirops offerts ou non. **Horaires** : les périodes d'ouverture. **Rapports** : le roulement d'argent du mois (ventes, recharges, argent dans les portefeuilles) avec exports CSV pour Excel." },
  { i: "🔔", t: "Notifications", d: "Active les **notifications** dans **Réglages** (ou dans le bandeau en haut de l'écran Commandes) : chaque appareil reçoit une alerte à chaque nouvelle commande, même app fermée. Sur iPhone/iPad : ajoute d'abord le site à l'écran d'accueil." },
];

const FAQ = [
  // ----- tout le monde -----
  { r: "all", q: "Comment mettre l'app sur mon téléphone ou mon iPad ?", a: "**iPhone / iPad (Safari)** : touche le bouton Partager, puis « Sur l'écran d'accueil ». Ouvre ensuite l'app depuis cette icône.\n**Android (Chrome)** : menu ⋮, puis « Ajouter à l'écran d'accueil » ou « Installer l'application ».\n**Ordinateur** : l'app fonctionne directement dans le navigateur." },
  { r: "all", q: "J'ai oublié mon mot de passe", a: "Sur la page de connexion, touche **Mot de passe oublié ?**, entre ton courriel : tu reçois un lien pour en choisir un nouveau (vérifie aussi les courriels indésirables). Le mot de passe doit avoir **au moins 8 caractères**." },
  { r: "all", q: "Comment activer les notifications ?", a: "Touche **🔔 Activer les notifications** (dans **Mon compte**, ou dans le bandeau en haut) et accepte la permission. Sur iPhone/iPad, ça ne marche que si tu as d'abord ajouté le site à l'écran d'accueil et que tu l'ouvres depuis l'icône. Si tu as refusé par erreur, autorise-les dans les réglages de ton appareil pour ce site." },
  { r: "all", q: "Je ne reçois pas les notifications", a: "1. Vérifie que tu as bien touché « Autoriser »\n2. Sur iPhone/iPad, ouvre l'app depuis l'**icône de l'écran d'accueil** (pas dans Safari)\n3. Vérifie que les notifications ne sont pas coupées dans les réglages de ton appareil\n4. Déconnecte-toi, reconnecte-toi, puis réactive-les" },
  // ----- client -----
  { r: "client", q: "Comment commander une boisson ?", a: "Dans **Commander**, touche la boisson, choisis tes options, **Ajouter au panier**, vérifie ton local et touche **✅ Envoyer la commande**. Tu peux mettre plusieurs boissons dans le même panier." },
  { r: "client", q: "Combien coûte une boisson ?", a: "Le prix est affiché sur chaque boisson (2 $ au lancement). Ajouter un **sirop** coûte **0,50 $** de plus. Lait, crème, sucre, édulcorant et guimauves sont gratuits." },
  { r: "client", q: "C'est quoi « léger » et « prononcé » pour les sirops ?", a: "**Léger** = ½ c. à thé de sirop. **Prononcé** = 1 c. à thé, donc un goût plus fort. Le prix est le même." },
  { r: "client", q: "Comment recharger mon portefeuille ?", a: "Tu donnes l'argent comptant au café : une personne du café ajoute le montant à ton compte. Ton nouveau solde apparaît tout de suite en haut de l'écran et dans **Mon compte**." },
  { r: "client", q: "Mon solde est négatif, que se passe-t-il ?", a: "Le café permet de commander **à crédit jusqu'à une petite limite** (fixée par le café). Ton solde peut donc devenir négatif. Passe au café recharger ton portefeuille : une fois la limite atteinte, tu ne peux plus commander avant d'avoir rechargé." },
  { r: "client", q: "Je veux changer mon local de livraison", a: "Pour **une commande**, modifie le champ « Local / endroit de livraison » dans le panier. Pour changer ton **local par défaut**, va dans **Mon compte**, modifie-le et touche **Enregistrer**." },
  { r: "client", q: "Je préfère aller chercher ma boisson", a: "Dans le panier, choisis **🚶 Je viens la chercher** au lieu de « Livrer à mon local »." },
  { r: "client", q: "Le café est fermé, puis-je commander quand même ?", a: "Oui. Un message t'avertit que le café est fermé : si tu continues, ta commande sera préparée à la **prochaine période d'ouverture**." },
  { r: "client", q: "Comment fonctionne la boisson gratuite ?", a: "Chaque **10 boissons payées**, tu gagnes **1 boisson gratuite**. Dans le panier, coche **🎁 Utiliser ma boisson gratuite** : elle s'applique à la boisson la plus chère du panier. Ta progression est dans **Mon compte > Fidélité**." },
  { r: "client", q: "Comment refaire la même commande ?", a: "Dans **Mes commandes**, touche **↻ Recommander** sur la commande voulue : elle se copie dans ton panier, tu n'as plus qu'à l'envoyer." },
  { r: "client", q: "Qu'est-ce que le numéro de tasse ?", a: "Le café met ta boisson dans une **tasse numérotée**. Tu vois ce numéro dans **Mes commandes** (et dans la notification) pour reconnaître ta boisson." },
  { r: "client", q: "Pourquoi ajouter une photo ?", a: "Elle aide les élèves à **te reconnaître à la livraison**. Elle est facultative : tu peux l'ajouter dans **Mon compte > 📷 Ajouter ma photo**, ou le café peut le faire pour toi." },
  { r: "client", q: "Ma commande a été annulée", a: "Si le café annule une commande, tu es **remboursé automatiquement** dans ton portefeuille (tu le vois dans l'historique de **Mon compte**) et tu reçois une notification." },
  { r: "client", q: "Je me suis trompé dans ma commande", a: "Une fois envoyée, la commande ne peut plus être modifiée par toi. **Va voir tout de suite le café** : le staff peut l'annuler (tu es remboursé) et tu peux en refaire une." },
  // ----- staff -----
  { r: "staff", q: "Comment entrer dans l'espace staff ?", a: "Sur la page de connexion, touche **Espace staff** et entre le **mot de passe du café**. C'est le même pour tout le monde du café." },
  { r: "staff", q: "Comment changer le mot de passe du café ?", a: "Onglet **Réglages > Mot de passe staff** : entre le nouveau mot de passe (8 caractères minimum) deux fois, puis **Changer le mot de passe**. Pense à le communiquer à l'équipe. Les appareils déjà connectés restent connectés." },
  { r: "staff", q: "Comment traiter une commande ?", a: "Onglet **Commandes** : touche **＋ Tasse auto** (ou **Choisir…** pour un numéro précis), prépare la boisson, puis **✔ Complétée**. Le client reçoit une notification « Commande prête » avec son numéro de tasse." },
  { r: "staff", q: "Comment annuler une commande ?", a: "Touche **Annuler** sur la commande, puis confirme. Le client est **remboursé automatiquement** et les tasses reviennent disponibles. Une commande annulée ne peut pas être remise en route." },
  { r: "staff", q: "Comment marquer une tasse comme revenue ?", a: "Dans la carte de la commande, touche **Tasse n · retourner**, ou va dans l'onglet **Tasses** et touche la tasse en usage, puis **Tasse retournée**." },
  { r: "staff", q: "Combien de tasses avons-nous ?", a: "Onglet **Tasses** : modifie le **Nombre total de tasses** et touche **Enregistrer**. Impossible de réduire sous le numéro d'une tasse encore en usage." },
  { r: "staff", q: "Comment recharger le portefeuille d'un client ?", a: "Onglet **Clients** > cherche le nom > **＋ Recharger** > choisis ou entre le montant, ajoute une note si tu veux > **Confirmer**. Le nouveau solde s'affiche aussitôt." },
  { r: "staff", q: "Je me suis trompé dans une recharge", a: "Onglet **Clients** > **＋ Recharger** > choisis **− Retirer (correction)**, entre le montant à retirer et confirme. Tout reste visible dans l'**Historique** du client." },
  { r: "staff", q: "Comment ajouter la photo d'un client ?", a: "Onglet **Clients** > **Profil / photo** > **📷 Ajouter une photo**, puis choisis la photo (depuis l'appareil photo, la galerie ou un dossier comme OneDrive). Elle est recadrée en carré automatiquement." },
  { r: "staff", q: "Comment changer un prix ou masquer une boisson ?", a: "Onglet **Menu** : modifie le prix (en dollars) ou décoche **Offert** pour masquer une boisson ou un sirop, puis touche **💾 Enregistrer le menu**. Le supplément de sirop se règle aussi dans cet onglet." },
  { r: "staff", q: "Comment régler les heures d'ouverture ?", a: "Onglet **Horaires** : touche les périodes (P1 à P6) ouvertes pour chaque jour (enregistré tout de suite). Les **heures de chaque période** se règlent dans la carte de droite, puis **Enregistrer**. Hors des périodes ouvertes, les clients voient « fermé » mais peuvent quand même commander pour la prochaine ouverture." },
  { r: "staff", q: "Comment voir l'argent qui entre et qui sort ?", a: "Onglet **Rapports** : choisis le mois. Tu vois les **ventes**, les **recharges encaissées**, les remboursements et l'**argent encore dans les portefeuilles**. Deux boutons exportent en CSV (ouvrable dans Excel) : le résumé par jour et le détail de chaque mouvement." },
  { r: "staff", q: "Que veut dire « solde bas » ?", a: "Un client passe en « solde bas » sous un seuil fixé par le café (4 $ au lancement). Il reçoit alors une notification. Tu peux voir ces clients avec le filtre **Solde bas** dans **Clients**. Le seuil et le **découvert maximal** se règlent dans **Réglages**." },
  { r: "staff", q: "Un client a oublié son mot de passe", a: "Dis-lui de toucher **Mot de passe oublié ?** sur la page de connexion : il reçoit un lien par courriel pour en choisir un nouveau. Le staff ne peut pas le faire à sa place." },
  { r: "staff", q: "Comment exporter les commandes du jour ?", a: "Onglet **Commandes** : choisis la date, puis **⬇ Exporter CSV**. Le fichier s'ouvre dans Excel." },
];

const SUGG_CLIENT = ["Comment recharger mon portefeuille ?", "Comment fonctionne la boisson gratuite ?", "Je ne reçois pas les notifications"];
const SUGG_STAFF = ["Comment recharger un client ?", "Comment annuler une commande ?", "Comment voir le rapport du mois ?"];

/* ---------- rendu sûr du mini-balisage ---------- */
function mdNodes(text) {
  const frag = document.createDocumentFragment();
  String(text).split("**").forEach((part, i) => { if (!part) return; frag.appendChild(i % 2 ? h("b", {}, part) : document.createTextNode(part)); });
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
    d.dataset.s = normKey(f.q + " " + f.a.replace(/\*/g, ""));
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
    const res = await fetch("/api/help", {
      method: "POST", signal: ctl.signal,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ messages: Help.chat }),
    });
    const j = await res.json().catch(() => ({}));
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
let _introChecked = false;
function introKey() { return "vd_intro_" + (State.profile ? State.profile.id : "anon"); }
function maybeShowIntro() {
  if (_introChecked || !State.profile || isSheetOpen()) return;
  _introChecked = true;
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
