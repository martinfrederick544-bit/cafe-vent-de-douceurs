/* =========================================================
   Onglet LIVRAISONS de l'espace staff : seulement les commandes « à livrer » (pas les ramassages), marquées « Livré ».
========================================================= */

/** Vue très grande pour reconnaître le client et la commande de loin. */
function openDeliveryBig(o) {
  openSheet(o.user_name, h("div", { style: "text-align:center" }, [
    o.photo ? h("img", { src: o.photo, alt: o.user_name, style: "width:min(280px,80vw);height:min(280px,80vw);object-fit:cover;border-radius:24px" }) : avatar(o.user_name, "", 160, true),
    h("h2", { style: "margin:12px 0 0;font-size:1.8rem" }, o.user_name),
    h("div", { style: "font-size:3rem;font-weight:900;margin:8px 0;line-height:1.1" }, "📍 " + o.location),
    o.floor ? h("div", { style: "font-size:1.6rem;font-weight:800" }, o.floor) : null,
    h("div", { style: "display:flex;gap:10px;flex-wrap:wrap;justify-content:center" }, (o.cup_numbers || []).map((n) =>
      h("span", { class: "cupChip back", style: "font-size:2.2rem;padding:8px 22px;opacity:1;text-decoration:none" }, "Tasse n° " + n))),
  ]));
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
    h("div", { class: "orderHead", style: "cursor:pointer", title: "Agrandir", onClick: () => openDeliveryBig(o) }, [
      avatar(o.user_name, o.photo, 72, !o.photo),
      h("div", { class: "who" }, [
        h("b", { style: "font-size:1.15rem" }, o.user_name),
        h("div", { class: "delivLoc" }, "📍 " + o.location + (o.floor ? " · " + o.floor : "")),
        h("div", { class: "small muted" }, "Commandé à " + fmtTime(o.created_at_ms)),
      ]),
    ]),
    cups.length ? h("div", { class: "cups", style: "cursor:pointer", onClick: () => openDeliveryBig(o) }, cups.map((n) => h("span", { class: "cupChip back", style: "text-decoration:none;opacity:1;font-size:1rem" }, "Tasse n° " + n))) : null,
    h("div", {}, groupItems(o.items).map(({ it, count }) => h("div", { class: "itemLine" }, [
      it.icon ? iconImg(it.icon, { class: "big", alt: it.name, style: "width:44px;height:44px" }) : null,
      h("div", { class: "desc" }, [h("b", {}, (count > 1 ? count + " × " : "") + it.name), h("div", { class: "muted small" }, describeItem(it) || "Nature"), it.syrup ? levelBadge(it.syrup.level) : null]),
    ]))),
    o.comment ? h("div", { class: "banner", style: "margin:8px 0 0" }, "💬 " + o.comment) : null,
    h("div", { class: "actions" }, btn),
  ]);
}

function renderStaffDelivery() {
  const todo = State.delivery.filter((o) => !o.delivered_at);
  const done = State.delivery.filter((o) => o.delivered_at);
  const alerts = (pushSupported() && "PushManager" in window) ? h("div", { class: "banner" }, [
    "Reçois une notification « Café à livrer » quand une commande en livraison est complétée. ",
    h("div", { class: "row", style: "margin-top:8px" }, h("button", { class: "btn sm primary", type: "button", onClick: async () => {
      try { await enablePush("delivery"); toast("Alertes de livraison activées sur cet appareil ✅", "good"); } catch (e) { toast(pushErrorText(e), "bad"); }
    } }, "🔔 Activer les alertes de livraison sur cet appareil")),
  ]) : null;
  return staffShell("staff_delivery", [
    alerts,
    h("div", { class: "colHead" }, [h("h2", { style: "margin:0" }, "À livrer"), h("span", { class: "count" }, String(todo.length))]),
    h("div", { class: "delivList" }, todo.length ? todo.map(deliveryCard) : h("div", { class: "card muted" }, "Rien à livrer pour le moment ☕")),
    done.length ? [h("div", { class: "colHead", style: "margin-top:22px" }, [h("h2", { style: "margin:0" }, "Livrées récemment"), h("span", { class: "count" }, String(done.length))]), h("div", { class: "delivList" }, done.map(deliveryCard))] : null,
  ]);
}
