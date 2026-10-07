/* =========================================================
   Données : client Supabase, état global, appels backend, temps réel
========================================================= */
// Lien « mot de passe oublié » : supabase-js efface le hash dès sa création → on le mémorise avant.
const ARRIVED_VIA_RECOVERY = /type=recovery/.test(location.hash);

const sb = (window.__VD_MOCK__ || supabase).createClient(VD.SUPABASE_URL, VD.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const State = {
  session: null,
  delivery: [],
  profile: null,        // {id,email,name,location,photo,is_staff,balance_cents}
  settings: null,       // ligne vd_settings
  myOrders: [],
  myTx: [],
  loyalty: { paid: 0, free_used: 0, progress: 0, available: 0 },
  // staff
  staffOrders: [],
  staffDate: todayKey(),
  cups: [],
  users: [],
  photoCache: {},       // userId -> data URL
  recovery: ARRIVED_VIA_RECOVERY,      // arrivé via le lien « mot de passe oublié »
  ready: false,
};

function unwrap(res) { if (res.error) throw res.error; return res.data; }

/* ---------- session / profil ---------- */
async function loadProfile() {
  if (!State.session) { State.profile = null; return null; }
  const data = unwrap(await sb.from("vd_profiles")
    .select("id,email,name,location,photo,is_staff,is_delivery,balance_cents")
    .eq("id", State.session.user.id).maybeSingle());
  State.profile = data || null;
  if (data && data.photo) State.photoCache[data.id] = data.photo;
  return State.profile;
}
async function loadSettings() {
  State.settings = unwrap(await sb.from("vd_settings").select("*").eq("id", 1).maybeSingle());
  return State.settings;
}

/* ---------- client ---------- */
async function loadMyOrders() {
  if (!State.session) return;
  State.myOrders = unwrap(await sb.from("vd_orders").select("*")
    .eq("user_id", State.session.user.id).order("created_at_ms", { ascending: false }).limit(60)) || [];
}
async function loadMyTx() {
  if (!State.session) return;
  State.myTx = unwrap(await sb.from("vd_wallet_tx").select("*")
    .eq("user_id", State.session.user.id).order("created_at", { ascending: false }).limit(25)) || [];
}
async function loadLoyalty() {
  const d = unwrap(await sb.rpc("vd_my_loyalty"));
  if (d) State.loyalty = d;
}
async function loadClientData() {
  await Promise.all([loadProfile(), loadSettings(), loadMyOrders(), loadMyTx(), loadLoyalty()]);
}
async function placeOrder(id, items, location, comment, mode, useFree) {
  const d = unwrap(await sb.rpc("vd_place_order", {
    p_id: id, p_items: items, p_location: location, p_comment: comment || "", p_mode: mode, p_use_free: !!useFree,
  }));
  return d;
}
async function updateMyProfile(name, location) { unwrap(await sb.rpc("vd_update_my_profile", { p_name: name, p_location: location })); }
async function setMyPhoto(dataUrl) { unwrap(await sb.rpc("vd_set_my_photo", { p_photo: dataUrl })); }

/* ---------- staff ---------- */
async function loadStaffOrders() {
  const [from, to] = dayRangeMs(State.staffDate);
  const [day, pending] = await Promise.all([
    sb.from("vd_orders").select("*").gte("created_at_ms", from).lt("created_at_ms", to).order("created_at_ms", { ascending: false }).limit(500),
    // commandes encore « nouvelles » d'une autre journée (ex. passées après la fermeture)
    sb.from("vd_orders").select("*").eq("status", "NOUVELLE").lt("created_at_ms", from).order("created_at_ms", { ascending: false }).limit(100),
  ]);
  const rows = (unwrap(day) || []).concat(unwrap(pending) || []);
  State.staffOrders = rows;
  await ensurePhotos(rows.map((o) => o.user_id));
}
async function loadCups() { State.cups = unwrap(await sb.from("vd_cups").select("*").order("number")) || []; }
async function loadUsers() {
  State.users = unwrap(await sb.from("vd_profiles")
    .select("id,email,name,location,balance_cents,has_photo,is_staff").eq("is_staff", false).eq("is_delivery", false).order("name").limit(1000)) || [];
}
async function ensurePhotos(ids) {
  const need = [...new Set(ids.filter((id) => id && !(id in State.photoCache)))];
  if (!need.length) return 0;
  for (let i = 0; i < need.length; i += 40) {
    const chunk = need.slice(i, i + 40);
    const rows = unwrap(await sb.from("vd_profiles").select("id,photo").in("id", chunk)) || [];
    const got = new Set();
    rows.forEach((r) => { State.photoCache[r.id] = r.photo || ""; got.add(r.id); });
    chunk.forEach((id) => { if (!got.has(id)) State.photoCache[id] = ""; });
  }
  return need.length;
}
async function staffSetStatus(orderId, status) { unwrap(await sb.rpc("vd_staff_set_status", { p_order_id: orderId, p_status: status })); }
async function staffAssignCup(orderId, cup) { return unwrap(await sb.rpc("vd_staff_assign_cup", { p_order_id: orderId, p_cup: cup === undefined ? null : cup })); }
async function staffAssignCups(orderId, count) { return unwrap(await sb.rpc("vd_staff_assign_cups", { p_order_id: orderId, p_count: count })); }
async function loadDelivery() { State.delivery = unwrap(await sb.rpc("vd_delivery_list")) || []; }
async function deliveryMark(orderId, delivered) { unwrap(await sb.rpc("vd_delivery_mark", { p_order_id: orderId, p_delivered: delivered !== false })); }
async function staffReturnCup(cup) { unwrap(await sb.rpc("vd_staff_return_cup", { p_cup: cup })); }
async function staffSetCupCount(n) { unwrap(await sb.rpc("vd_staff_set_cup_count", { p_count: n })); }
async function staffTopup(userId, cents, note) { return unwrap(await sb.rpc("vd_staff_topup", { p_user: userId, p_amount_cents: cents, p_note: note || null })); }
async function staffSetPhoto(userId, dataUrl) { unwrap(await sb.rpc("vd_staff_set_photo", { p_user: userId, p_photo: dataUrl })); State.photoCache[userId] = dataUrl; }
async function staffUpdateUser(userId, name, location) { unwrap(await sb.rpc("vd_staff_update_user", { p_user: userId, p_name: name, p_location: location })); }
async function staffSaveSetting(key, value) { unwrap(await sb.rpc("vd_staff_save_setting", { p_key: key, p_value: value })); }
async function staffReport(from, to) { return unwrap(await sb.rpc("vd_staff_report", { p_from: from, p_to: to })); }
async function staffUserTx(userId, limit) {
  return unwrap(await sb.from("vd_wallet_tx").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit || 40)) || [];
}
async function staffTxBetween(fromIso, toIso) {
  return unwrap(await sb.from("vd_wallet_tx").select("*").gte("created_at", fromIso).lt("created_at", toIso).order("created_at").limit(5000)) || [];
}

/* ---------- temps réel ---------- */
let _rt = null;
function startRealtime(onChange) {
  stopRealtime();
  try {
    const ch = sb.channel("vd-rt");
    ["vd_orders", "vd_settings", "vd_cups", "vd_profiles"].forEach((table) => {
      ch.on("postgres_changes", { event: "*", schema: "public", table }, (p) => onChange(table, p));
    });
    ch.subscribe();
    _rt = ch;
  } catch (e) { console.warn("Realtime indisponible:", e); }
}
function stopRealtime() { if (_rt) { try { sb.removeChannel(_rt); } catch (_e) {} _rt = null; } }

/* ---------- notifications push ---------- */
function urlBase64ToUint8Array(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
function pushSupported() { return !!VD.VAPID_PUBLIC_KEY && "serviceWorker" in navigator && "Notification" in window; }
async function enablePush(role) {
  if (!("Notification" in window)) throw new Error("NOTIF_UNSUPPORTED");
  if (!("serviceWorker" in navigator)) throw new Error("SW_UNSUPPORTED");
  if (!("PushManager" in window)) throw new Error("PUSH_UNAVAILABLE"); // iOS : seulement en mode app (écran d'accueil)
  // Ne redemande la permission que si nécessaire (iOS refuse un 2e appel hors geste de l'utilisateur)
  let perm = Notification.permission;
  if (perm !== "granted") perm = await Notification.requestPermission();
  if (perm === "default") throw new Error("PERMISSION_DISMISSED");
  if (perm !== "granted") throw new Error("PERMISSION_DENIED");
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VD.VAPID_PUBLIC_KEY) });
  }
  const j = sub.toJSON();
  unwrap(await sb.rpc("vd_save_push", {
    p_endpoint: sub.endpoint, p_p256dh: (j.keys || {}).p256dh || null, p_auth: (j.keys || {}).auth || null, p_role: role,
  }));
  return true;
}
/** Enregistre silencieusement l'abonnement push si la permission est déjà accordée (ex. autre compte sur le même appareil). */
async function refreshPushSubscription() {
  try {
    if (!pushSupported() || !("PushManager" in window) || Notification.permission !== "granted" || !State.profile) return;
    if (State.profile.is_delivery) { await enablePush("delivery"); return; }
    await enablePush("client");
    if (State.profile.is_staff) await enablePush("staff");
  } catch (_e) { /* non bloquant */ }
}
async function unsubscribePushForThisDevice() {
  try {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) await sb.rpc("vd_unsave_push", { p_endpoint: sub.endpoint });
  } catch (_e) { /* non bloquant */ }
}
function pushErrorText(e) {
  const m = String((e && e.message) || e);
  if (m === "PUSH_UNAVAILABLE") return "Notifications indisponibles ici. Sur iPhone/iPad : ajoute d'abord le site à l'écran d'accueil et ouvre-le depuis l'icône.";
  if (m === "PERMISSION_DISMISSED") return "Tu as fermé la demande sans choisir. Touche de nouveau le bouton, puis « Autoriser ».";
  if (m === "PERMISSION_DENIED") return "Notifications bloquées. Autorise-les dans les réglages de ton appareil pour ce site.";
  return "Impossible d'activer les notifications.";
}

/* ---------- horaires ---------- */
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"];
const DAY_LABELS = { mon: "Lundi", tue: "Mardi", wed: "Mercredi", thu: "Jeudi", fri: "Vendredi" };
/** Minutes depuis minuit pour "HH:MM", ou null si l'heure n'est pas (encore) renseignée. */
function hhmmToMin(v) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
function timedPeriods() {
  return ((State.settings && State.settings.periods) || []).filter((p) => hhmmToMin(p.start) !== null && hhmmToMin(p.end) !== null);
}
function currentPeriodKey() {
  const now = new Date();
  const min = now.getHours() * 60 + now.getMinutes();
  for (const p of timedPeriods()) {
    if (min >= hhmmToMin(p.start) && min <= hhmmToMin(p.end)) return p.k;
  }
  return null;
}
function isCafeOpenNow() {
  if (!State.settings) return true;
  // heures des périodes pas encore renseignées → aucune restriction (pas de faux message « fermé »)
  if (!timedPeriods().length) return true;
  const day = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()];
  if (!DAY_KEYS.includes(day)) return false;
  const cur = currentPeriodKey();
  if (!cur) return false;
  return ((State.settings.hours || {})[day] || []).includes(cur);
}
