// supabase/functions/vd_push_send/index.ts
// Notifications push (Web Push / VAPID) — appelée par deux Database Webhooks sur public.vd_orders :
//   • INSERT → notifie le staff (« Nouvelle commande »)
//   • UPDATE → notifie le client concerné quand le statut passe à COMPLÉTÉE
// Secrets requis (Edge Functions > Secrets) : PUSH_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// (SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement.)
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpushPkg from "npm:web-push@3.6.7";
const webpush: any = (webpushPkg as any).default ?? webpushPkg;

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8" } });

serve(async (req) => {
  try {
    const PUSH_SECRET = Deno.env.get("PUSH_SECRET") ?? "";
    if (!PUSH_SECRET || req.headers.get("x-push-secret") !== PUSH_SECRET) return json({ error: "unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const pub = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const priv = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    if (!pub || !priv) return json({ error: "missing VAPID keys" }, 500);
    webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com", pub, priv);

    const sb = createClient(url, key, { auth: { persistSession: false } });
    const body: any = await req.json().catch(() => ({}));
    const type = String(body?.type ?? "").toUpperCase();
    const rec = body?.record ?? null;
    const old = body?.old_record ?? null;
    if (!rec) return json({ ok: true, skipped: "no record" });

    let role: "staff" | "client" | null = null;
    let payload: any = null;

    if (type === "INSERT") {
      role = "staff";
      payload = { title: "Nouvelle commande ☕", body: `${rec.user_name ?? "Un client"} — ${rec.location ?? ""}`, url: "/#staff", tag: `new_${rec.id}` };
    } else if (type === "UPDATE" && rec.status === "COMPLÉTÉE" && old?.status !== "COMPLÉTÉE") {
      role = "client";
      payload = { title: "Commande prête ✅", body: "Ta boisson est prête !", url: "/#orders", tag: `done_${rec.id}` };
    }
    if (!role) return json({ ok: true, skipped: "no rule" });

    let q = sb.from("vd_push_subscriptions").select("*").eq("role", role).limit(2000);
    if (role === "client") q = q.eq("user_id", rec.user_id);
    const { data, error } = await q;
    if (error) return json({ error: "db", details: error }, 500);

    let delivered = 0, failed = 0;
    const seen = new Set<string>();
    for (const row of data ?? []) {
      if (!row.endpoint || seen.has(row.endpoint)) continue;
      seen.add(row.endpoint);
      try {
        await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(payload), { TTL: 3600 });
        delivered++;
      } catch (e: any) {
        failed++;
        const code = e?.statusCode ?? e?.status;
        if (code === 404 || code === 410) await sb.from("vd_push_subscriptions").delete().eq("endpoint", row.endpoint);
      }
    }
    return json({ ok: true, role, delivered, failed });
  } catch (e: any) {
    console.error(e?.stack ?? e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
