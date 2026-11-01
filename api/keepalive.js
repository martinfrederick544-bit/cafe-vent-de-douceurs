// Vercel Cron (1×/jour, voir vercel.json) — fait une vraie requête SQL sur Supabase
// pour empêcher la mise en pause du projet gratuit après une période d'inactivité.
module.exports = async (_req, res) => {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ ok: false, error: "SUPABASE_URL / SUPABASE_ANON_KEY manquants" });
  try {
    const r = await fetch(`${url}/rest/v1/rpc/vd_ping`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: key, authorization: `Bearer ${key}` },
      body: "{}",
    });
    const text = await r.text();
    // rappels de retour de tasse (notification au client ; le secret protège la fonction)
    let reminders = null;
    if (process.env.PUSH_SECRET) {
      try {
        const m = await fetch(`${url}/rest/v1/rpc/vd_mug_reminders`, {
          method: "POST",
          headers: { "content-type": "application/json", apikey: key, authorization: `Bearer ${key}` },
          body: JSON.stringify({ p_secret: process.env.PUSH_SECRET }),
        });
        reminders = m.ok ? await m.json() : "erreur " + m.status;
      } catch (e) { reminders = "erreur"; }
    }
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, db_time: text.replace(/"/g, ""), mug_reminders: reminders });
  } catch (e) {
    return res.status(502).json({ ok: false, error: String(e && e.message || e) });
  }
};
