/* Mini-Supabase en mémoire pour tester l'interface sans backend (ouvrir /?mock).
   Comptes de démo : marie@ecole.ca / test123 (client) — staff@ecole.ca / staff123 (staff).
   Reproduit grossièrement les fonctions SQL ; la vraie logique est testée via supabase/schema.sql. */
(function () {
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const menu = {
    syrupSurchargeCents: 50,
    drinks: [["expresso", "Expresso", "espresso.jpg"], ["cafe", "Café", "cafe.jpg"], ["americano", "Américano", "americano.jpg"], ["cappuccino", "Cappuccino", "cappuccino.jpg"],
      ["latte-macchiato", "Latte macchiato", "latte-macchiato.jpg"], ["cafe-glace", "Café glacé", "cafe-glace.jpg"], ["latte-glace", "Latte glacé", "latte-glace.jpg"], ["chocolat-chaud", "Chocolat chaud", "chocolat-chaud.jpg"]]
      .map(([id, name, icon]) => ({ id, name, icon, priceCents: 200, available: true, dairyFreeOption: id === "chocolat-chaud" })),
    syrups: [["noisette", "Sirop aux noisettes", "sirop-noisette.jpg"], ["caramel", "Sirop au caramel et fleur de sel", "sirop-caramel.jpg"], ["vanille", "Sirop à la vanille", "sirop-vanille.jpg"], ["marula", "Sirop à la crème et fruit du marula", "sirop-marula.jpg"]]
      .map(([id, name, icon]) => ({ id, name, icon, available: true })),
  };
  const periods = [["P1", "08:50", "09:50"], ["P2", "09:54", "10:54"], ["P3", "10:58", "11:58"], ["P4", "12:48", "13:48"], ["P5", "13:52", "14:52"]].map(([k, start, end]) => ({ k, start, end }));
  const allP = ["P1", "P2", "P3", "P4", "P5"];
  const db = {
    vd_profiles: [
      { id: "u-marie", email: "marie@ecole.ca", name: "Marie Tremblay", location: "Local 203", photo: null, has_photo: false, is_staff: false, balance_cents: 1000 },
      { id: "u-paul", email: "paul@ecole.ca", name: "Paul Gagnon", location: "Local 105", photo: null, has_photo: false, is_staff: false, balance_cents: 150 },
      { id: "u-lise", email: "lise@ecole.ca", name: "Lise Bouchard", location: "Gym", photo: null, has_photo: false, is_staff: false, balance_cents: 2500 },
      { id: "u-staff", email: "staff@ecole.ca", name: "Café Vent de douceurs", location: "", photo: null, has_photo: false, is_staff: true, balance_cents: 0 },
    ],
    vd_settings: [{ id: 1, menu, periods, hours: { mon: allP, tue: allP, wed: allP, thu: allP, fri: allP }, cup_count: 12, require_photo: false, low_balance_cents: 400, credit_limit_cents: 1000 }],
    vd_orders: [],
    vd_wallet_tx: [],
    vd_cups: Array.from({ length: 12 }, (_, i) => ({ number: i + 1, status: "available", order_id: null })),
  };
  const passwords = { "marie@ecole.ca": "test123", "staff@ecole.ca": "staff123", "paul@ecole.ca": "test123" };
  let session = null;
  const authCbs = [];
  const rtCbs = [];
  const emitRt = (table) => rtCbs.forEach((c) => c.table === table && setTimeout(() => c.cb({ eventType: "UPDATE" }), 30));
  const emitAuth = (ev) => authCbs.forEach((cb) => setTimeout(() => cb(ev, session), 0));
  const me = () => session && db.vd_profiles.find((p) => p.id === session.user.id);
  const tx = (user_id, kind, amount, bal, order_id, note) => db.vd_wallet_tx.push({ id: db.vd_wallet_tx.length + 1, user_id, kind, amount_cents: amount, balance_after: bal, order_id, note: note || null, created_at: new Date().toISOString() });
  const fail = (m) => ({ data: null, error: { message: m } });
  const price = (it) => { const d = menu.drinks.find((x) => x.id === it.drink); return d.priceCents + (it.syrup ? menu.syrupSurchargeCents : 0); };
  const loy = (uid) => {
    const os = db.vd_orders.filter((o) => o.user_id === uid && o.status !== "ANNULÉE");
    const paid = os.reduce((n, o) => n + o.items.filter((i) => i.price_cents > 0).length, 0);
    const used = os.filter((o) => o.free_item).length;
    return { paid, free_used: used, progress: paid % 10, available: Math.max(Math.floor(paid / 10) - used, 0) };
  };
  const staffOnly = () => { const p = me(); if (!p || !p.is_staff) throw new Error("NOT_STAFF"); };

  const rpcs = {
    vd_my_loyalty: () => loy(session.user.id),
    vd_update_my_profile: (a) => { Object.assign(me(), { name: a.p_name, location: a.p_location }); },
    vd_set_my_photo: (a) => { Object.assign(me(), { photo: a.p_photo, has_photo: true }); },
    vd_place_order: (a) => {
      const p = me(); const s = db.vd_settings[0];
      if (s.require_photo && !p.photo) throw new Error("PHOTO_REQUIRED");
      const items = a.p_items.map((it) => {
        const d = menu.drinks.find((x) => x.id === it.drink); if (!d) throw new Error("BAD_DRINK");
        const sy = it.syrup ? menu.syrups.find((x) => x.id === it.syrup.id) : null;
        return { drink: d.id, name: d.name, icon: d.icon, qty: 1, price_cents: price(it),
          syrup: sy ? { id: sy.id, name: sy.name, icon: sy.icon, level: it.syrup.level === 1 ? 1 : 2 } : null,
          milk: it.milk || 0, cream: it.cream || 0, sugar: it.sugar || 0, sweetener: it.sweetener || 0, marshmallows: !!it.marshmallows, dairy_free: !!it.dairy_free && !!d.dairyFreeOption };
      });
      let free = false;
      if (a.p_use_free) {
        if (loy(p.id).available <= 0) throw new Error("NO_FREE_AVAILABLE");
        let bi = 0; items.forEach((it, i) => { if (it.price_cents > items[bi].price_cents) bi = i; });
        items[bi].price_cents = 0; items[bi].free = true; free = true;
      }
      const total = items.reduce((n, i) => n + i.price_cents, 0);
      if (p.balance_cents - total < -s.credit_limit_cents) throw new Error("CREDIT_LIMIT_REACHED");
      p.balance_cents -= total;
      db.vd_orders.push({ id: a.p_id, created_at_ms: Date.now(), user_id: p.id, user_name: p.name, location: a.p_location, mode: a.p_mode, comment: a.p_comment || null, status: "NOUVELLE", items, total_cents: total, free_item: free, cup_numbers: [] });
      if (total > 0) tx(p.id, "order", -total, p.balance_cents, a.p_id, "Commande");
      emitRt("vd_orders"); emitRt("vd_profiles");
      return { id: a.p_id, total_cents: total, balance_cents: p.balance_cents, free_item: free };
    },
    vd_staff_set_status: (a) => {
      staffOnly();
      const o = db.vd_orders.find((x) => x.id === a.p_order_id);
      if (a.p_status === "ANNULÉE" && o.status !== "ANNULÉE") {
        const u = db.vd_profiles.find((x) => x.id === o.user_id);
        u.balance_cents += o.total_cents; tx(u.id, "refund", o.total_cents, u.balance_cents, o.id, "Commande annulée");
        db.vd_cups.forEach((c) => { if (c.order_id === o.id) { c.status = "available"; c.order_id = null; } });
      }
      o.status = a.p_status; emitRt("vd_orders"); emitRt("vd_cups");
    },
    vd_staff_assign_cup: (a) => {
      staffOnly();
      const c = a.p_cup ? db.vd_cups.find((x) => x.number === a.p_cup && x.status === "available") : db.vd_cups.find((x) => x.status === "available");
      if (!c) throw new Error("NO_CUP_AVAILABLE");
      c.status = "in_use"; c.order_id = a.p_order_id; db.vd_orders.find((x) => x.id === a.p_order_id).cup_numbers.push(c.number);
      emitRt("vd_orders"); emitRt("vd_cups"); return c.number;
    },
    vd_staff_return_cup: (a) => { staffOnly(); const c = db.vd_cups.find((x) => x.number === a.p_cup); c.status = "available"; c.order_id = null; emitRt("vd_cups"); },
    vd_staff_set_cup_count: (a) => {
      staffOnly(); db.vd_settings[0].cup_count = a.p_count;
      while (db.vd_cups.length < a.p_count) db.vd_cups.push({ number: db.vd_cups.length + 1, status: "available", order_id: null });
      db.vd_cups = db.vd_cups.filter((c) => c.number <= a.p_count || c.status === "in_use");
    },
    vd_staff_topup: (a) => {
      staffOnly();
      const u = db.vd_profiles.find((x) => x.id === a.p_user); u.balance_cents += a.p_amount_cents;
      tx(u.id, a.p_amount_cents > 0 ? "topup" : "adjust", a.p_amount_cents, u.balance_cents, null, a.p_note);
      emitRt("vd_profiles"); return { balance_cents: u.balance_cents };
    },
    vd_staff_set_photo: (a) => { staffOnly(); const u = db.vd_profiles.find((x) => x.id === a.p_user); u.photo = a.p_photo; u.has_photo = true; },
    vd_staff_update_user: (a) => { staffOnly(); Object.assign(db.vd_profiles.find((x) => x.id === a.p_user), { name: a.p_name, location: a.p_location }); },
    vd_staff_save_setting: (a) => { staffOnly(); db.vd_settings[0][a.p_key] = a.p_key === "low_balance_cents" ? Number(a.p_value) : a.p_value; emitRt("vd_settings"); },
    vd_staff_report: (a) => {
      staffOnly();
      const os = db.vd_orders.filter((o) => o.status !== "ANNULÉE"); const sales = os.reduce((n, o) => n + o.total_cents, 0);
      const topups = db.vd_wallet_tx.filter((t) => t.kind === "topup").reduce((n, t) => n + t.amount_cents, 0);
      const drinks = os.reduce((n, o) => n + o.items.length, 0);
      return { from: a.p_from, to: a.p_to, orders: os.length, drinks, sales_cents: sales, topups_cents: topups, adjusts_cents: 0, refunds_cents: 0, free_drinks: os.filter((o) => o.free_item).length,
        outstanding_cents: db.vd_profiles.filter((p) => !p.is_staff).reduce((n, p) => n + p.balance_cents, 0),
        days: [{ d: new Date().toISOString().slice(0, 10), orders: os.length, drinks, sales, topups, adjusts: 0, refunds: 0 }], top: [{ name: "Café", n: 3 }] };
    },
    vd_save_push: () => null,
    vd_unsave_push: () => null,
    vd_claim_staff: (a) => { if (a.p_code !== "CODE123") return false; me().is_staff = true; return true; },
    vd_staff_set_code: () => { staffOnly(); },
    vd_staff_set_role: (a) => { staffOnly(); db.vd_profiles.find((x) => x.id === a.p_user).is_staff = a.p_is_staff; },
  };

  function query(table) {
    const f = { cols: "*", filters: [], order: null, limit: null, single: false };
    const q = {
      select(c) { f.cols = c || "*"; return q; },
      eq(k, v) { f.filters.push((r) => r[k] === v); return q; },
      gte(k, v) { f.filters.push((r) => r[k] >= v); return q; },
      lt(k, v) { f.filters.push((r) => r[k] < v); return q; },
      in(k, vs) { f.filters.push((r) => vs.includes(r[k])); return q; },
      order(k, o) { f.order = [k, !(o && o.ascending === false)]; return q; },
      limit(n) { f.limit = n; return q; },
      maybeSingle() { f.single = true; return q; },
      then(res, rej) {
        try {
          let rows = clone(db[table] || []);
          const p = me();
          if (table === "vd_orders" && p && !p.is_staff) rows = rows.filter((r) => r.user_id === p.id);
          if (table === "vd_wallet_tx" && p && !p.is_staff) rows = rows.filter((r) => r.user_id === p.id);
          if (table === "vd_profiles" && p && !p.is_staff) rows = rows.filter((r) => r.id === p.id);
          rows = rows.filter((r) => f.filters.every((fn) => fn(r)));
          if (f.order) { const [k, asc] = f.order; rows.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1)); }
          if (f.limit) rows = rows.slice(0, f.limit);
          if (f.cols !== "*") { const cs = f.cols.split(",").map((s) => s.trim()); rows = rows.map((r) => Object.fromEntries(cs.map((c) => [c, r[c]]))); }
          res({ data: f.single ? rows[0] || null : rows, error: null });
        } catch (e) { rej ? rej(e) : res(fail(e.message)); }
      },
    };
    return q;
  }
  const mockClient = {
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: (cb) => { authCbs.push(cb); setTimeout(() => cb("INITIAL_SESSION", session), 0); return { data: { subscription: {} } }; },
      signInWithPassword: async ({ email, password }) => {
        const u = db.vd_profiles.find((p) => p.email === email);
        if (!u || passwords[email] !== password) return fail("Invalid login credentials");
        session = { user: { id: u.id, email } }; emitAuth("SIGNED_IN"); return { data: { session }, error: null };
      },
      signUp: async ({ email, password, options }) => {
        if (db.vd_profiles.some((p) => p.email === email)) return fail("User already registered");
        const id = "u-" + Math.random().toString(16).slice(2); passwords[email] = password;
        db.vd_profiles.push({ id, email, name: options.data.name, location: options.data.location, photo: null, has_photo: false, is_staff: false, balance_cents: 0 });
        session = { user: { id, email } }; emitAuth("SIGNED_IN"); return { data: { session }, error: null };
      },
      signOut: async () => { session = null; emitAuth("SIGNED_OUT"); return { error: null }; },
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
      updateUser: async () => ({ data: {}, error: null }),
    },
    from: query,
    rpc: async (name, args) => {
      try { const fn = rpcs[name]; if (!fn) return fail("fonction inconnue " + name); return { data: await fn(args || {}), error: null }; }
      catch (e) { return fail(e.message); }
    },
    channel: () => { const ch = { on: (_t, cfg, cb) => { rtCbs.push({ table: cfg.table, cb }); return ch; }, subscribe: () => ch }; return ch; },
    removeChannel: () => {},
  };
  window.__VD_MOCK__ = { createClient: () => mockClient };
  window.__VD_DB__ = db;
})();
