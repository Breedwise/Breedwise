// ────────────────────────────────────────────────────────────────────
//  BreedWise — Dr. Fontaine science funnel capture
//  Opt-in page POSTs name/email/phone → store + CC360 (tagged so the email
//  workflow sends the Breeder Science Scorecard). Also tags scorecard completion.
//  action: "optin" (default) | "scorecard"
//  Deploy: supabase functions deploy vet-optin --project-ref xhjdowbnqcsvhtcccuqx --no-verify-jwt
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

async function ccUpsert(email: string, name: string, phone: string): Promise<string | null> {
  if (!CC || !LOC || !email) return null;
  const body: any = { locationId: LOC, email, source: "Dr. Fontaine Science Funnel" };
  if (name) body.name = name; if (phone) body.phone = phone;
  const r = await fetch(`${GH}/contacts/upsert`, { method: "POST", headers: head, body: JSON.stringify(body) }).catch(() => null);
  if (!r || !r.ok) return null;
  const d = await r.json().catch(() => ({} as any));
  return d?.contact?.id || d?.id || null;
}
async function ccTag(id: string, tags: string[]) { await fetch(`${GH}/contacts/${id}/tags`, { method: "POST", headers: head, body: JSON.stringify({ tags }) }).catch(() => {}); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);
  let b: any; try { b = await req.json(); } catch { return j({ error: "bad json" }, 400); }
  if (b.company) return j({ ok: true });                                      // honeypot
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!emailRe.test(email)) return j({ error: "Please enter a valid email." }, 400);
  const name = [String(b.first ?? "").trim(), String(b.last ?? "").trim()].filter(Boolean).join(" ") || String(b.name ?? "").trim();
  const phone = String(b.phone ?? "").trim();
  const action = String(b.action ?? "optin");

  let cc360 = false, contactId: string | null = null;
  try { contactId = await ccUpsert(email, name, phone); } catch (_) { /* */ }

  if (action === "scorecard") {
    // scorecard completion — tag + log blind spots so Emmanuel's pipeline can act
    const blind = Array.isArray(b.blindspots) ? b.blindspots.map((x: any) => String(x)) : [];
    if (contactId) { try { await ccTag(contactId, ["science-scorecard-complete", ...blind.map((x: string) => "science-gap-" + x)]); cc360 = true; } catch (_) { /* */ } }
    try {
      await supabase.from("tool_submissions").insert({
        tool: "science-scorecard", tool_label: "Breeder Science Scorecard", member_name: name || null, member_email: email,
        summary: `science ${b.scorePct ?? "?"}% · gaps: ${blind.slice(0, 3).join(", ")}`,
        meta: { phone: phone || null, scorePct: b.scorePct ?? null, blindspots: blind, ts: Math.floor(Date.now() / 1000) },
        inputs: { scores: b.scores ?? null }, result: { blindspots: blind, scorePct: b.scorePct ?? null },
      });
    } catch (_) { /* */ }
    return j({ ok: true, cc360 });
  }

  // default: opt-in
  if (contactId) { try { await ccTag(contactId, ["vet-newsletter", "science-scorecard-optin", "emmanuel-audience", "owner-regina"]); cc360 = true; } catch (_) { /* */ } }
  let logged = false;
  try {
    const { error } = await supabase.from("tool_submissions").insert({
      tool: "vet-optin", tool_label: "Science Funnel Opt-in", member_name: name || null, member_email: email,
      summary: `${name || email} · Dr. Fontaine science funnel`,
      meta: { phone: phone || null, source: "Dr. Fontaine Science Funnel", utm: b.utm ?? null, ts: Math.floor(Date.now() / 1000) },
      inputs: null, result: null,
    });
    logged = !error;
  } catch (_) { /* */ }
  return j({ ok: true, cc360, logged });
});
