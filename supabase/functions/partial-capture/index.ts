// ────────────────────────────────────────────────────────────────────
//  BreedWise — Partial / abandoned Academy application capture
//  Fires as soon as an applicant enters a valid email (and on exit) even
//  if they never submit. Upserts the contact in CC360 tagged as a partial
//  so a setter can follow up, and stores Meta attribution so a later
//  booking still matches back to the ad click. Light path — no scoring,
//  no opportunity, no Lead pixel (that stays for completed applications).
//  Deploy: supabase functions deploy partial-capture --project-ref xhjdowbnqcsvhtcccuqx --no-verify-jwt
// ────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CC = Deno.env.get("CC360_TOKEN") ?? "";
const LOC = Deno.env.get("CC360_LOCATION") ?? "";
const GH = "https://services.leadconnectorhq.com";
const head = { Authorization: "Bearer " + CC, Version: "2021-07-28", "Content-Type": "application/json" };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...cors } });
const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);
  let b: any; try { b = await req.json(); } catch { return j({ error: "bad json" }, 400); }
  if (b.company) return j({ ok: true });                                   // honeypot
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!emailRe.test(email)) return j({ ok: true, skipped: "no valid email yet" });
  const name = [String(b.first ?? "").trim(), String(b.last ?? "").trim()].filter(Boolean).join(" ");
  const phone = String(b.phone ?? "").trim();

  let cc360 = false;
  try {
    if (CC && LOC) {
      const up: any = { locationId: LOC, email, source: "Academy Application (partial)" };
      if (name) up.name = name;
      if (phone) up.phone = phone;
      const r = await fetch(`${GH}/contacts/upsert`, { method: "POST", headers: head, body: JSON.stringify(up) });
      if (r.ok) {
        const uj = await r.json().catch(() => ({} as any));
        const id = uj?.contact?.id || uj?.id;
        if (id) {
          await fetch(`${GH}/contacts/${id}/tags`, { method: "POST", headers: head, body: JSON.stringify({ tags: ["application-partial", "application-started", "owner-regina"] }) }).catch(() => {});
          const note = `⏳ Partial Academy application — started, not submitted (${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC)\n`
            + `Trigger: ${String(b.reason || "?")}\n`
            + (name ? `Name: ${name}\n` : "") + (phone ? `Phone: ${phone}\n` : "") + (b.breeds ? `Breed(s): ${String(b.breeds)}\n` : "")
            + `Follow up — they showed intent but did not finish.`;
          await fetch(`${GH}/contacts/${id}/notes`, { method: "POST", headers: head, body: JSON.stringify({ body: note }) }).catch(() => {});
          cc360 = true;
        }
      }
    }
  } catch (_) { /* never block */ }

  // Store attribution so a later Schedule/booking still matches the ad click.
  try {
    await supabase.from("tool_submissions").insert({
      tool: "meta-attribution", tool_label: "Meta Attribution (partial)", member_email: email, member_name: name || null,
      summary: `partial · fbc:${b.fbc ? "y" : "n"}`,
      meta: { fbp: b.fbp || null, fbc: b.fbc || null, fbclid: b.fbclid || null, event_id: b.event_id || null, partial: true, captured_at: Math.floor(Date.now() / 1000) },
      inputs: null, result: null,
    });
  } catch (_) { /* */ }

  return j({ ok: true, cc360 });
});
