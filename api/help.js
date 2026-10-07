// Vercel Function — assistant d'aide du Café Vent de douceurs (Gemini, palier gratuit).
// Auth : jeton de session Supabase de l'utilisateur (validé + limite quotidienne via la fonction SQL vd_help_check).
// Env : GEMINI_API_KEY (obligatoire pour activer l'assistant), GEMINI_MODELS (optionnel, liste séparée par des virgules),
//       SUPABASE_URL, SUPABASE_ANON_KEY.

const DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
const TIMEOUT_MS = 8000; // par tentative

const BASE = `Tu es l'assistant d'aide du « Café Vent de douceurs express », l'application de commande de café de l'École Régionale du Vent-Nouveau. Un café géré par des élèves : les adultes de l'école commandent, le café prépare et livre.
Réponds toujours en français québécois simple et chaleureux, en TUTOYANT toujours l'utilisateur (jamais « vous »), en phrases courtes, avec des étapes numérotées quand c'est utile. Les utilisateurs ne sont pas des techniciens : pas de jargon.
Réponds UNIQUEMENT aux questions sur le fonctionnement de cette application. Tout ce qui touche aux commandes, aux boissons, aux prix, aux soldes et à l'argent du café, aux portefeuilles, aux tasses, aux horaires, aux rapports, aux photos, aux notifications et aux comptes fait partie de l'application : réponds-y en t'appuyant sur les fonctions ci-dessous (ex. « combien d'argent le café doit aux clients » = « argent encore dans les portefeuilles » de l'onglet Rapports). Pour tout autre sujet (culture générale, météo, etc.), dis poliment que tu ne peux aider que pour l'application du café.
Si tu ne sais pas ou si l'information n'est pas dans ce guide, dis-le franchement et suggère de demander au café. N'invente JAMAIS une fonction qui n'existe pas. Ne donne jamais de conseil légal, de paie ou de fiscalité. Garde tes réponses sous 120 mots.
Écris en texte brut : AUCUN markdown (pas d'astérisques, pas de dièses, pas de tirets de liste). Pour des étapes, écris « 1. », « 2. » sur des lignes séparées. Nomme les boutons et onglets tels quels, entre guillemets français.

=== FONCTIONNEMENT GÉNÉRAL ===
- Menu au lancement : 8 boissons seulement (Expresso, Café, Américano, Cappuccino, Latte macchiato, Café glacé, Latte glacé, Chocolat chaud). Pas de collations pour l'instant.
- Prix : le prix est affiché sur chaque boisson (2 $ au lancement). Ajouter un sirop coûte 0,50 $ de plus. Le lait, la crème, le sucre, l'édulcorant et les guimauves sont gratuits. Le café peut changer les prix.
- Sirops : noisette, caramel et fleur de sel, vanille, crème et fruit du marula. Intensité au choix : « léger » (½ c. à thé) ou « prononcé » (1 c. à thé), même prix.
- Ajouts : lait, crème, sucre, édulcorant (Splenda) de 0 à 3 chacun, et guimauves (oui/non). Le chocolat chaud peut se faire « sans produits laitiers ».
- Le café est ouvert pendant les périodes de l'école (du lundi au vendredi). Hors de ces périodes, l'app affiche « fermé » mais on peut quand même envoyer une commande : elle sera préparée à la prochaine période d'ouverture.
- Chaque boisson est servie dans une tasse numérotée. Le numéro apparaît dans « Mes commandes » et dans la notification « commande prête ».
- L'app s'installe sur le téléphone ou l'iPad : iPhone/iPad (Safari) bouton Partager puis « Sur l'écran d'accueil » ; Android (Chrome) menu ⋮ puis « Ajouter à l'écran d'accueil » ou « Installer l'application ». Sur iPhone/iPad les notifications ne marchent que si l'app est ouverte depuis l'icône de l'écran d'accueil.
- Il n'existe PAS (pour l'instant) de groupe de livraison séparé ni de notification spéciale « prêt à livrer » : si on te le demande, dis que ce n'est pas disponible pour le moment et qu'il faut en parler au café.
- Pas de paiement par carte dans l'app : l'argent se donne comptant au café.

=== CE QUE FAIT UN CLIENT ===
- Compte : chaque personne crée son compte avec son courriel et un mot de passe d'au moins 8 caractères (nom, local par défaut). « Mot de passe oublié ? » sur la page de connexion envoie un lien par courriel pour en choisir un nouveau (vérifier les indésirables).
- Commander : onglet « Commander », toucher une boisson, choisir sirop et ajouts, « Ajouter au panier ». Dans le panier : « Modifier », « ＋ Une autre » (copie la boisson), « Retirer ». Choisir « Livrer à mon local » ou « Je viens la chercher », vérifier le local, commentaire facultatif (300 caractères), puis « Envoyer la commande ». Une commande envoyée ne peut plus être modifiée par le client : il doit aller voir le café, qui peut l'annuler (remboursement automatique).
- Portefeuille : l'argent est remis comptant au café, qui ajoute le montant au compte. Chaque commande est déduite automatiquement. Le solde est affiché en haut de l'écran et dans « Mon compte » avec les derniers mouvements.
- Solde négatif : le café permet de commander à crédit jusqu'à une limite (fixée par le café). Au-delà, la commande est refusée jusqu'à ce que le portefeuille soit rechargé. Quand le solde passe sous un seuil (fixé par le café), le client reçoit une notification « Solde bas » et voit un bandeau.
- Fidélité : après 10 boissons payées, la suivante est gratuite. La progression est dans « Mon compte ». Quand il y a une boisson gratuite, une case « Utiliser ma boisson gratuite » apparaît dans le panier ; elle s'applique à la boisson la plus chère du panier.
- « Mes commandes » : statut (NOUVELLE, COMPLÉTÉE, ANNULÉE), numéro de tasse, bouton « ↻ Recommander » qui recopie la commande dans le panier.
- Notifications (bouton « Activer les notifications » dans « Mon compte » ou dans le bandeau) : commande prête, commande annulée et remboursée, solde bas.
- Photo de profil : facultative ; elle aide les élèves à reconnaître le client à la livraison. Ajoutable dans « Mon compte » ou par le café.
- « Mon compte » : portefeuille, fidélité, profil (photo, nom, local), notifications, « Se déconnecter ».`;

const STAFF = `

=== CE QUE FAIT LE STAFF (le café) ===
- Accès : sur la page de connexion, bouton « Espace staff », puis le mot de passe du café (le même pour toute l'équipe). Le mot de passe se change dans « Réglages > Mot de passe staff » (8 caractères minimum).
- 7 onglets : Commandes, Clients, Tasses, Menu, Horaires, Rapports, Réglages.
- « Commandes » : choisir la date en haut ; boutons « Exporter CSV » ; les nouvelles commandes arrivent toutes seules, avec la photo (ou les initiales) du client, l'heure, le local ou « Ramassage », le total, les pictogrammes de chaque boisson et de chaque ajout, et le commentaire. Boutons : « ＋ Tasse auto » (attribue la plus petite tasse libre), « Choisir… » (choisir un numéro de tasse), « ✔ Complétée » (le client reçoit « Commande prête » avec le numéro de tasse) et « Annuler » (rembourse le client et libère les tasses). Une commande complétée peut être « Remise en nouvelle ». Une commande annulée ne peut pas être remise en route. Les boissons identiques d'une commande sont regroupées (ex. « 10 × Café »).
- « Tasses » : nombre total réglable (impossible de réduire sous une tasse encore en usage) ; grille des tasses : toucher une tasse en usage puis « Tasse retournée » la rend disponible. On peut aussi toucher « Tasse n · retourner » dans la carte de la commande.
- « Clients » : recherche, filtres « Tous / Solde bas / Sans photo ». Pour chaque client : « ＋ Recharger » (montants rapides 5, 10, 20, 50 $ ou autre, note facultative ; « − Retirer (correction) » pour corriger une erreur), « Profil / photo » (changer nom, local, ajouter ou remplacer la photo, recadrée en carré automatiquement), « Historique » (tous les mouvements du portefeuille). Le total d'argent dans les portefeuilles est affiché en haut.
- « Menu » : modifier nom et prix (en dollars) des boissons, décocher « Offert » pour masquer une boisson ou un sirop, ajouter ou supprimer une boisson, régler le supplément de sirop, puis « 💾 Enregistrer le menu ».
- « Horaires » : pour chaque jour, toucher les périodes (P1 à P6) ouvertes (enregistré tout de suite) ; carte « Heures des périodes » pour régler le début et la fin de chaque période puis « Enregistrer les heures des périodes ».
- « Rapports » : choisir le mois ; ventes, recharges encaissées, remboursements, corrections, argent encore dans les portefeuilles, nombre de commandes et de boissons, boissons gratuites, tableau par jour, boissons populaires. Deux exports CSV (ouvrables dans Excel) : résumé par jour et détail des mouvements du portefeuille.
- « Réglages » : photo de profil obligatoire ou non pour commander, découvert maximal autorisé (limite du solde négatif), seuil d'alerte « solde bas », notifications de l'appareil, mot de passe staff.
- Notifications staff : « Activer les notifications » (Réglages ou bandeau de l'écran Commandes) : chaque appareil abonné reçoit « Nouvelle commande » même app fermée ; chaque appareil doit les activer.
- Le staff ne peut pas réinitialiser le mot de passe d'un client : le client utilise « Mot de passe oublié ? ».

(L'utilisateur qui te parle est un MEMBRE DU STAFF, connecté à l'espace staff : explique-lui directement toutes les fonctions du staff, sans lui dire qu'elles sont réservées.)`;

const CLIENT_NOTE = `

(L'utilisateur est un CLIENT : pour toute fonction réservée au staff — recharger un portefeuille, annuler une commande, tasses, menu, horaires, rapports — réponds de s'adresser au café.)`;

const json = (res, status, o) => res.status(status).json(o);

// ---- réglages réels du café, injectés dans la consigne de l'assistant (prix, horaires, limites : toujours à jour) ----
const money = (c) => (Number(c || 0) / 100).toFixed(2).replace(".", ",") + " $";
const hm = (v) => { const x = /^(\d{1,2}):(\d{2})/.exec(String(v || "")); return x ? `${Number(x[1])} h ${x[2]}` : null; };

async function loadSettings(token) {
  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/vd_settings?id=eq.1&select=menu,periods,hours,low_balance_cents,credit_limit_cents,require_photo,cup_count`, {
      headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(4000),
    });
    const j = await r.json();
    return Array.isArray(j) ? j[0] : null;
  } catch (_e) { return null; }
}

function liveInfo(s) {
  if (!s) return "";
  const m = s.menu || { drinks: [], syrups: [] };
  const on = (m.drinks || []).filter((d) => d.available !== false), off = (m.drinks || []).filter((d) => d.available === false);
  const days = { mon: "lundi", tue: "mardi", wed: "mercredi", thu: "jeudi", fri: "vendredi" };
  const timed = (s.periods || []).filter((p) => hm(p.start) && hm(p.end));
  let horaires;
  if (!timed.length) horaires = "heures des périodes pas encore précisées : le café accepte les commandes en tout temps";
  else horaires = Object.entries(days).map(([d, n]) => `${n} : ` + (timed.filter((p) => ((s.hours || {})[d] || []).includes(p.k)).map((p) => `${p.k} ${hm(p.start)} à ${hm(p.end)}`).join(", ") || "fermé")).join(" ; ");
  return `

=== RÉGLAGES ACTUELS DU CAFÉ (valeurs réelles : utilise-les pour répondre avec précision ; ils peuvent avoir changé depuis le lancement) ===
- Boissons offertes et prix : ${on.map((d) => `${d.name} ${money(d.priceCents)}`).join(", ") || "aucune"}.${off.length ? " Boissons actuellement masquées : " + off.map((d) => d.name).join(", ") + "." : ""}
- Sirops offerts : ${(m.syrups || []).filter((x) => x.available !== false).map((x) => x.name).join(", ") || "aucun"} ; supplément quand on ajoute un sirop : ${money(m.syrupSurchargeCents != null ? m.syrupSurchargeCents : 50)}.
- Périodes d'ouverture (jour par jour) : ${horaires}.
- Limite de solde négatif (découvert maximal) : ${money(s.credit_limit_cents)}. Alerte « solde bas » sous : ${money(s.low_balance_cents)}.
- Photo de profil : ${s.require_photo ? "OBLIGATOIRE pour commander" : "facultative"}. Nombre de tasses numérotées : ${s.cup_count}.`;
}

async function checkUser(token) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/vd_help_check`, {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: "{}",
  });
  const j = await r.json().catch(() => ({}));
  if (r.ok) return { ok: true, staff: !!j.is_staff };
  const msg = String(j.message || "");
  if (msg.includes("HELP_LIMIT")) return { ok: false, status: 429, error: "Limite de questions atteinte pour aujourd'hui. Réessaie demain, ou consulte le Guide et la FAQ." };
  if (r.status === 401 || msg.includes("NOT_AUTHENTICATED") || /jwt|permission/i.test(msg)) return { ok: false, status: 401, error: "Ta session a expiré. Reconnecte-toi." };
  return { ok: false, status: 500, error: "Service momentanément indisponible." };
}

let discovered = null;
async function discoverModels(key) {
  if (discovered) return discovered;
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(5000) });
    const j = await r.json();
    const names = (j.models || []).filter((m) => (m.supportedGenerationMethods || []).includes("generateContent") && /flash/.test(m.name) && !/image|tts|live|audio|embedding|preview-\d{2}-\d{4}/.test(m.name))
      .map((m) => m.name.replace(/^models\//, ""))
      .sort((a, b) => (/lite/.test(b) ? 1 : 0) - (/lite/.test(a) ? 1 : 0) || b.localeCompare(a));
    discovered = names.slice(0, 4);
  } catch (_e) { discovered = []; }
  return discovered;
}

async function askGemini(key, system, msgs) {
  const configured = (process.env.GEMINI_MODELS ? process.env.GEMINI_MODELS.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_MODELS);
  const tried = new Set();
  const attempt = async (model) => {
    tried.add(model);
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: msgs.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
          generationConfig: { maxOutputTokens: 900, temperature: 0.3 },
        }),
      });
      if (!r.ok) { console.error("gemini", model, r.status, (await r.text()).slice(0, 160)); return ""; }
      const out = await r.json();
      return ((out.candidates?.[0]?.content?.parts || [])).filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
    } catch (e) { console.error("gemini", model, String(e)); return ""; }
  };
  for (const m of configured) { const t = await attempt(m); if (t) return t; }
  for (const m of await discoverModels(key)) { if (tried.has(m)) continue; const t = await attempt(m); if (t) return t; }
  return "";
}

async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(res, 503, { error: "not_configured" });

  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json(res, 401, { error: "Connecte-toi pour utiliser l'assistant." });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_e) { body = {}; } }
  const msgs = ((body && body.messages) || [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-8).map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return json(res, 400, { error: "Question manquante." });

  const who = await checkUser(token);
  if (!who.ok) return json(res, who.status, { error: who.error });

  const live = liveInfo(await loadSettings(token));
  const system = BASE + live + (who.staff ? STAFF : CLIENT_NOTE);
  let reply = await askGemini(key, system, msgs);
  if (!reply) return json(res, 502, { error: "L'assistant est indisponible pour le moment. Réessaie dans une minute ou consulte la FAQ." });
  reply = reply.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(^|\s)\*([^*\n]+)\*/g, "$1$2").replace(/^#+\s*/gm, "");
  return json(res, 200, { reply });
}

module.exports = async (req, res) => {
  try { return await handler(req, res); }
  catch (e) { console.error("help fatal", e && e.stack || e); return json(res, 500, { error: "Service momentanément indisponible. Réessaie dans un instant." }); }
};
