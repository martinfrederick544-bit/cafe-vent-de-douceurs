/* =========================================================
   Espace STAFF : commandes, clients/portefeuilles/photos, tasses,
   menu, horaires, rapports, réglages
========================================================= */

const StaffUI = {
  userSearch: "", userFilter: "all", userLimit: 60,
  report: null, reportMonth: todayKey().slice(0, 7), reportBusy: false, reportTried: false,
  menuDraft: null,
};

const STAFF_TABS = [
  ["staff", "🧾 Commandes"], ["staff_clients", "👥 Clients"], ["staff_cups", "🥤 Tasses"],
  ["staff_menu", "📋 Menu"], ["staff_hours", "🕘 Horaires"], ["staff_report", "📊 Rapports"], ["staff_settings", "⚙️ Réglages"],
];

function staffShell(active, content) {
  const top = brandHeader([
    h("a", { class: "btn sm", href: "#order" }, "Espace client"),
    h("button", { class: "btn sm", type: "button", onClick: () => signOut() }, "Déconnexion"),
  ]);
  const tabs = h("div", { class: "tabs" }, STAFF_TABS.map(([r, label]) =>
    h("button", { class: "tab" + (active === r ? " active" : ""), type: "button", onClick: () => go(r) }, label)));
  return h("div", {}, [top, tabs, h("main", { class: "wrap" }, content)]);
}

/* ---------- connexion staff : un seul mot de passe pour tout le café ---------- */
function renderStaffLogin() {
  const err = errBox();
  const pass = h("input", { type: "password", autocomplete: "current-password", placeholder: "Mot de passe du café", required: true, autofocus: true });
  const btn = h("button", { class: "btn primary block", type: "submit" }, "Entrer dans l'espace staff");
  const notice = (State.session && State.profile && !State.profile.is_staff)
    ? h("p", { class: "muted small" }, "Tu es connecté·e avec un compte client. Entrer dans l'espace staff te déconnectera de ce compte.") : null;
  const form = h("form", {}, [notice, h("label", {}, "Mot de passe staff"), pass, h("div", { style: "margin-top:16px" }, btn), err]);
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); err.classList.remove("show"); btn.disabled = true;
    try {
      await unsubscribePushForThisDevice();
      const r = await sb.auth.signInWithPassword({ email: VD.STAFF_EMAIL, password: pass.value });
      if (r.error) throw new Error(/invalid login/i.test(r.error.message) ? "BAD_STAFF_PASSWORD" : r.error.message);
      State.session = r.data.session;
      await loadProfile();
      if (!State.profile || !State.profile.is_staff) { await sb.auth.signOut(); throw new Error("NOT_STAFF"); }
      go("staff");
    } catch (ex) { showErr(err, errText(ex, "Connexion impossible.")); }
    finally { btn.disabled = false; }
  });
  return h("div", {}, [
    brandHeader([h("a", { class: "btn sm", href: "#login" }, "Espace client")]),
    h("main", { class: "wrap narrow" }, [
      h("img", { class: "authLogo", src: "/logo.png", alt: "" }),
      h("h2", { class: "authTitle" }, "Espace staff"),
      h("p", { class: "muted", style: "text-align:center" }, "Reçois les commandes, gère les tasses et les portefeuilles."),
      h("div", { class: "card" }, form),
    ]),
  ]);
}

/* =========================================================
   COMMANDES
========================================================= */
function renderStaffOrders() {
  const dateInput = h("input", { type: "date", value: State.staffDate, style: "max-width:190px", onChange: async (e) => {
    State.staffDate = e.target.value || todayKey(); State.staffDateAuto = State.staffDate === todayKey(); await loadStaffOrders(); render();
  } });
  const exportBtn = h("button", { class: "btn sm", type: "button", onClick: () => exportOrdersCsv() }, "⬇ Exporter CSV");
  const orders = State.staffOrders;
  const newOrders = orders.filter((o) => o.status === "NOUVELLE").sort((a, b) => a.created_at_ms - b.created_at_ms);
  const other = orders.filter((o) => o.status !== "NOUVELLE");
  const sales = orders.filter((o) => o.status !== "ANNULÉE" && dateKey(o.created_at_ms) === State.staffDate).reduce((s, o) => s + o.total_cents, 0);

  const noPhoto = newOrders.filter((o) => !State.photoCache[o.user_id]).length;

  return staffShell("staff", [
    h("div", { class: "card" }, h("div", { class: "row between" }, [
      h("div", { class: "row" }, [h("b", {}, "Date"), dateInput, exportBtn]),
      h("div", { class: "row" }, [h("span", { class: "pill" }, ["Ventes du jour : ", h("b", {}, money(sales))]), h("span", { class: "pill" }, ["Tasses libres : ", h("b", {}, `${State.cups.filter((c) => c.status === "available").length}/${State.cups.length}`)])]),
    ])),
    notifBanner("staff"),
    noPhoto ? h("div", { class: "banner warn" }, `${noPhoto} commande(s) de clients sans photo de profil — ajoute-les dans l'onglet Clients.`) : null,
    h("div", { class: "staffCols" }, [
      h("div", {}, [h("div", { class: "colHead" }, [h("h2", { style: "margin:0" }, "Nouvelles"), h("span", { class: "count" }, String(newOrders.length))]),
        newOrders.length ? newOrders.map(staffOrderCard) : h("div", { class: "card muted" }, "Aucune commande en attente ☕")]),
      h("div", {}, [h("div", { class: "colHead" }, [h("h2", { style: "margin:0" }, "Complétées / annulées"), h("span", { class: "count" }, String(other.length))]),
        other.length ? other.map(staffOrderCard) : h("div", { class: "card muted" }, "Rien pour le moment.")]),
    ]),
  ]);
}

function staffOrderCard(o) {
  const photo = State.photoCache[o.user_id] || "";
  const cups = o.cup_numbers || [];
  const busyBtns = [];
  const run = async (btn, fn, okMsg) => {
    busyBtns.forEach((b) => (b.disabled = true));
    try { await fn(); if (okMsg) toast(okMsg, "good"); await Promise.all([loadStaffOrders(), loadCups()]); render(); }
    catch (e) { toast(errText(e), "bad"); busyBtns.forEach((b) => (b.disabled = false)); }
  };
  const mk = (cls, label, fn) => { const b = h("button", { class: "btn sm " + cls, type: "button", onClick: () => fn(b) }, label); busyBtns.push(b); return b; };

  const cupChips = cups.map((n) => {
    const cup = State.cups.find((c) => c.number === n);
    const out = cup && cup.status === "in_use" && cup.order_id === o.id;
    return out
      ? h("button", { class: "cupChip", type: "button", title: "Toucher quand la tasse est revenue", onClick: () => run(null, () => staffReturnCup(n), `Tasse ${n} disponible`) }, `Tasse ${n} · retourner`)
      : h("span", { class: "cupChip back" }, `Tasse ${n} ✓`);
  });

  const actions = h("div", { class: "actions" });
  if (o.status === "NOUVELLE") {
    actions.appendChild(mk("", "＋ Tasse auto", (b) => run(b, async () => { const n = await staffAssignCup(o.id); toast(`Tasse n° ${n} attribuée`, "good"); })));
    const avail = State.cups.filter((c) => c.status === "available");
    if (avail.length) {
      const sel = h("select", { style: "width:auto;min-height:36px;padding:6px 10px" }, [h("option", { value: "" }, "Choisir…")].concat(avail.map((c) => h("option", { value: String(c.number) }, "n° " + c.number))));
      sel.addEventListener("change", () => { if (sel.value) run(null, async () => { await staffAssignCup(o.id, Number(sel.value)); }, "Tasse attribuée"); });
      actions.appendChild(sel);
    }
    actions.appendChild(mk("good", "✔ Complétée", (b) => run(b, () => staffSetStatus(o.id, "COMPLÉTÉE"), "Commande complétée")));
    actions.appendChild(mk("bad", "Annuler", async (b) => {
      const ok = await confirmDialog("Annuler la commande ?", `${o.user_name} sera remboursé·e de ${money(o.total_cents)} et les tasses seront libérées.`, "Annuler la commande", "Retour", true);
      if (ok) run(b, () => staffSetStatus(o.id, "ANNULÉE"), "Commande annulée et remboursée");
    }));
  } else if (o.status === "COMPLÉTÉE") {
    actions.appendChild(mk("", "↩ Remettre en nouvelle", (b) => run(b, () => staffSetStatus(o.id, "NOUVELLE"))));
  }

  return h("div", { class: "order" }, [
    h("div", { class: "orderHead" }, [
      avatar(o.user_name, photo, 56, !photo),
      h("div", { class: "who" }, [
        h("b", {}, o.user_name),
        h("div", { class: "small" }, [`${fmtTime(o.created_at_ms)}${dateKey(o.created_at_ms) !== State.staffDate ? " · " + fmtDate(o.created_at_ms) : ""} · `, h("b", {}, o.mode === "pickup" ? "Ramassage" : "📍 " + o.location)]),
        h("div", { class: "small muted" }, `Total ${money(o.total_cents)}${o.free_item ? " · 🎁 gratuite" : ""}`),
      ]),
      h("span", { class: "status " + o.status }, o.status),
    ]),
    h("div", {}, groupItems(o.items).map(({ it, count }) => staffItemRow(it, count))),
    o.comment ? h("div", { class: "banner", style: "margin:8px 0 0" }, "💬 " + o.comment) : null,
    cups.length ? h("div", { class: "cups" }, cupChips) : null,
    actions,
  ]);
}

function staffItemRow(it, count) {
  const addons = [];
  if (it.syrup) addons.push({ icon: it.syrup.icon, label: LEVELS_SHORT[it.syrup.level] || "", title: it.syrup.name });
  ADDONS.forEach((a) => { if (it[a.key]) addons.push({ icon: a.icon, label: "×" + it[a.key], title: a.label }); });
  if (it.marshmallows) addons.push({ icon: "guimauves.jpg", label: "", title: "Guimauves" });
  if (it.dairy_free) addons.push({ emoji: "🌱", label: "sans lait", title: "Sans produits laitiers" });
  return h("div", { class: "itemLine" }, [
    it.icon ? iconImg(it.icon, { class: "big", alt: it.name, onClick: () => openImage(it.icon, it.name) }) : null,
    h("div", { class: "desc" }, [
      h("b", {}, (count > 1 ? count + " × " : "") + it.name + (it.free ? " 🎁" : "")),
      h("div", { class: "addons" }, addons.map((a) => h("span", { class: "addon", title: a.title }, [
        a.icon ? h("img", { src: iconUrl(a.icon), alt: a.title }) : h("span", { style: "padding-left:6px" }, a.emoji), a.label || a.title]))),
    ]),
  ]);
}

function exportOrdersCsv() {
  const rows = [["Date", "Heure", "Client", "Local", "Mode", "Boissons", "Total", "Statut", "Tasses", "Commentaire"].join(",")];
  State.staffOrders.filter((o) => dateKey(o.created_at_ms) === State.staffDate).sort((a, b) => a.created_at_ms - b.created_at_ms).forEach((o) => {
    const items = (o.items || []).map((it) => `${it.name}${describeItem(it) ? " [" + describeItem(it) + "]" : ""}${it.free ? " (GRATUIT)" : ""}`).join(" ; ");
    rows.push([fmtDate(o.created_at_ms), fmtTime(o.created_at_ms), o.user_name, o.location, o.mode === "pickup" ? "Ramassage" : "Livraison", items,
      (o.total_cents / 100).toFixed(2).replace(".", ","), o.status, (o.cup_numbers || []).join(" "), o.comment || ""].map(csvEsc).join(","));
  });
  downloadText(`commandes_${State.staffDate}.csv`, rows.join("\n"));
}

/* =========================================================
   CLIENTS : portefeuille + photos
========================================================= */
function renderStaffClients() {
  const q = normKey(StaffUI.userSearch);
  const low = (State.settings || {}).low_balance_cents || 0;
  let list = State.users.filter((u) => !q || normKey(u.name).includes(q) || normKey(u.email).includes(q) || normKey(u.location).includes(q));
  if (StaffUI.userFilter === "nophoto") list = list.filter((u) => !u.has_photo);
  if (StaffUI.userFilter === "low") list = list.filter((u) => u.balance_cents < low);
  const total = list.length;
  const shown = list.slice(0, StaffUI.userLimit);
  ensurePhotos(shown.filter((u) => u.has_photo).map((u) => u.id)).then((n) => { if (n) rerenderClientsList(); }).catch(() => {});

  const search = h("input", { type: "search", placeholder: "Rechercher un nom, un courriel, un local…", value: StaffUI.userSearch, onInput: (e) => {
    StaffUI.userSearch = e.target.value; StaffUI.userLimit = 60; rerenderClientsList();
  } });
  const filters = h("div", { class: "row" }, [["all", "Tous"], ["low", "Solde bas"], ["nophoto", "Sans photo"]].map(([k, label]) =>
    h("button", { class: "btn sm" + (StaffUI.userFilter === k ? " on" : ""), type: "button", onClick: () => { StaffUI.userFilter = k; StaffUI.userLimit = 60; render(); } }, label)));

  const listEl = h("div", { id: "clientsList" }, clientRows(shown, total));
  return staffShell("staff_clients", [
    h("div", { class: "card" }, [
      h("div", { class: "row between" }, [h("h2", { style: "margin:0" }, `Clients (${State.users.length})`),
        h("span", { class: "pill" }, ["Argent dans les portefeuilles : ", h("b", {}, money(State.users.reduce((s, u) => s + u.balance_cents, 0)))])]),
      h("div", { style: "margin:12px 0" }, search), filters,
      h("div", { class: "divider" }), listEl,
    ]),
  ]);
}
function rerenderClientsList() {
  const el = $("#clientsList"); if (!el) return;
  const q = normKey(StaffUI.userSearch);
  const low = (State.settings || {}).low_balance_cents || 0;
  let list = State.users.filter((u) => !q || normKey(u.name).includes(q) || normKey(u.email).includes(q) || normKey(u.location).includes(q));
  if (StaffUI.userFilter === "nophoto") list = list.filter((u) => !u.has_photo);
  if (StaffUI.userFilter === "low") list = list.filter((u) => u.balance_cents < low);
  const shown = list.slice(0, StaffUI.userLimit);
  el.innerHTML = "";
  clientRows(shown, list.length).forEach((n) => el.appendChild(n));
  ensurePhotos(shown.filter((u) => u.has_photo).map((u) => u.id)).then((n) => { if (n) rerenderClientsList(); }).catch(() => {});
}
function clientRows(shown, total) {
  const low = (State.settings || {}).low_balance_cents || 0;
  const rows = shown.map((u) => h("div", { class: "userRow" }, [
    avatar(u.name, State.photoCache[u.id], 48, !u.has_photo),
    h("div", { class: "meta" }, [h("b", {}, u.name), h("small", {}, `${u.location || "—"} · ${u.email || ""}`)]),
    h("span", { class: "pill " + (u.balance_cents < low ? "warn" : "good") }, [h("b", {}, money(u.balance_cents))]),
    h("div", { class: "row", style: "gap:6px" }, [
      h("button", { class: "btn sm good", type: "button", onClick: () => openTopup(u) }, "＋ Recharger"),
      h("button", { class: "btn sm", type: "button", onClick: () => openUserEdit(u) }, "Profil / photo"),
      h("button", { class: "btn sm", type: "button", onClick: () => openUserHistory(u) }, "Historique"),
    ]),
  ]));
  if (!rows.length) rows.push(h("p", { class: "muted" }, "Aucun client trouvé."));
  if (total > shown.length) rows.push(h("button", { class: "btn block", type: "button", style: "margin-top:10px", onClick: () => { StaffUI.userLimit += 60; rerenderClientsList(); } }, `Afficher plus (${total - shown.length})`));
  return rows;
}

function openTopup(u) {
  let sign = 1;
  const amount = h("input", { type: "number", inputmode: "decimal", step: "0.25", min: "0", placeholder: "Montant ($)", style: "font-size:1.4rem;font-weight:800" });
  const note = h("input", { placeholder: "Note (optionnel) — ex : argent comptant" });
  const err = errBox();
  const quick = h("div", { class: "row" }, [5, 10, 20, 50].map((n) => h("button", { class: "btn", type: "button", onClick: () => { amount.value = String(n); } }, n + " $")));
  const segAdd = h("button", { class: "btn on", type: "button" }, "＋ Ajouter");
  const segSub = h("button", { class: "btn", type: "button" }, "− Retirer (correction)");
  segAdd.onclick = () => { sign = 1; segAdd.classList.add("on"); segSub.classList.remove("on"); };
  segSub.onclick = () => { sign = -1; segSub.classList.add("on"); segAdd.classList.remove("on"); };
  const go = h("button", { class: "btn primary block", type: "button", style: "margin-top:14px" }, "Confirmer");
  go.onclick = async () => {
    err.classList.remove("show");
    const cents = Math.round(parseFloat(String(amount.value).replace(",", ".")) * 100);
    if (!isFinite(cents) || cents <= 0) return showErr(err, "Entre un montant valide.");
    go.disabled = true;
    try {
      const r = await staffTopup(u.id, sign * cents, note.value);
      u.balance_cents = r.balance_cents;
      closeSheet(); toast(`${u.name} : nouveau solde ${money(r.balance_cents)} ✅`, "good"); render();
    } catch (e) { showErr(err, errText(e)); go.disabled = false; }
  };
  openSheet("Recharger — " + u.name, [
    h("p", { class: "muted" }, ["Solde actuel : ", h("b", {}, money(u.balance_cents))]),
    h("div", { class: "seg", style: "margin-bottom:10px" }, [segAdd, segSub]),
    quick, h("label", {}, "Montant"), amount, h("label", {}, "Note"), note, go, err,
  ]);
  setTimeout(() => amount.focus(), 80);
}

function openUserEdit(u) {
  const err = errBox();
  const name = h("input", { value: u.name }); const loc = h("input", { value: u.location || "" });
  const preview = h("div", {}, avatar(u.name, State.photoCache[u.id], 96, !u.has_photo));
  const picker = photoPicker(u.has_photo ? "Changer la photo" : "Ajouter une photo", async (dataUrl) => {
    await staffSetPhoto(u.id, dataUrl); u.has_photo = true; preview.innerHTML = ""; preview.appendChild(avatar(u.name, dataUrl, 96)); toast("Photo enregistrée ✅", "good"); render();
  });
  const save = h("button", { class: "btn good block", type: "button", style: "margin-top:14px", onClick: async () => {
    try { await staffUpdateUser(u.id, name.value, loc.value); u.name = name.value.trim(); u.location = loc.value.trim(); closeSheet(); toast("Profil mis à jour ✅", "good"); render(); }
    catch (e) { showErr(err, errText(e)); }
  } }, "Enregistrer le nom / local");
  openSheet("Profil — " + u.name, [
    h("div", { class: "row", style: "gap:14px" }, [preview, h("div", {}, [h("div", { class: "muted small" }, u.email || ""), picker])]),
    h("p", { class: "muted small", style: "margin-top:10px" }, "Astuce : télécharge les photos depuis le dossier OneDrive de l'école, puis choisis-les ici (recadrées automatiquement en carré)."),
    h("label", {}, "Nom"), name, h("label", {}, "Local par défaut"), loc, save, err,
  ]);
}

async function openUserHistory(u) {
  const body = h("div", {}, h("div", { class: "spinner" }));
  openSheet("Historique — " + u.name, body);
  try {
    const tx = await staffUserTx(u.id, 60);
    body.innerHTML = "";
    body.appendChild(h("p", { class: "muted" }, ["Solde : ", h("b", {}, money(u.balance_cents))]));
    if (!tx.length) body.appendChild(h("p", { class: "muted" }, "Aucun mouvement."));
    tx.forEach((t) => {
      const label = { topup: "Recharge", order: "Commande", refund: "Remboursement", adjust: "Ajustement" }[t.kind] || t.kind;
      body.appendChild(h("div", { class: "txRow" }, [
        h("span", {}, [`${fmtDate(new Date(t.created_at).getTime())} ${fmtTime(new Date(t.created_at).getTime())} · ${label}`, t.note ? h("span", { class: "muted small" }, " — " + t.note) : null]),
        h("span", { class: t.amount_cents >= 0 ? "pos" : "neg" }, (t.amount_cents >= 0 ? "+" : "−") + money(Math.abs(t.amount_cents))),
      ]));
    });
  } catch (e) { body.innerHTML = ""; body.appendChild(h("p", { class: "error show" }, errText(e))); }
}

/* =========================================================
   TASSES
========================================================= */
function renderStaffCups() {
  const byOrder = {};
  State.staffOrders.forEach((o) => { byOrder[o.id] = o; });
  const inUse = State.cups.filter((c) => c.status === "in_use").length;
  const countInput = h("input", { type: "number", min: "1", max: "300", value: String((State.settings || {}).cup_count || State.cups.length), style: "max-width:110px" });
  const saveCount = h("button", { class: "btn sm good", type: "button", onClick: async () => {
    try { await staffSetCupCount(parseInt(countInput.value, 10)); await Promise.all([loadSettings(), loadCups()]); toast("Nombre de tasses mis à jour ✅", "good"); render(); }
    catch (e) { toast(errText(e), "bad"); }
  } }, "Enregistrer");
  const tiles = State.cups.map((c) => {
    const o = c.order_id ? byOrder[c.order_id] : null;
    const use = c.status === "in_use";
    return h("button", { class: "cupTile " + (use ? "use" : "free"), type: "button",
      onClick: async () => {
        if (!use) return toast(`Tasse ${c.number} disponible`);
        const ok = await confirmDialog(`Tasse n° ${c.number}`, `${o ? "Commande de " + o.user_name + ". " : ""}Marquer cette tasse comme retournée et disponible ?`, "Tasse retournée", "Non");
        if (ok) { try { await staffReturnCup(c.number); await loadCups(); toast(`Tasse ${c.number} disponible ✅`, "good"); render(); } catch (e) { toast(errText(e), "bad"); } }
      } }, [h("b", {}, String(c.number)), h("small", {}, use ? (o ? o.user_name : "en usage") : "disponible")]);
  });
  return staffShell("staff_cups", [h("div", { class: "card" }, [
    h("div", { class: "row between" }, [h("h2", { style: "margin:0" }, "Tasses numérotées"), h("span", { class: "pill" }, [h("b", {}, String(inUse)), ` en usage / ${State.cups.length}`])]),
    h("p", { class: "muted small" }, "Une tasse est attribuée à chaque commande (bouton « Tasse auto » ou choix manuel). Touche une tasse en usage quand elle est revenue."),
    h("div", { class: "row", style: "margin:10px 0" }, [h("b", {}, "Nombre total de tasses"), countInput, saveCount]),
    h("div", { class: "cupGrid" }, tiles),
  ])]);
}

/* =========================================================
   MENU
========================================================= */
function renderStaffMenu() {
  if (!StaffUI.menuDraft) StaffUI.menuDraft = JSON.parse(JSON.stringify(menu()));
  const m = StaffUI.menuDraft;
  const slug = (s) => normKey(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";

  const drinkRows = (m.drinks || []).map((d, i) => h("div", { class: "editRow" }, [
    h("input", { value: d.name, onChange: (e) => { d.name = e.target.value.trim() || d.name; } }),
    h("input", { type: "number", step: "0.25", min: "0", value: String((d.priceCents || 0) / 100), onChange: (e) => { d.priceCents = Math.round((parseFloat(e.target.value) || 0) * 100); } }),
    h("label", { class: "row", style: "margin:0;color:var(--text);cursor:pointer" }, [h("input", { type: "checkbox", checked: d.available !== false, onChange: (e) => { d.available = e.target.checked; } }), "Offert"]),
    h("button", { class: "btn sm bad", type: "button", onClick: () => { if (confirm("Supprimer cette boisson du menu ?")) { m.drinks.splice(i, 1); render(); } } }, "Supprimer"),
  ]));
  const syrupRows = (m.syrups || []).map((s) => h("div", { class: "editRow", style: "grid-template-columns:1fr auto" }, [
    h("input", { value: s.name, onChange: (e) => { s.name = e.target.value.trim() || s.name; } }),
    h("label", { class: "row", style: "margin:0;color:var(--text);cursor:pointer" }, [h("input", { type: "checkbox", checked: s.available !== false, onChange: (e) => { s.available = e.target.checked; } }), "Offert"]),
  ]));

  const newName = h("input", { placeholder: "Nom de la nouvelle boisson" });
  const newPrice = h("input", { type: "number", step: "0.25", min: "0", value: "2", style: "max-width:110px" });
  const addBtn = h("button", { class: "btn sm good", type: "button", onClick: () => {
    const name = newName.value.trim(); if (!name) return toast("Entre un nom.", "bad");
    let id = slug(name); while ((m.drinks || []).some((d) => d.id === id)) id += "-2";
    m.drinks.push({ id, name, priceCents: Math.round((parseFloat(newPrice.value) || 0) * 100), icon: "", available: true });
    render();
  } }, "Ajouter");
  const surcharge = h("input", { type: "number", step: "0.05", min: "0", value: String((m.syrupSurchargeCents || 0) / 100), style: "max-width:110px", onChange: (e) => { m.syrupSurchargeCents = Math.round((parseFloat(e.target.value) || 0) * 100); } });

  const save = h("button", { class: "btn primary block", type: "button", style: "margin-top:14px", onClick: async () => {
    try { await staffSaveSetting("menu", m); StaffUI.menuDraft = null; await loadSettings(); toast("Menu enregistré ✅", "good"); render(); }
    catch (e) { toast(errText(e), "bad"); }
  } }, "💾 Enregistrer le menu");

  return staffShell("staff_menu", [h("div", { class: "grid2 even" }, [
    h("div", { class: "card" }, [h("h2", {}, "Boissons"), h("p", { class: "muted small" }, "Prix en dollars. Décoche « Offert » pour masquer une boisson sans la supprimer."), h("div", {}, drinkRows),
      h("div", { class: "divider" }), h("div", { class: "row" }, [newName, newPrice, addBtn]),
      h("p", { class: "muted small", style: "margin-top:6px" }, "Les pictogrammes des nouvelles boissons peuvent être ajoutés plus tard par le développeur.")]),
    h("div", { class: "card" }, [h("h2", {}, "Sirops"), h("div", {}, syrupRows),
      h("div", { class: "divider" }), h("div", { class: "row" }, [h("b", {}, "Supplément avec sirop ($)"), surcharge]), save]),
  ])]);
}

/* =========================================================
   HORAIRES
========================================================= */
function renderStaffHours() {
  const s = State.settings;
  const hours = JSON.parse(JSON.stringify(s.hours || {}));
  const periods = JSON.parse(JSON.stringify(s.periods || []));
  const persistHours = async () => { try { await staffSaveSetting("hours", hours); await loadSettings(); render(); } catch (e) { toast(errText(e), "bad"); } };

  const grid = h("div", { class: "periodGrid" }, DAY_KEYS.map((day) => h("div", { class: "dayBox" }, [
    h("div", { class: "row between" }, [h("b", {}, DAY_LABELS[day]), h("span", { class: "pill" }, `${(hours[day] || []).length} période(s)`)]),
    h("div", { class: "pRow" }, periods.map((p) => h("button", { class: "pBtn" + ((hours[day] || []).includes(p.k) ? " on" : ""), type: "button", onClick: () => {
      const arr = hours[day] || []; const i = arr.indexOf(p.k);
      if (i >= 0) arr.splice(i, 1); else arr.push(p.k);
      hours[day] = arr.sort((a, b) => periods.findIndex((x) => x.k === a) - periods.findIndex((x) => x.k === b));
      persistHours();
    } }, p.k))),
  ])));

  const perRows = periods.map((p) => h("div", { class: "row", style: "margin:6px 0" }, [
    h("b", { style: "width:34px" }, p.k),
    h("input", { type: "time", value: p.start, style: "max-width:140px", onChange: (e) => { p.start = e.target.value; } }), "→",
    h("input", { type: "time", value: p.end, style: "max-width:140px", onChange: (e) => { p.end = e.target.value; } }),
  ]));
  const savePer = h("button", { class: "btn sm good", type: "button", onClick: async () => {
    try { await staffSaveSetting("periods", periods); await loadSettings(); toast("Périodes enregistrées ✅", "good"); render(); } catch (e) { toast(errText(e), "bad"); }
  } }, "Enregistrer les heures des périodes");

  const unset = !timedPeriods().length;
  return staffShell("staff_hours", [unset ? h("div", { class: "banner" }, [h("b", {}, "Heures des périodes non renseignées. "), "Tant qu'elles sont vides, le café est considéré ouvert en tout temps (aucun message « fermé »). Entre les heures de chaque période dans la carte de droite, puis enregistre."]) : null, h("div", { class: "grid2 even" }, [
    h("div", { class: "card" }, [h("h2", {}, "Jours et périodes d'ouverture"), h("p", { class: "muted small" }, "Active les périodes où le café est ouvert. Hors de ces périodes, les clients voient « fermé » mais peuvent quand même commander pour la prochaine ouverture."), grid]),
    h("div", { class: "card" }, [h("h2", {}, "Heures des périodes"), h("p", { class: "muted small" }, "À ajuster selon l'horaire de l'école."), h("div", {}, perRows), h("div", { style: "margin-top:10px" }, savePer)]),
  ])]);
}

/* =========================================================
   RAPPORTS
========================================================= */
function monthRange(ym) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return [`${ym}-01`, `${ym}-${pad2(last)}`];
}
async function loadReport() {
  StaffUI.reportBusy = true; render();
  try { const [from, to] = monthRange(StaffUI.reportMonth); StaffUI.report = await staffReport(from, to); }
  catch (e) { toast(errText(e), "bad"); StaffUI.report = null; }
  StaffUI.reportBusy = false; render();
}
function renderStaffReport() {
  const r = StaffUI.report;
  // chargement automatique à l'ouverture de l'onglet (une seule tentative, « Actualiser » permet de réessayer)
  if (!r && !StaffUI.reportBusy && !StaffUI.reportTried) { StaffUI.reportTried = true; setTimeout(loadReport, 0); }
  const monthInput = h("input", { type: "month", value: StaffUI.reportMonth, style: "max-width:200px", onChange: (e) => { StaffUI.reportMonth = e.target.value || StaffUI.reportMonth; StaffUI.report = null; loadReport(); } });
  const body = [];
  if (StaffUI.reportBusy) body.push(h("div", { class: "spinner" }));
  else if (!r) body.push(h("p", { class: "muted" }, "Choisis un mois pour voir le roulement d'argent."));
  else {
    const kpi = (label, val) => h("div", { class: "kpi" }, [h("small", {}, label), h("b", {}, val)]);
    body.push(h("div", { class: "kpis" }, [
      kpi("Ventes (boissons)", money(r.sales_cents)), kpi("Recharges encaissées", money(r.topups_cents)),
      kpi("Remboursements", money(r.refunds_cents)), kpi("Argent dans les portefeuilles (maintenant)", money(r.outstanding_cents)),
      kpi("Commandes", String(r.orders)), kpi("Boissons servies", String(r.drinks)), kpi("Boissons gratuites", String(r.free_drinks)), kpi("Corrections manuelles", money(r.adjusts_cents)),
    ]));
    body.push(h("p", { class: "muted small" }, "Ventes = argent « dépensé » en boissons. Recharges = argent comptant remis au café. L'écart entre les deux est l'argent qui reste dans les portefeuilles."));
    const rows = (r.days || []).map((d) => h("tr", {}, [h("td", {}, d.d), h("td", {}, String(d.orders)), h("td", {}, String(d.drinks)), h("td", {}, money(d.sales)), h("td", {}, money(d.topups))]));
    body.push(h("div", { class: "tblWrap" }, h("table", { class: "tbl" }, [h("thead", {}, h("tr", {}, ["Jour", "Commandes", "Boissons", "Ventes", "Recharges"].map((t) => h("th", {}, t)))), h("tbody", {}, rows)])));
    if ((r.top || []).length) body.push(h("div", { style: "margin-top:14px" }, [h("h3", {}, "Boissons les plus populaires"), h("p", {}, r.top.map((t) => `${t.name} (${t.n})`).join(" · "))]));
    body.push(h("div", { class: "actions" }, [
      h("button", { class: "btn", type: "button", onClick: () => exportReportCsv(r) }, "⬇ Résumé par jour (CSV)"),
      h("button", { class: "btn", type: "button", onClick: () => exportTxCsv() }, "⬇ Détail des mouvements du portefeuille (CSV)"),
    ]));
  }
  return staffShell("staff_report", [h("div", { class: "card" }, [
    h("div", { class: "row between" }, [h("h2", { style: "margin:0" }, "Rapport mensuel"), h("div", { class: "row" }, [monthInput, h("button", { class: "btn sm", type: "button", onClick: () => loadReport() }, "Actualiser")])]),
    h("div", { class: "divider" }), h("div", {}, body),
  ])]);
}
function exportReportCsv(r) {
  const c = (v) => (v / 100).toFixed(2).replace(".", ",");
  const rows = [["Jour", "Commandes", "Boissons", "Ventes ($)", "Recharges ($)", "Corrections ($)", "Remboursements ($)"].join(",")];
  (r.days || []).forEach((d) => rows.push([d.d, d.orders, d.drinks, c(d.sales), c(d.topups), c(d.adjusts), c(d.refunds)].map(csvEsc).join(",")));
  rows.push(["TOTAL", r.orders, r.drinks, c(r.sales_cents), c(r.topups_cents), c(r.adjusts_cents), c(r.refunds_cents)].map(csvEsc).join(","));
  downloadText(`rapport_${StaffUI.reportMonth}.csv`, rows.join("\n"));
}
async function exportTxCsv() {
  try {
    const [from, to] = monthRange(StaffUI.reportMonth);
    const [y, m] = StaffUI.reportMonth.split("-").map(Number);
    const tx = await staffTxBetween(new Date(y, m - 1, 1).toISOString(), new Date(y, m, 1).toISOString());
    const names = {}; State.users.forEach((u) => { names[u.id] = u.name; });
    if (!State.users.length) await loadUsers().then(() => State.users.forEach((u) => { names[u.id] = u.name; }));
    const label = { topup: "Recharge", order: "Commande", refund: "Remboursement", adjust: "Correction" };
    const rows = [["Date", "Heure", "Client", "Type", "Montant ($)", "Solde après ($)", "Note"].join(",")];
    tx.forEach((t) => { const ms = new Date(t.created_at).getTime();
      rows.push([fmtDate(ms), fmtTime(ms), names[t.user_id] || t.user_id, label[t.kind] || t.kind, (t.amount_cents / 100).toFixed(2).replace(".", ","), (t.balance_after / 100).toFixed(2).replace(".", ","), t.note || ""].map(csvEsc).join(",")); });
    downloadText(`portefeuille_${from.slice(0, 7)}.csv`, rows.join("\n"));
  } catch (e) { toast(errText(e), "bad"); }
}

/* =========================================================
   RÉGLAGES
========================================================= */
function renderStaffSettings() {
  const s = State.settings;
  const lowInput = h("input", { type: "number", step: "0.5", min: "0", value: String(s.low_balance_cents / 100), style: "max-width:120px" });
  const creditInput = h("input", { type: "number", step: "1", min: "0", value: String((s.credit_limit_cents || 0) / 100), style: "max-width:120px" });
  const newPass = h("input", { type: "password", autocomplete: "new-password", placeholder: "Nouveau mot de passe staff (8 caractères min.)" });
  const newPass2 = h("input", { type: "password", autocomplete: "new-password", placeholder: "Répète le nouveau mot de passe" });
  const content = h("div", { class: "grid2 even" }, [
    h("div", { class: "card" }, [
      h("h2", {}, "Commandes"),
      h("label", { class: "row", style: "color:var(--text);cursor:pointer" }, [
        h("input", { type: "checkbox", checked: s.require_photo, onChange: async (e) => { try { await staffSaveSetting("require_photo", e.target.checked); await loadSettings(); toast("Réglage enregistré ✅", "good"); render(); } catch (er) { toast(errText(er), "bad"); } } }),
        h("span", {}, "Photo de profil obligatoire pour commander")]),
      h("div", { class: "divider" }),
      h("label", { style: "margin-top:0" }, "Découvert maximal autorisé ($) — un client peut commander à crédit jusqu'à ce montant négatif"),
      h("div", { class: "row" }, [creditInput, h("button", { class: "btn sm good", type: "button", onClick: async () => {
        try { await staffSaveSetting("credit_limit_cents", Math.round((parseFloat(creditInput.value) || 0) * 100)); await loadSettings(); toast("Découvert enregistré ✅", "good"); render(); } catch (e) { toast(errText(e), "bad"); }
      } }, "Enregistrer")]),
      h("div", { class: "divider" }),
      h("label", { style: "margin-top:0" }, "Alerte « solde bas » sous ($)"),
      h("div", { class: "row" }, [lowInput, h("button", { class: "btn sm good", type: "button", onClick: async () => {
        try { await staffSaveSetting("low_balance_cents", Math.round((parseFloat(lowInput.value) || 0) * 100)); await loadSettings(); toast("Seuil enregistré ✅", "good"); render(); } catch (e) { toast(errText(e), "bad"); }
      } }, "Enregistrer")]),
    ]),
    h("div", { class: "card" }, [
      h("h2", {}, "Notifications"),
      pushSupported()
        ? h("div", {}, [h("p", { class: "muted small" }, "Active les notifications sur cet appareil pour être averti à chaque nouvelle commande."),
            h("button", { class: "btn block", type: "button", onClick: async () => { try { await enablePush("staff"); toast("Notifications activées ✅", "good"); } catch (e) { toast(pushErrorText(e), "bad"); } } }, "🔔 Activer les notifications")])
        : h("p", { class: "muted" }, "Les notifications push ne sont pas encore configurées."),
      h("div", { class: "divider" }),
      h("p", { class: "muted small" }, "Sur iPad/iPhone : ouvre le site dans Safari → Partager → « Sur l'écran d'accueil », puis lance l'app depuis l'icône."),
    ]),
  ]);
  const passCard = h("div", { class: "card" }, [
    h("h2", {}, "Mot de passe staff"),
    h("p", { class: "muted small" }, "Ce mot de passe est partagé par tous les membres du café : quiconque le connaît peut entrer dans l'espace staff. Change-le si quelqu'un d'externe l'a obtenu ; les appareils déjà connectés restent connectés jusqu'à leur déconnexion."),
    newPass, h("div", { style: "height:8px" }), newPass2,
    h("div", { style: "margin-top:10px" }, h("button", { class: "btn good", type: "button", onClick: async () => {
      if (newPass.value.length < 8) return toast("8 caractères minimum.", "bad");
      if (newPass.value !== newPass2.value) return toast("Les deux mots de passe ne sont pas identiques.", "bad");
      try { const r = await sb.auth.updateUser({ password: newPass.value }); if (r.error) throw r.error; newPass.value = ""; newPass2.value = ""; toast("Mot de passe staff modifié ✅", "good"); }
      catch (e) { toast(errText(e, "Modification impossible."), "bad"); }
    } }, "Changer le mot de passe")),
  ]);
  return staffShell("staff_settings", [content, passCard]);
}
