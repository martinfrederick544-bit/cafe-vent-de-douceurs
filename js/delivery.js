/* =========================================================
   Onglet LIVRAISONS de l'espace staff : seulement les commandes « à livrer » (pas les ramassages), marquées « Livré ».
========================================================= */

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
