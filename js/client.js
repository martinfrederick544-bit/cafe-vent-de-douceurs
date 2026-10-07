/* =========================================================
   Espace CLIENT : connexion, commande, historique, compte
========================================================= */

const ADDONS = [
  { key: "milk",      label: "Lait",                  icon: "lait.jpg" },
  { key: "cream",     label: "Crème",                 icon: "creme.jpg" },
  { key: "sugar",     label: "Sucre",                 icon: "sucre.jpg" },
  { key: "sweetener", label: "Édulcorant (Splenda)",  icon: "edulcorant.jpg" },
];
const LEVELS = { 1: "½ c. à thé · léger", 2: "1 c. à thé · prononcé" };
const LEVELS_SHORT = { 1: "½ c. à thé", 2: "1 c. à thé" };

const UI = {
  cart: [],
  draft: { location: "", comment: "", mode: "deliver", useFree: false },
  busy: false,
};
try { UI.cart = JSON.parse(localStorage.getItem("vd_cart_v1") || "[]"); if (!Array.isArray(UI.cart)) UI.cart = []; } catch (_e) { UI.cart = []; }
function saveCart() { try { localStorage.setItem("vd_cart_v1", JSON.stringify(UI.cart)); } catch (_e) {} }

/* ---------- menu helpers ---------- */
function menu() { return (State.settings && State.settings.menu) || { drinks: [], syrups: [], syrupSurchargeCents: 50 }; }
function drinkById(id) { return (menu().drinks || []).find((d) => d.id === id); }
function syrupById(id) { return (menu().syrups || []).find((s) => s.id === id); }
function itemPrice(it) {
  const d = drinkById(it.drink);
  if (!d) return 0;
  return (d.priceCents || 0) + (it.syrup ? (menu().syrupSurchargeCents || 0) : 0);
}
function describeItem(it) {
  // it: item du panier OU item enregistré en commande (qui contient déjà les noms)
  const parts = [];
  const sy = it.syrup;
  if (sy) {
    const nm = sy.name || (syrupById(sy.id) || {}).name || sy.id;
    parts.push(`${nm} (${LEVELS_SHORT[sy.level] || ""})`);
  }
  if (it.milk) parts.push(`lait ×${it.milk}`);
  if (it.cream) parts.push(`crème ×${it.cream}`);
  if (it.sugar) parts.push(`sucre ×${it.sugar}`);
  if (it.sweetener) parts.push(`édulcorant ×${it.sweetener}`);
  if (it.marshmallows) parts.push("guimauves");
  if (it.dairy_free) parts.push("sans produits laitiers");
  return parts.join(" · ");
}
function cartTotals() {
  const prices = UI.cart.map(itemPrice);
  let total = prices.reduce((a, b) => a + b, 0);
  let freeIdx = -1;
  if (UI.draft.useFree && State.loyalty.available > 0 && prices.length) {
    let best = -1;
    prices.forEach((p, i) => { if (p > best) { best = p; freeIdx = i; } });
    total -= best;
  }
  return { prices, total, freeIdx };
}

/* ---------- gabarit de page ---------- */
function brandHeader(rightEls) {
  return h("header", { class: "topbar" }, [
    h("div", { class: "brand" }, [
      h("img", { src: "/logo.png", alt: "" }),
      h("div", { style: "min-width:0" }, [h("h1", {}, "Café Vent de douceurs"), h("p", {}, "express")]),
    ]),
    h("div", { class: "topActions" }, [].concat(rightEls || [], [h("button", { class: "iconBtn helpBtn", type: "button", "aria-label": "Aide", title: "Aide", onClick: () => openHelp() }, "?")])),
  ]);
}

/* =========================================================
   AUTHENTIFICATION
========================================================= */
function authPage(title, subtitle, bodyEls) {
  return h("div", {}, [
    brandHeader([h("a", { class: "btn sm", href: "#staff" }, "Espace staff")]),
    h("main", { class: "wrap narrow" }, [
      h("img", { class: "authLogo", src: "/logo.png", alt: "Café Vent de douceurs express" }),
      h("h2", { class: "authTitle" }, title),
      h("p", { class: "muted authTitle", style: "text-align:center" }, subtitle || ""),
      h("div", { class: "card" }, bodyEls),
    ]),
  ]);
}
function errBox() { return h("div", { class: "error", role: "alert" }); }
function showErr(box, msg) { box.textContent = msg; box.classList.add("show"); }

function renderLogin() {
  const err = errBox();
  const email = h("input", { type: "email", autocomplete: "email", placeholder: "prenom.nom@ecole.ca", required: true });
  const pass = h("input", { type: "password", autocomplete: "current-password", placeholder: "Ton mot de passe", required: true });
  const btn = h("button", { class: "btn primary block", type: "submit" }, "Se connecter");
  const form = h("form", {}, [
    h("label", {}, "Courriel"), email, h("label", {}, "Mot de passe"), pass,
    h("div", { style: "margin-top:16px" }, btn), err,
  ]);
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); err.classList.remove("show"); btn.disabled = true;
    try {
      const r = await sb.auth.signInWithPassword({ email: email.value.trim(), password: pass.value });
      if (r.error) throw r.error;
      go("order");
    } catch (ex) { showErr(err, errText(ex, "Connexion impossible.")); }
    finally { btn.disabled = false; }
  });
  return authPage("Connexion", "Commande ton café en quelques touches.", [
    form,
    h("div", { class: "divider" }),
    h("div", { class: "row between" }, [
      h("a", { class: "btn link", href: "#forgot" }, "Mot de passe oublié ?"),
      h("a", { class: "btn", href: "#register" }, "Créer un compte"),
    ]),
  ]);
}

function renderRegister() {
  const err = errBox();
  const name = h("input", { autocomplete: "name", placeholder: "Ex : Marie Tremblay", required: true, maxlength: "80" });
  const loc = h("input", { placeholder: "Ex : Local 203", required: true, maxlength: "80" });
  const email = h("input", { type: "email", autocomplete: "email", placeholder: "prenom.nom@ecole.ca", required: true });
  const pass = h("input", { type: "password", autocomplete: "new-password", placeholder: "Au moins 8 caractères", required: true, minlength: "8" });
  const pass2 = h("input", { type: "password", autocomplete: "new-password", placeholder: "Répète le mot de passe", required: true });
  const btn = h("button", { class: "btn primary block", type: "submit" }, "Créer mon compte");
  const form = h("form", {}, [
    h("label", {}, "Nom complet"), name,
    h("label", {}, "Local (livraison par défaut)"), loc,
    h("label", {}, "Courriel"), email,
    h("label", {}, "Mot de passe"), pass,
    h("label", {}, "Confirmer le mot de passe"), pass2,
    h("p", { class: "muted small", style: "margin-top:10px" }, "Le courriel sert à réinitialiser ton mot de passe si tu l'oublies."),
    h("div", { style: "margin-top:8px" }, btn), err,
  ]);
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); err.classList.remove("show");
    if (pass.value !== pass2.value) return showErr(err, "Les deux mots de passe ne sont pas identiques.");
    btn.disabled = true;
    try {
      const r = await sb.auth.signUp({
        email: email.value.trim(), password: pass.value,
        options: { data: { name: name.value.trim(), location: loc.value.trim() } },
      });
      if (r.error) throw r.error;
      if (!r.data.session) {
        toast("Compte créé ! Vérifie ton courriel pour le confirmer, puis connecte-toi.", "good");
        go("login");
      } else { toast("Bienvenue !", "good"); go("order"); }
    } catch (ex) { showErr(err, errText(ex, "Inscription impossible.")); }
    finally { btn.disabled = false; }
  });
  return authPage("Créer un compte", "Un compte par personne : ça simplifie les commandes.", [
    form, h("div", { class: "divider" }),
    h("div", { class: "row" }, h("a", { class: "btn link", href: "#login" }, "← J'ai déjà un compte")),
  ]);
}

function renderForgot() {
  const err = errBox();
  const email = h("input", { type: "email", autocomplete: "email", placeholder: "Ton courriel", required: true });
  const btn = h("button", { class: "btn primary block", type: "submit" }, "M'envoyer le lien");
  const done = h("div", { class: "banner good hide" }, "Si un compte existe pour ce courriel, un lien de réinitialisation vient d'être envoyé. Vérifie aussi tes courriels indésirables.");
  const form = h("form", {}, [h("label", {}, "Courriel du compte"), email, h("div", { style: "margin-top:16px" }, btn), err]);
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); err.classList.remove("show"); btn.disabled = true;
    try {
      const r = await sb.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: location.origin + "/" });
      if (r.error) throw r.error;
      done.classList.remove("hide");
    } catch (ex) { showErr(err, errText(ex, "Envoi impossible.")); }
    finally { btn.disabled = false; }
  });
  return authPage("Mot de passe oublié", "On t'envoie un lien pour en choisir un nouveau.", [
    done, form, h("div", { class: "divider" }),
    h("a", { class: "btn link", href: "#login" }, "← Retour à la connexion"),
  ]);
}

function renderReset() {
  const err = errBox();
  const pass = h("input", { type: "password", autocomplete: "new-password", placeholder: "Au moins 8 caractères", required: true, minlength: "8" });
  const pass2 = h("input", { type: "password", autocomplete: "new-password", placeholder: "Répète le mot de passe", required: true });
  const btn = h("button", { class: "btn primary block", type: "submit" }, "Enregistrer");
  const form = h("form", {}, [h("label", {}, "Nouveau mot de passe"), pass, h("label", {}, "Confirmer"), pass2, h("div", { style: "margin-top:16px" }, btn), err]);
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); err.classList.remove("show");
    if (pass.value !== pass2.value) return showErr(err, "Les deux mots de passe ne sont pas identiques.");
    btn.disabled = true;
    try {
      const r = await sb.auth.updateUser({ password: pass.value });
      if (r.error) throw r.error;
      State.recovery = false;
      toast("Mot de passe mis à jour ✅", "good");
      go("order");
    } catch (ex) { showErr(err, errText(ex, "Impossible de changer le mot de passe.")); }
    finally { btn.disabled = false; }
  });
  return authPage("Nouveau mot de passe", "Choisis un mot de passe que tu retiendras.", [form]);
}

/* =========================================================
   COQUILLE CLIENT
========================================================= */
function clientShell(active, content) {
  const p = State.profile;
  const low = p && State.settings && p.balance_cents < State.settings.low_balance_cents;
  const top = brandHeader([
    h("button", { class: "pill " + (p && p.balance_cents < 0 ? "bad" : low ? "warn" : "good"), type: "button", onClick: () => go("account"), style: "cursor:pointer", title: "Voir mon portefeuille" },
      ["💰 ", h("b", {}, money(p ? p.balance_cents : 0))]),
    p && p.is_staff ? h("a", { class: "btn sm", href: "#staff" }, "Espace staff") : null,
  ]);
  const nav = h("nav", { class: "bottomNav", "aria-label": "Navigation" }, [
    ["order", "☕", "Commander"], ["orders", "🧾", "Mes commandes"], ["account", "👤", "Mon compte"],
  ].map(([r, ico, label]) => h("button", { class: "tab" + (active === r ? " active" : ""), type: "button", onClick: () => go(r) },
    [h("span", { class: "ico" }, ico), h("span", { class: "lbl" }, label)])));
  return h("div", {}, [top, h("main", { class: "wrap" }, content), nav]);
}

/** Invitation à activer les notifications (une fois, masquable). */
function notifBanner(role) {
  try {
    if (!pushSupported() || !("PushManager" in window)) return null;
    if (Notification.permission === "granted" || Notification.permission === "denied") return null;
    if (localStorage.getItem("vd_notif_dismissed_" + role) === "1") return null;
  } catch (_e) { return null; }
  return h("div", { class: "banner" }, [
    h("b", {}, role === "staff" ? "Reçois chaque nouvelle commande en notification. " : "Sois averti quand ta boisson est prête. "),
    h("div", { class: "row", style: "margin-top:8px" }, [
      h("button", { class: "btn sm primary", type: "button", onClick: async () => {
        try { await enablePush(role); if (State.profile.is_staff && role === "client") await enablePush("staff"); toast("Notifications activées ✅", "good"); render(); }
        catch (e) { toast(pushErrorText(e), "bad"); }
      } }, "🔔 Activer les notifications"),
      h("button", { class: "btn sm", type: "button", onClick: () => { try { localStorage.setItem("vd_notif_dismissed_" + role, "1"); } catch (_e) {} render(); } }, "Plus tard"),
    ]),
  ]);
}

function photoBanner() {
  const p = State.profile;
  if (!p || p.photo || !(State.settings && State.settings.require_photo)) return null;
  return h("div", { class: "banner warn" }, [
    h("b", {}, "Photo de profil requise. "),
    "Elle aide les élèves à te reconnaître à la livraison.",
    h("div", {}, photoPicker("Ajouter ma photo", async (dataUrl) => { await setMyPhoto(dataUrl); await loadProfile(); toast("Photo enregistrée ✅", "good"); render(); })),
  ]);
}

/** Bouton « choisir / prendre une photo » → callback(dataUrl) */
function photoPicker(label, onPhoto, small) {
  const input = h("input", { type: "file", accept: "image/*", class: "hide" });
  const btn = h("button", { class: "btn " + (small ? "sm" : "") , type: "button", onClick: () => input.click() }, "📷 " + label);
  input.addEventListener("change", async () => {
    const f = input.files && input.files[0];
    if (!f) return;
    btn.disabled = true;
    try { await onPhoto(await resizeImageToDataUrl(f, 256, 0.82)); }
    catch (e) { toast(errText(e, "Photo impossible à enregistrer."), "bad"); }
    finally { btn.disabled = false; input.value = ""; }
  });
  return h("span", { style: "display:inline-block;margin-top:8px" }, [btn, input]);
}

/* =========================================================
   COMMANDER
========================================================= */
function renderOrderScreen() {
  const p = State.profile;
  if (!UI.draft.location) UI.draft.location = p.location || "";
  const low = State.settings && p.balance_cents < State.settings.low_balance_cents;

  const banners = [];
  const pb = photoBanner(); if (pb) banners.push(pb);
  if (p.balance_cents < 0) banners.push(h("div", { class: "banner bad" }, ["💰 Ton solde est négatif : ", h("b", {}, money(p.balance_cents)), ". Passe au café pour recharger ton portefeuille."]));
  else if (low) banners.push(h("div", { class: "banner warn" }, ["💰 Solde bas : ", h("b", {}, money(p.balance_cents)), ". Pense à faire recharger ton portefeuille au café."]));
  const nb = notifBanner("client"); if (nb) banners.push(nb);
  if (!isCafeOpenNow()) banners.push(h("div", { class: "banner" }, [h("b", {}, "Le café est fermé en ce moment. "), "Tu peux quand même préparer ta commande : elle sera servie à la prochaine période d'ouverture."]));
  if (State.loyalty.available > 0) banners.push(h("div", { class: "banner good" }, ["🎁 Tu as ", h("b", {}, String(State.loyalty.available)), " boisson(s) gratuite(s) à utiliser dans ton panier !"]));

  const drinks = (menu().drinks || []);
  const grid = h("div", { class: "drinkGrid" }, drinks.map((d) =>
    h("button", { class: "drinkCard" + (d.available === false ? " off" : ""), type: "button", onClick: () => openBuilder(d.id) }, [
      d.icon ? iconImg(d.icon, { alt: d.name, class: "pic" }) : h("div", { class: "avatar ph", style: "width:100%;height:120px;border-radius:0;border:none" }, d.name),
      h("div", { class: "cap" }, [h("b", {}, d.name), h("span", { class: "pill" }, money(d.priceCents))]),
    ])));

  const left = h("div", {}, [
    h("div", { class: "card" }, [
      h("h2", {}, "Choisis ta boisson"),
      h("p", { class: "muted small" }, `Sirop : +${money(menu().syrupSurchargeCents || 0)}. Touche une boisson pour la personnaliser.`),
      grid,
    ]),
  ]);

  const right = h("div", { id: "cartCard" }, [renderCartCard()]);
  const cartBar = renderCartBar();
  return clientShell("order", [].concat(banners, [h("div", { class: "grid2" }, [left, right])], [cartBar]));
}

function renderCartBar() {
  if (!UI.cart.length) return null;
  const t = cartTotals();
  return h("button", {
    class: "btn primary", type: "button",
    style: "position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom) + 78px);z-index:25;box-shadow:var(--shadow);max-width:calc(100vw - 24px);width:max-content;text-align:center;line-height:1.2",
    onClick: () => { const c = $("#cartCard"); if (c) c.scrollIntoView({ behavior: "smooth", block: "start" }); },
  }, `🛒 ${UI.cart.length} boisson${UI.cart.length > 1 ? "s" : ""} · ${money(t.total)} — Voir le panier`);
}

function renderCartCard() {
  const p = State.profile;
  const card = h("div", { class: "card" }, [h("h2", {}, "Mon panier")]);
  if (!UI.cart.length) {
    card.appendChild(h("p", { class: "muted" }, "Ton panier est vide. Choisis une boisson à gauche ☕"));
    return card;
  }
  const t = cartTotals();
  UI.cart.forEach((it, i) => {
    const d = drinkById(it.drink) || { name: it.drink };
    const free = i === t.freeIdx;
    card.appendChild(h("div", { class: "cartRow" }, [
      d.icon ? iconImg(d.icon, { class: "thumb", alt: "" }) : null,
      h("div", { class: "info" }, [
        h("b", {}, d.name), h("small", {}, describeItem(it) || "Nature"),
        h("div", { class: "row", style: "margin-top:6px;gap:6px" }, [
          h("button", { class: "btn sm", type: "button", onClick: () => openBuilder(it.drink, i) }, "Modifier"),
          h("button", { class: "btn sm", type: "button", onClick: () => { UI.cart.splice(i + 1, 0, JSON.parse(JSON.stringify(it))); saveCart(); render(); } }, "＋ Une autre"),
          h("button", { class: "btn sm bad", type: "button", onClick: () => { UI.cart.splice(i, 1); saveCart(); render(); } }, "Retirer"),
        ]),
      ]),
      h("div", { style: "text-align:right;font-weight:800" }, free ? [h("s", { class: "muted" }, money(t.prices[i])), h("div", { class: "pill good" }, "GRATUIT")] : money(t.prices[i])),
    ]));
  });

  if (State.loyalty.available > 0) {
    card.appendChild(h("label", { class: "row", style: "margin:12px 0 0;color:var(--text);cursor:pointer" }, [
      h("input", { type: "checkbox", checked: UI.draft.useFree, onChange: (e) => { UI.draft.useFree = e.target.checked; render(); } }),
      h("span", {}, "🎁 Utiliser ma boisson gratuite (sur la plus chère)"),
    ]));
  }

  card.appendChild(h("div", { class: "divider" }));
  card.appendChild(h("label", { style: "margin-top:0" }, "Mode"));
  card.appendChild(h("div", { class: "seg" }, [
    h("button", { class: "btn" + (UI.draft.mode === "deliver" ? " on" : ""), type: "button", onClick: () => { UI.draft.mode = "deliver"; render(); } }, "🛒 Livrer à mon local"),
    h("button", { class: "btn" + (UI.draft.mode === "pickup" ? " on" : ""), type: "button", onClick: () => { UI.draft.mode = "pickup"; render(); } }, "🚶 Je viens la chercher"),
  ]));
  card.appendChild(h("label", {}, "Local / endroit de livraison"));
  card.appendChild(h("input", { value: UI.draft.location, placeholder: "Ex : Local 203", maxlength: "80", onInput: (e) => { UI.draft.location = e.target.value; } }));
  card.appendChild(h("label", {}, "Commentaire (optionnel)"));
  card.appendChild(h("textarea", { placeholder: "Ex : bien chaud, merci !", maxlength: "300", onInput: (e) => { UI.draft.comment = e.target.value; }, value: UI.draft.comment }));

  card.appendChild(h("div", { class: "divider" }));
  card.appendChild(h("div", { class: "totalLine big" }, [h("span", {}, "Total"), h("span", {}, money(t.total))]));
  const after = p.balance_cents - t.total;
  card.appendChild(h("div", { class: "totalLine muted small" }, [h("span", {}, "Solde après la commande"), h("span", { style: after < 0 ? "color:var(--bad);font-weight:800" : "" }, money(after))]));

  const err = errBox();
  const submit = h("button", { class: "btn primary block", type: "button", style: "margin-top:12px", disabled: UI.busy }, "✅ Envoyer la commande");
  submit.addEventListener("click", () => submitOrder(submit, err));
  card.appendChild(submit);
  card.appendChild(err);
  return card;
}

async function submitOrder(btn, err) {
  err.classList.remove("show");
  const p = State.profile;
  const t = cartTotals();
  if (!UI.cart.length) return showErr(err, "Ton panier est vide.");
  if (!(UI.draft.location || "").trim()) return showErr(err, "Entre un local de livraison.");
  if (State.settings.require_photo && !p.photo) return showErr(err, ERRORS_FR.PHOTO_REQUIRED);
  if (p.balance_cents - t.total < -(State.settings.credit_limit_cents || 0)) return showErr(err, ERRORS_FR.CREDIT_LIMIT_REACHED);
  if (!isCafeOpenNow()) {
    const ok = await confirmDialog("Le café n'est pas ouvert",
      "Veux-tu quand même envoyer ta commande ?\n\nElle sera préparée à la prochaine période d'ouverture.", "Poursuivre ma commande", "Annuler");
    if (!ok) return;
  }
  btn.disabled = true; UI.busy = true;
  try {
    const items = UI.cart.map((it) => ({
      drink: it.drink, syrup: it.syrup || null, milk: it.milk || 0, cream: it.cream || 0, sugar: it.sugar || 0,
      sweetener: it.sweetener || 0, marshmallows: !!it.marshmallows, dairy_free: !!it.dairy_free,
    }));
    const r = await placeOrder(newOrderId(), items, UI.draft.location.trim(), UI.draft.comment.trim(), UI.draft.mode, UI.draft.useFree);
    UI.cart = []; saveCart();
    UI.draft.comment = ""; UI.draft.useFree = false;
    State.profile.balance_cents = r.balance_cents;
    await Promise.all([loadMyOrders(), loadMyTx(), loadLoyalty()]).catch(() => {});
    toast("✅ Commande envoyée au café !", "good");
    go("orders");
  } catch (e) {
    console.warn(e);
    showErr(err, errText(e, "Erreur d'envoi. Vérifie ta connexion puis réessaie."));
    if (String(e && e.message).includes("BAD_")) { loadSettings().then(render).catch(() => {}); }
  } finally { UI.busy = false; btn.disabled = false; }
}

/* ---------- personnalisation d'une boisson ---------- */
function openBuilder(drinkId, editIdx) {
  const d = drinkById(drinkId);
  if (!d) return;
  const editing = editIdx !== undefined && editIdx !== null;
  const b = editing ? JSON.parse(JSON.stringify(UI.cart[editIdx])) : {
    drink: d.id, syrup: null, milk: 0, cream: 0, sugar: 0, sweetener: 0, marshmallows: false, dairy_free: false,
  };
  let ui = null;
  const syrups = (menu().syrups || []).filter((s) => s.available !== false);

  function priceNow() { return itemPrice(b); }

  function build() {
    const syrupBlock = h("div", {}, [
      h("h3", { style: "margin:14px 0 8px" }, `Sirop (+${money(menu().syrupSurchargeCents || 0)})`),
      h("div", { class: "optGrid" }, [
        h("button", { class: "opt" + (!b.syrup ? " on" : ""), type: "button", onClick: () => { b.syrup = null; refresh(); } },
          [h("div", { style: "font-size:2rem;line-height:84px" }, "🚫"), h("span", {}, "Sans sirop")]),
      ].concat(syrups.map((s) =>
        h("button", { class: "opt" + (b.syrup && b.syrup.id === s.id ? " on" : ""), type: "button",
          onClick: () => { b.syrup = { id: s.id, level: b.syrup ? b.syrup.level : 1 }; refresh(); } },
          [s.icon ? h("img", { src: iconUrl(s.icon), alt: "" }) : null, h("span", {}, s.name)])))),
    ]);
    if (b.syrup) {
      syrupBlock.appendChild(h("div", { class: "levelRow" }, [1, 2].map((lv) =>
        h("button", { class: "btn" + (b.syrup.level === lv ? " on" : ""), type: "button", onClick: () => { b.syrup.level = lv; refresh(); } }, LEVELS[lv]))));
    }

    const addons = h("div", {}, [h("h3", { style: "margin:16px 0 4px" }, "Ajouts")]);
    ADDONS.forEach((a) => {
      addons.appendChild(h("div", { class: "addonLine" }, [
        h("img", { src: iconUrl(a.icon), alt: "" }),
        h("div", { class: "nm" }, a.label),
        h("div", { class: "stepper" }, [
          h("button", { type: "button", "aria-label": "Moins", onClick: () => { b[a.key] = Math.max(0, (b[a.key] || 0) - 1); refresh(); } }, "−"),
          h("span", {}, String(b[a.key] || 0)),
          h("button", { type: "button", "aria-label": "Plus", onClick: () => { b[a.key] = Math.min(3, (b[a.key] || 0) + 1); refresh(); } }, "+"),
        ]),
      ]));
    });
    addons.appendChild(h("label", { class: "addonLine", style: "margin:0;color:var(--text);cursor:pointer" }, [
      h("img", { src: iconUrl("guimauves.jpg"), alt: "" }),
      h("div", { class: "nm" }, "Guimauves"),
      h("input", { type: "checkbox", checked: !!b.marshmallows, onChange: (e) => { b.marshmallows = e.target.checked; refresh(); } }),
    ]));
    if (d.dairyFreeOption) {
      addons.appendChild(h("label", { class: "addonLine", style: "margin:0;color:var(--text);cursor:pointer" }, [
        h("div", { style: "width:52px;text-align:center;font-size:1.6rem" }, "🌱"),
        h("div", { class: "nm" }, "Sans produits laitiers"),
        h("input", { type: "checkbox", checked: !!b.dairy_free, onChange: (e) => { b.dairy_free = e.target.checked; refresh(); } }),
      ]));
    }

    const addBtn = h("button", { class: "btn primary block", type: "button", style: "margin-top:16px", onClick: () => {
      if (editing) UI.cart[editIdx] = b; else UI.cart.push(b);
      saveCart(); closeSheet(); render();
      toast(editing ? "Boisson modifiée" : "Ajouté au panier ✅", "good");
    } }, `${editing ? "Enregistrer" : "Ajouter au panier"} — ${money(priceNow())}`);

    return h("div", {}, [
      h("div", { class: "row", style: "gap:14px;flex-wrap:nowrap" }, [
        d.icon ? iconImg(d.icon, { alt: d.name, class: "hdrpic", style: "width:96px;height:96px;border-radius:14px" }) : null,
        h("div", {}, [h("h2", { style: "margin:0" }, d.name), h("p", { class: "muted", style: "margin:4px 0 0" }, `Base : ${money(d.priceCents)}`)]),
      ]),
      syrupBlock, addons, addBtn,
    ]);
  }
  function refresh() {
    const body = ui.body; const top = body.scrollTop;
    body.innerHTML = ""; body.appendChild(build()); body.scrollTop = top;
  }
  ui = openSheet(editing ? "Modifier la boisson" : "Personnaliser", build());
}

/* =========================================================
   MES COMMANDES
========================================================= */
/** Regroupe les boissons identiques d'une commande : [{it, count}] */
function groupItems(items) {
  const map = new Map();
  (items || []).forEach((it) => {
    const key = JSON.stringify([it.drink, it.syrup, it.milk, it.cream, it.sugar, it.sweetener, it.marshmallows, it.dairy_free, !!it.free, it.price_cents]);
    if (map.has(key)) map.get(key).count++; else map.set(key, { it, count: 1 });
  });
  return [...map.values()];
}
function orderItemRows(o, compact) {
  return groupItems(o.items).map(({ it, count }) => h("div", { class: "itemLine" }, [
    it.icon ? iconImg(it.icon, { class: "big", alt: it.name, style: compact ? "width:48px;height:48px" : "", onClick: () => openImage(it.icon, it.name) }) : null,
    h("div", { class: "desc" }, [
      h("b", {}, (count > 1 ? count + " × " : "") + it.name + (it.free ? "  🎁" : "")),
      h("div", { class: "muted small" }, describeItem(it) || "Nature"),
      h("div", { class: "small" }, it.free ? "GRATUIT (fidélité)" : (count > 1 ? count + " × " + money(it.price_cents) + " = " + money(it.price_cents * count) : money(it.price_cents))),
    ]),
  ]));
}
function openImage(file, title) { openSheet(title || "", iconImg(file, { class: "zoom", alt: title || "" })); }

function renderMyOrdersScreen() {
  const list = h("div", {});
  if (!State.myOrders.length) list.appendChild(h("p", { class: "muted" }, "Aucune commande pour l'instant."));
  State.myOrders.forEach((o) => {
    const cups = (o.cup_numbers || []);
    list.appendChild(h("div", { class: "order" }, [
      h("div", { class: "orderHead" }, [
        h("div", { class: "who" }, [
          h("b", {}, `${fmtDate(o.created_at_ms)} • ${fmtTime(o.created_at_ms)}`),
          h("div", { class: "muted small" }, `${o.mode === "pickup" ? "Ramassage" : "Livraison : " + o.location} · Total ${money(o.total_cents)}`),
        ]),
        h("span", { class: "status " + o.status }, o.status),
      ]),
      cups.length ? h("div", { class: "cups" }, cups.map((n) => h("span", { class: "cupChip back", style: "text-decoration:none;opacity:1;border-color:var(--caramel);background:var(--info-bg)" }, "Tasse n° " + n))) : null,
      h("div", {}, orderItemRows(o, true)),
      o.comment ? h("div", { class: "muted small", style: "margin-top:6px" }, "💬 " + o.comment) : null,
      o.status !== "ANNULÉE" ? h("div", { class: "actions" }, h("button", { class: "btn sm", type: "button", onClick: () => reorder(o) }, "↻ Recommander")) : null,
    ]));
  });
  return clientShell("orders", [h("div", { class: "card" }, [h("h2", {}, "Mes commandes"), h("p", { class: "muted small" }, "Le statut est mis à jour par le café en direct."), list])]);
}
function reorder(o) {
  const items = [];
  for (const it of o.items || []) {
    const d = drinkById(it.drink);
    if (!d || d.available === false) continue;
    const sy = it.syrup && syrupById(it.syrup.id) && syrupById(it.syrup.id).available !== false ? { id: it.syrup.id, level: it.syrup.level } : null;
    items.push({ drink: it.drink, syrup: sy, milk: it.milk || 0, cream: it.cream || 0, sugar: it.sugar || 0, sweetener: it.sweetener || 0, marshmallows: !!it.marshmallows, dairy_free: !!it.dairy_free });
  }
  if (!items.length) return toast("Ces boissons ne sont plus disponibles.", "bad");
  UI.cart = items; saveCart();
  toast("Commande copiée dans ton panier ✅", "good");
  go("order");
}

/* =========================================================
   MON COMPTE
========================================================= */
function renderAccountScreen() {
  const p = State.profile;
  const low = State.settings && p.balance_cents < State.settings.low_balance_cents;

  // portefeuille
  const wallet = h("div", { class: "card" }, [
    h("h2", {}, "💰 Mon portefeuille"),
    h("div", { class: "balance", style: p.balance_cents < 0 ? "color:var(--bad)" : low ? "color:var(--warn)" : "" }, money(p.balance_cents)),
    low ? h("div", { class: "banner " + (p.balance_cents < 0 ? "bad" : "warn"), style: "margin-top:10px" }, p.balance_cents < 0 ? "Ton solde est négatif : passe au café recharger ton portefeuille (argent comptant)." : "Solde bas : fais recharger ton portefeuille au café (argent comptant).") : h("p", { class: "muted small", style: "margin-top:8px" }, "Les recharges se font au café, en argent comptant. Chaque commande est déduite automatiquement."),
  ]);
  if (State.myTx.length) {
    const txs = h("div", { style: "margin-top:10px" }, [h("h3", {}, "Derniers mouvements")]);
    State.myTx.slice(0, 12).forEach((t) => {
      const label = { topup: "Recharge", order: "Commande", refund: "Remboursement", adjust: "Ajustement" }[t.kind] || t.kind;
      txs.appendChild(h("div", { class: "txRow" }, [
        h("span", {}, [`${fmtDate(new Date(t.created_at).getTime())} · ${label}`, t.note ? h("span", { class: "muted small" }, " — " + t.note) : null]),
        h("span", { class: t.amount_cents >= 0 ? "pos" : "neg" }, (t.amount_cents >= 0 ? "+" : "−") + money(Math.abs(t.amount_cents))),
      ]));
    });
    wallet.appendChild(txs);
  }

  // fidélité
  const L = State.loyalty;
  const dots = h("div", { class: "dots" });
  for (let i = 1; i <= 10; i++) dots.appendChild(h("div", { class: "dot" + (i <= L.progress ? " on" : "") + (i === 10 ? " gift" : "") }, i === 10 ? "🎁" : String(i)));
  const loyalty = h("div", { class: "card" }, [
    h("h2", {}, "🎁 Fidélité"),
    h("p", { class: "muted small" }, "Achète 10 boissons, la 11e est gratuite."),
    dots,
    h("p", {}, [h("b", {}, `${L.progress}/10`), L.available > 0 ? h("span", { class: "pill good", style: "margin-left:8px" }, `${L.available} boisson(s) gratuite(s) prête(s)`) : null]),
  ]);

  // profil
  const err = errBox();
  const name = h("input", { value: p.name, autocomplete: "name", maxlength: "80" });
  const loc = h("input", { value: p.location, placeholder: "Ex : Local 203", maxlength: "80" });
  const save = h("button", { class: "btn good", type: "button", style: "margin-top:12px", onClick: async () => {
    err.classList.remove("show");
    try { await updateMyProfile(name.value, loc.value); await loadProfile(); UI.draft.location = ""; toast("Profil enregistré ✅", "good"); render(); }
    catch (e) { showErr(err, errText(e, "Enregistrement impossible.")); }
  } }, "Enregistrer");
  const profile = h("div", { class: "card" }, [
    h("h2", {}, "👤 Mon profil"),
    h("div", { class: "row", style: "gap:14px" }, [
      avatar(p.name, p.photo, 84, !p.photo),
      h("div", {}, [h("div", { class: "muted small" }, p.email || ""), photoPicker(p.photo ? "Changer ma photo" : "Ajouter ma photo", async (dataUrl) => { await setMyPhoto(dataUrl); await loadProfile(); toast("Photo enregistrée ✅", "good"); render(); }, true)]),
    ]),
    h("label", {}, "Nom"), name, h("label", {}, "Local par défaut"), loc, save, err,
  ]);

  // notifications + déconnexion
  const extra = h("div", { class: "card" }, [h("h2", {}, "Réglages")]);
  if (pushSupported()) {
    extra.appendChild(h("button", { class: "btn block", type: "button", onClick: async () => {
      try { await enablePush("client"); toast("Notifications activées ✅", "good"); } catch (e) { toast(pushErrorText(e), "bad"); }
    } }, "🔔 Activer les notifications"));
    extra.appendChild(h("p", { class: "muted small", style: "margin-top:6px" }, "On t'avise quand ta commande est prête."));
  }
  extra.appendChild(h("button", { class: "btn bad block", type: "button", style: "margin-top:10px", onClick: () => signOut() }, "Se déconnecter"));

  return clientShell("account", [h("div", { class: "grid2 even" }, [h("div", {}, [wallet, loyalty]), h("div", {}, [profile, extra])])]);
}
