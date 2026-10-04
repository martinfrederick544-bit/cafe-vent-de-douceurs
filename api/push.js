// Vercel Function — envoie les notifications push (Web Push / VAPID).
// Appelée par les triggers PostgreSQL (pg_net) avec l'en-tête x-push-secret.
// Env requis : PUSH_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, SUPABASE_URL, SUPABASE_ANON_KEY
const webpush = require("web-push");
const crypto = require("crypto");

function sameSecret(a, b) {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const secret = process.env.PUSH_SECRET || "";
  if (!secret || !sameSecret(req.headers["x-push-secret"], secret)) return res.status(401).json({ error: "unauthorized" });

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return res.status(500).json({ error: "missing VAPID keys" });
  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:info@synccrm.ca", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const subs = Array.isArray(body.subs) ? body.subs.slice(0, 500) : [];
  const payload = JSON.stringify({ title: body.title, body: body.body, url: body.url || "/", tag: body.tag });

  const dead = [];
  let delivered = 0;
  await Promise.all(subs.map(async (s) => {
    if (!s || !s.endpoint) return;
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 });
      delivered++;
    } catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) dead.push(s.endpoint);
    }
  }));

  // Nettoyage des abonnements expirés (fonction SQL protégée par le même secret)
  if (dead.length && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/vd_push_prune`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: process.env.SUPABASE_ANON_KEY, authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ p_secret: secret, p_endpoints: dead }),
      });
    } catch (_e) { /* non bloquant */ }
  }
  return res.status(200).json({ ok: true, delivered, pruned: dead.length });
};
