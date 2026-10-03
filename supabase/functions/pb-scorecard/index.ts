// ────────────────────────────────────────────────────────────────────
//  BreedWise — Profitable Breeder Scorecard (quiz lead magnet)
//  Public capture for cold / non-TPB traffic.
//  action: "pb-optin"     → contact screen lead capture
//          "pb-scorecard" → full quiz completion
//  Deploy: supabase functions deploy pb-scorecard --project-ref xhjdowbnqcsvhtcccuqx --no-verify-jwt
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
  const body: any = { locationId: LOC, email, source: "Profitable Breeder Scorecard" };
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
  const action = String(b.action ?? "pb-optin");

  let cc360 = false, contactId: string | null = null;
  try { contactId = await ccUpsert(email, name, phone); } catch (_) { /* */ }

  if (action === "pb-scorecard") {
    const pct = Number(b.scorePct ?? 0);
    const band = String(b.band ?? "");
    const seg = String(b.segment ?? "");
    const gaps: number[] = Array.isArray(b.gaps) ? b.gaps.map((x: any) => Number(x)) : [];
    const notsure: number[] = Array.isArray(b.notsure) ? b.notsure.map((x: any) => Number(x)) : [];
    const priorities: string[] = Array.isArray(b.priorities) ? b.priorities.map((x: any) => String(x)) : [];
    if (contactId) {
      const tags = ["pb-scorecard-complete", "tpb-lead"];
      if (band) tags.push("pb-band-" + band);
      if (seg) tags.push("pb-segment-" + seg);
      gaps.forEach((n) => tags.push("pb-gap-q" + n));
      try { await ccTag(contactId, tags); cc360 = true; } catch (_) { /* */ }
    }
    try {
      await supabase.from("tool_submissions").insert({
        tool: "pb-scorecard", tool_label: "Profitable Breeder Scorecard", member_name: name || null, member_email: email,
        summary: `${pct}% · ${band} · ${seg} · gaps ${gaps.length}`,
        meta: {
          phone: phone || null, source: "Profitable Breeder Scorecard",
          scorePct: pct, scoreRaw: b.scoreRaw ?? null, band, segment: seg,
          goalSec: b.goalSec ?? null, secScores: b.secScores ?? null,
          gaps, notsure, priorities, ts: Math.floor(Date.now() / 1000),
        },
        inputs: { answers: b.answers ?? null, qual: b.qual ?? null },
        result: { scorePct: pct, band, segment: seg, priorities, gaps },
      });
    } catch (_) { /* */ }
    return j({ ok: true, cc360 });
  }

  // default: pb-optin (contact screen lead capture)
  if (contactId) { try { await ccTag(contactId, ["pb-scorecard-optin", "tpb-lead"]); cc360 = true; } catch (_) { /* */ } }
  try {
    await supabase.from("tool_submissions").insert({
      tool: "pb-scorecard-optin", tool_label: "Profitable Breeder Scorecard Opt-in", member_name: name || null, member_email: email,
      summary: `${name || email} · started the Profitable Breeder Scorecard`,
      meta: { phone: phone || null, source: "Profitable Breeder Scorecard", partial: true, ts: Math.floor(Date.now() / 1000) },
      inputs: null, result: null,
    });
  } catch (_) { /* */ }
  return j({ ok: true, cc360 });
});
