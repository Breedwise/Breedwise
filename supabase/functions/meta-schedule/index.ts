// ────────────────────────────────────────────────────────────────────
//  BreedWise — Server-side "Schedule" Conversions API event
//  The booking step is now off-page (setter books by phone/text in CC360),
//  so no browser pixel can see it. CC360's "call booked" workflow POSTs
//  here; we look up the Meta attribution captured at application time
//  (fbp/fbc/ip/ua, stored by vsl-apply) and fire a Schedule CAPI event so
//  the booking finally reaches Meta and matches back to the ad click.
//
//  POST { secret, email, phone?, booking_id?, value?, fbp?, fbc?, test_event_code? }
//  Deploy: supabase functions deploy meta-schedule --project-ref xhjdowbnqcsvhtcccuqx --no-verify-jwt
// ────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const PIXEL = Deno.env.get("META_PIXEL_ID") ?? "";
const TOKEN = Deno.env.get("META_CAPI_TOKEN") ?? "";
const SECRET = Deno.env.get("META_SCHEDULE_SECRET") ?? "";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...cors } });
async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s).trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);
  let b: any; try { b = await req.json(); } catch { return j({ error: "bad json" }, 400); }
  if (!SECRET || String(b.secret ?? "") !== SECRET) return j({ error: "unauthorized" }, 403);
  if (!PIXEL || !TOKEN) return j({ error: "META_PIXEL_ID / META_CAPI_TOKEN not configured" }, 500);

  const email = String(b.email ?? "").trim().toLowerCase();
  const phone = String(b.phone ?? "").replace(/[^0-9]/g, "");
  if (!email && !phone) return j({ error: "email or phone required" }, 400);

  // Look up the attribution captured when they applied (most recent for this email).
  let a: any = {};
  try {
    if (email) {
      const { data } = await supabase.from("tool_submissions").select("meta")
        .eq("tool", "meta-attribution").eq("member_email", email)
        .order("created_at", { ascending: false }).limit(1);
      a = (data && data[0] && data[0].meta) || {};
    }
  } catch (_) { /* attribution lookup is best-effort */ }

  const fbp = String(b.fbp || a.fbp || "");
  const fbc = String(b.fbc || a.fbc || "");
  const ip = String(a.ip || "");
  const ua = String(a.ua || "");

  const ud: any = {};
  if (email) ud.em = [await sha256(email)];
  if (phone) ud.ph = [await sha256(phone)];
  if (fbp) ud.fbp = fbp;
  if (fbc) ud.fbc = fbc;
  if (ip) ud.client_ip_address = ip;
  if (ua) ud.client_user_agent = ua;

  const value = Number(b.value) > 0 ? Number(b.value) : 1500;   // $1,500 minimum-commitment proxy
  const now = Math.floor(Date.now() / 1000);
  // Dedup key: prefer the CC360 appointment id so workflow re-runs don't double-count.
  const eventId = String(b.booking_id || `sched-${email ? await sha256(email) : phone}-${new Date().toISOString().slice(0, 10)}`);

  const event: any = {
    event_name: "Schedule", event_time: now, action_source: "system_generated",
    event_id: eventId, user_data: ud,
    custom_data: { value, currency: "USD", content_name: "Academy Call Booked" },
  };
  const body: any = { data: [event] };
  if (b.test_event_code) body.test_event_code = String(b.test_event_code);

  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${PIXEL}/events?access_token=${TOKEN}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const rj = await r.json().catch(() => ({}));
    return j({ ok: r.ok, matched: !!(fbc || fbp), event_id: eventId, fb: rj }, r.ok ? 200 : 502);
  } catch (e) {
    return j({ error: "capi send failed", detail: String(e) }, 502);
  }
});
