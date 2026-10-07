/* =========================================================
   Routage, authentification, rendu, temps réel
========================================================= */
const CLIENT_ROUTES = ["order", "orders", "account"];
const AUTH_ROUTES = ["login", "register", "forgot", "reset"];
const STAFF_ROUTES = STAFF_TABS.map((t) => t[0]);

function route() {
  const raw = location.hash.replace(/^#\/?/, "");
  if (!raw || /^(access_token|error|code)=/.test(raw)) return "";
  return raw.split(/[?&]/)[0];
}
function go(r) {
  if (route() === r) onRoute(); else location.hash = r;
}

/* ---------- rendu ---------- */
function setupScreen() {
  return h("main", { class: "wrap narrow" }, [
    h("img", { class: "authLogo", src: "/logo.png", alt: "" }),
    h("div", { class: "card" }, [
      h("h2", {}, "Configuration requise"),
      h("p", {}, "Le backend Supabase n'est pas encore branché."),
      h("p", { class: "muted small" }, "Renseigne SUPABASE_URL et SUPABASE_ANON_KEY dans js/config.js (projet Supabase dédié), puis exécute supabase/schema.sql."),
    ]),
  ]);
}
function fatalScreen(msg) {
  return h("main", { class: "wrap narrow" }, [h("div", { class: "card" }, [
    h("h2", {}, "Oups"), h("p", {}, msg),
    h("button", { class: "btn block", type: "button", onClick: () => signOut() }, "Se déconnecter"),
  ])]);
}

function buildScreen() {
  if (!VD.isConfigured() && !window.__VD_MOCK__) return setupScreen();
  if (!State.ready) return h("div", {}, h("div", { class: "spinner" }));
  let r = route();
  const p = State.profile;

  if (State.recovery && State.session) r = "reset";

  if (!State.session) {
    if (r.startsWith("staff")) return renderStaffLogin();
    if (r.startsWith("livraison")) return renderDeliveryLogin();
    if (r === "register") return renderRegister();
    if (r === "forgot") return renderForgot();
    return renderLogin();
  }
  if (!p) return fatalScreen("Ton profil est introuvable. Déconnecte-toi puis reconnecte-toi, ou contacte le café.");
  if (!State.settings) return h("div", {}, h("div", { class: "spinner" }));

  if (r === "reset") return renderReset();
  if (p.is_delivery || (r.startsWith("livraison") && p.is_staff)) return renderDelivery();
  if (r.startsWith("livraison")) return renderDeliveryLogin();
  if (r.startsWith("staff")) {
    if (!p.is_staff) return renderStaffLogin();
    switch (r) {
      case "staff_clients": return renderStaffClients();
      case "staff_cups": return renderStaffCups();
      case "staff_menu": return renderStaffMenu();
      case "staff_hours": return renderStaffHours();
      case "staff_report": return renderStaffReport();
      case "staff_settings": return renderStaffSettings();
      default: return renderStaffOrders();
    }
  }
  switch (r) {
    case "orders": return renderMyOrdersScreen();
    case "account": return renderAccountScreen();
    default: return renderOrderScreen();
  }
}

let _renderTimer = null;
function render() {
  const root = $("#app");
  if (!root) return;
  let node;
  try { node = buildScreen(); }
  catch (e) { console.error(e); node = fatalScreen("Erreur d'affichage : " + (e && e.message ? e.message : e)); }
  const keepScroll = window.scrollY;
  root.replaceChildren(node);
  window.scrollTo(0, keepScroll);
  if (typeof maybeShowIntro === "function") maybeShowIntro();
}
/** Rendu différé si l'utilisateur est en train de taper (évite de perdre le focus). */
function scheduleRender() {
  clearTimeout(_renderTimer);
  _renderTimer = setTimeout(function tryRender() {
    const a = document.activeElement;
    const typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $("#app") && $("#app").contains(a) && a.type !== "checkbox";
    if (typing) { _renderTimer = setTimeout(tryRender, 1500); return; }
    render();
  }, 150);
}

/* ---------- données ---------- */
let _loading = null;
async function loadAll() {
  if (_loading) return _loading;
  _loading = (async () => {
    try {
      await loadClientData();
      if (State.profile && State.profile.is_staff) await Promise.all([loadStaffOrders(), loadCups()]);
      if (State.profile && State.profile.is_delivery) await loadDelivery();
      startRealtime(onRealtime);
      refreshPushSubscription();
    } catch (e) { console.error("Chargement:", e); toast(errText(e, "Chargement impossible. Vérifie ta connexion."), "bad"); }
    finally { _loading = null; }
  })();
  return _loading;
}

let _rtFlags = {}, _rtTimer = null;
function onRealtime(table) {
  _rtFlags[table] = true;
  clearTimeout(_rtTimer);
  _rtTimer = setTimeout(refreshFromFlags, 250);
}
async function refreshFromFlags() {
  const f = _rtFlags; _rtFlags = {};
  if (!State.session) return;
  const staff = State.profile && State.profile.is_staff;
  const jobs = [];
  if (f.vd_settings) jobs.push(loadSettings());
  if (f.vd_orders) { jobs.push(loadMyOrders(), loadLoyalty()); if (staff) jobs.push(loadStaffOrders()); }
  if (f.vd_cups && staff) jobs.push(loadCups());
  if (f.vd_profiles) { jobs.push(loadProfile(), loadMyTx()); if (staff && route() === "staff_clients") jobs.push(loadUsers()); }
  try { await Promise.all(jobs); } catch (e) { console.warn("Refresh:", e); }
  scheduleRender();
}

/* ---------- authentification ---------- */
function clearSession() {
  stopRealtime();
  State.session = null; State.profile = null; State.myOrders = []; State.myTx = []; State.staffOrders = []; State.users = []; State.delivery = [];
  State.loyalty = { paid: 0, free_used: 0, progress: 0, available: 0 };
  UI.cart = []; saveCart(); UI.draft = { location: "", comment: "", mode: "deliver", useFree: false };
  StaffUI.report = null; StaffUI.reportTried = false; StaffUI.menuDraft = null;
}
async function signOut() {
  const wasDelivery = !!(State.profile && State.profile.is_delivery);
  await unsubscribePushForThisDevice();
  try { await sb.auth.signOut(); } catch (_e) {}
  clearSession();
  go(wasDelivery ? "livraison" : "login");
}
async function handleAuth(event, session) {
  if (event === "PASSWORD_RECOVERY") State.recovery = true;
  if (event === "SIGNED_OUT") { clearSession(); State.ready = true; scheduleRender(); return; }
  const newUser = session && (!State.session || State.session.user.id !== session.user.id);
  State.session = session;
  if (session && (newUser || !State.profile)) { await loadAll(); }
  if (event === "PASSWORD_RECOVERY") { if (route() !== "reset") { location.hash = "reset"; return; } }
  State.ready = true;
  scheduleRender();
}

/* ---------- navigation ---------- */
function onRoute() {
  const r = route();
  if (State.session && State.profile) {
    const home = State.profile.is_delivery ? "livraison" : "order";
    if (AUTH_ROUTES.includes(r) && r !== "reset") { location.hash = home; return; }
    if (r === "") { location.hash = home; return; }
    if (r === "livraison" && (State.profile.is_delivery || State.profile.is_staff)) loadDelivery().then(scheduleRender).catch(() => {});
    if (r === "staff_menu") StaffUI.menuDraft = null;
    if (r === "staff_clients" && State.profile.is_staff) loadUsers().then(scheduleRender).catch((e) => toast(errText(e), "bad"));
    if (r === "staff_report" && State.profile.is_staff && !StaffUI.report) { render(); loadReport(); return; }
    if (r.startsWith("staff") && State.profile.is_staff) { Promise.all([loadStaffOrders(), loadCups()]).then(scheduleRender).catch(() => {}); }
    if (r === "orders" || r === "account") { Promise.all([loadMyOrders(), loadMyTx(), loadLoyalty(), loadProfile()]).then(scheduleRender).catch(() => {}); }
  }
  window.scrollTo(0, 0);
  render();
}

/* ---------- démarrage ---------- */
async function boot() {
  if (/type=recovery/.test(location.hash)) State.recovery = true;
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(console.warn));

  // iOS : pas de zoom par double tap / pincement
  ["gesturestart", "gesturechange", "gestureend"].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));

  if (!VD.isConfigured() && !window.__VD_MOCK__) { State.ready = true; render(); return; }

  sb.auth.onAuthStateChange((event, session) => { setTimeout(() => handleAuth(event, session), 0); });
  try {
    const { data } = await sb.auth.getSession();
    State.session = data.session;
    if (data.session) await loadAll();
  } catch (e) { console.warn("Session:", e); }
  State.ready = true;
  window.addEventListener("hashchange", onRoute);
  if (!location.hash || /^#(access_token|error|code)=/.test(location.hash)) {
    if (State.recovery && State.session) location.hash = "reset";
    else history.replaceState(null, "", location.pathname + location.search + (State.session ? (State.profile && State.profile.is_delivery ? "#livraison" : "#order") : "#login"));
  }
  render();

  // Retour au premier plan (iOS/PWA) : rafraîchir les données et la connexion temps réel
  const onResume = async () => {
    if (document.hidden || !State.session) return;
    if (State.staffDateAuto !== false) State.staffDate = todayKey();
    try {
      await Promise.all([loadSettings(), loadProfile(), loadMyOrders(), loadLoyalty(), State.profile && State.profile.is_staff ? Promise.all([loadStaffOrders(), loadCups()]) : null, State.profile && State.profile.is_delivery ? loadDelivery() : null]);
      startRealtime(onRealtime);
    } catch (e) { console.warn("Resume:", e); }
    scheduleRender();
  };
  // groupe livraison : la liste « à livrer » se rafraîchit toute seule
  setInterval(() => { if (!document.hidden && State.session && State.profile && State.profile.is_delivery) loadDelivery().then(scheduleRender).catch(() => {}); }, 8000);
  document.addEventListener("visibilitychange", onResume);
  window.addEventListener("pageshow", onResume);
  window.addEventListener("online", onResume);
}
boot();
