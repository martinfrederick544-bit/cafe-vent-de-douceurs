/* =========================================================
   Espace LIVRAISON : 2e groupe, un mot de passe partagé.
   Voit seulement les commandes « à livrer » (pas les ramassages) et les marque « Livré ».
========================================================= */

function renderDeliveryLogin() {
  const err = errBox();
  const pass = h("input", { type: "password", autocomplete: "current-password", placeholder: "Mot de passe livraison", required: true, autofocus: true });
  const btn = h("button", { class: "btn primary block", type: "submit" }, "Entrer dans l'espace livraison");
  const form = h("form", {}, [h("label", {}, "Mot de passe livraison"), pass, h("div", { style: "margin-top:16px" }, btn), err]);
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); err.classList.remove("show"); btn.disabled = true;
    try {
      await unsubscribePushForThisDevice();
      const r = await sb.auth.signInWithPassword({ email: VD.DELIVERY_EMAIL, password: pass.value });
      if (r.error) throw new Error(/invalid login/i.test(r.error.message) ? "BAD_DELIVERY_PASSWORD" : r.error.message);
      State.session = r.data.session;
      await loadProfile();
      if (!State.profile || !State.profile.is_delivery) { await sb.auth.signOut(); throw new Error("NOT_DELIVERY"); }
      await loadDelivery().catch(() => {});
      go("livraison");
    } catch (ex) { showErr(err, errText(ex, "Connexion impossible.")); }
    finally { btn.disabled = false; }
  });
  return h("div", {}, [
    brandHeader([h("a", { class: "btn sm", href: "#login" }, "Espace client")]),
    h("main", { class: "wrap narrow" }, [
      h("img", { class: "authLogo", src: "/logo.png", alt: "" }),
      h("h2", { class: "authTitle" }, "Espace livraison"),
      h("p", { class: "muted", style: "text-align:center" }, "Vois les cafés à livrer et marque-les « Livré »."),
      h("div", { class: "card" }, form),
    ]),
  ]);
}

function deliveryCard(o) {
  const done = !!o.delivered_at;
  const cups = o.cup_numbers || [];
  const btn = h("button", { class: "btn " + (done ? "sm" : "good big"), type: "button" }, done ? "↩ Annuler « livré »" : "✔ Livré");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      await deliveryMark(o.id, !done);
      toast(done ? "Remise à livrer" : "Marquée livrée ✅", "good");
      await loadDelivery(); render();
    } catch (e) { toast(errText(e), "bad"); btn.disabled = false; }
  });
  return h("div", { class: "order deliv" + (done ? " done" : "") }, [
    h("div", { class: "orderHead" }, [
      avatar(o.user_name, o.photo, 72, !o.photo),
      h("div", { class: "who" }, [
        h("b", { style: "font-size:1.15rem" }, o.user_name),
        h("div", { class: "delivLoc" }, "📍 " + o.location),
        h("div", { class: "small muted" }, "Commandé à " + fmtTime(o.created_at_ms)),
      ]),
    ]),
    cups.length ? h("div", { class: "cups" }, cups.map((n) => h("span", { class: "cupChip back", style: "text-decoration:none;opacity:1;font-size:1rem" }, "Tasse n° " + n))) : null,
    h("div", {}, groupItems(o.items).map(({ it, count }) => h("div", { class: "itemLine" }, [
      it.icon ? iconImg(it.icon, { class: "big", alt: it.name, style: "width:44px;height:44px" }) : null,
      h("div", { class: "desc" }, [h("b", {}, (count > 1 ? count + " × " : "") + it.name), h("div", { class: "muted small" }, describeItem(it) || "Nature")]),
    ]))),
    o.comment ? h("div", { class: "banner", style: "margin:8px 0 0" }, "💬 " + o.comment) : null,
    h("div", { class: "actions" }, btn),
  ]);
}

function renderDelivery() {
  const isStaff = State.profile && State.profile.is_staff;
  const top = brandHeader([
    isStaff ? h("a", { class: "btn sm", href: "#staff" }, "Espace staff") : null,
    h("button", { class: "btn sm", type: "button", onClick: () => signOut() }, "Déconnexion"),
  ]);
  const todo = State.delivery.filter((o) => !o.delivered_at);
  const done = State.delivery.filter((o) => o.delivered_at);
  const nb = notifBanner("delivery");
  return h("div", {}, [top, h("main", { class: "wrap narrow" }, [
    nb,
    h("div", { class: "colHead" }, [h("h2", { style: "margin:0" }, "À livrer"), h("span", { class: "count" }, String(todo.length))]),
    todo.length ? todo.map(deliveryCard) : h("div", { class: "card muted" }, "Rien à livrer pour le moment ☕"),
    done.length ? [h("div", { class: "colHead", style: "margin-top:22px" }, [h("h2", { style: "margin:0" }, "Livrées récemment"), h("span", { class: "count" }, String(done.length))]), done.map(deliveryCard)] : null,
  ])]);
}
