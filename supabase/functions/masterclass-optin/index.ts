// ────────────────────────────────────────────────────────────────────
//  Breedwise — Masterclass opt-in intake (public endpoint)
//  Front door for the "Breeder's Revenue Accelerator" free masterclass.
//  Captures name + email and lands the lead in ALL THREE systems, in unison:
//    1. Sales OS (Supabase `leads`)  — source of truth; create OR update
//       an existing person (never clobber good data), mark marketing-qualified,
//       log an opt-in note.
//    2. CC360 / GoHighLevel          — UPSERT the contact + apply CRM tags
//       (masterclass-optin, revenue-accelerator, lead-magnet, channel) so
//       existing files get tagged/updated, and their nurture workflows fire.
//    3. Close                        — find-or-create the sales-CRM lead +
//       an opt-in note, so both CRMs stay in sync.
//  Honeypot + validation protected. Returns { ok, action, lead_id, ... }.
//  Top-of-funnel: marketing_qualified = true, NO closer is auto-assigned
//  (routing/setters work these), status only nudges new → engaged.
// ────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CLOSE = Deno.env.get("CLOSE_API_KEY") ?? "";
const closeAuth = "Basic " + btoa(CLOSE + ":");
const GT = Deno.env.get("CC360_TOKEN") ?? "";
const LOC = Deno.env.get("CC360_LOCATION") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};
const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "content-type": "application/json" } });
const emailOk = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

const OFFER = "Revenue Accelerator Masterclass";

// Marketing channel from UTM (mirrors lead-inbound's ghlChannel logic).
function channelFromUtm(utm: any): string {
  const blob = JSON.stringify(utm ?? {}).toLowerCase();
  if (/paid|cpc|ppc|\bad\b|ads|facebook|fbclid|meta/.test(blob)) return "IG_paid";
  if (/ig|instagram|dm|organic|social/.test(blob)) return "IG_inbound";
  return "other";
}

function noteBody(d: any, channel: string) {
  const lines = [
    `🎓 MASTERCLASS OPT-IN · ${OFFER}`,
    ``,
    `Name: ${d.name}`,
    `Email: ${d.email}`,
    d.phone ? `Phone: ${d.phone}` : null,
    `Channel: ${channel}`,
    `Opted in: ${new Date().toISOString()}`,
  ].filter(Boolean) as string[];
  if (d.utm && Object.keys(d.utm).length) lines.push(`UTM: ${JSON.stringify(d.utm)}`);
  if (d.page) lines.push(`Page: ${d.page}`);
  return lines.join("\n");
}

// ---- Close (sales CRM) — find-or-create by email ----
async function findOrCreateCloseLead(d: any): Promise<string | null> {
  if (!CLOSE) return null;
  try {
    if (d.email) {
      const q = encodeURIComponent('email_address:"' + d.email + '"');
      const r = await fetch("https://api.close.com/api/v1/lead/?_limit=1&query=" + q, { headers: { Authorization: closeAuth } });
      if (r.ok) { const js = await r.json(); if (js.data?.[0]?.id) return js.data[0].id; }
    }
    const body = {
      name: d.name,
      contacts: [{ name: d.name, emails: d.email ? [{ email: d.email, type: "office" }] : [], phones: d.phone ? [{ phone: d.phone, type: "office" }] : [] }],
    };
    const cr = await fetch("https://api.close.com/api/v1/lead/", { method: "POST", headers: { Authorization: closeAuth, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (cr.ok) { const cd = await cr.json(); return cd.id ?? null; }
  } catch (_) { /* non-fatal */ }
  return null;
}
async function addCloseNote(leadId: string, body: string) {
  await fetch("https://api.close.com/api/v1/activity/note/", {
    method: "POST", headers: { Authorization: closeAuth, "Content-Type": "application/json" },
    body: JSON.stringify({ lead_id: leadId, note: body }),
  }).catch(() => {});
}

// ---- CC360 / GoHighLevel — UPSERT so existing files get tagged, not duplicated ----
async function upsertCC360(d: any, channel: string): Promise<{ ok: boolean; id?: string; status?: number; reason?: string }> {
  if (!GT || !LOC) return { ok: false, reason: "no token" };
  const [first, ...rest] = (d.name || "").split(" ");
  const tags = [
    "masterclass-optin", "revenue-accelerator", "lead-magnet",
    channel === "IG_paid" ? "ig-paid" : channel === "IG_inbound" ? "ig-inbound" : "channel-other",
  ];
  if (d.utm?.utm_campaign) tags.push("campaign-" + String(d.utm.utm_campaign).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40));
  try {
    // v2 upsert: merges by email/phone within the location, ADDS tags to existing contacts.
    const r = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
      method: "POST",
      headers: { Authorization: "Bearer " + GT, Version: "2021-07-28", "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId: LOC,
        firstName: first || d.name, lastName: rest.join(" ") || undefined,
        email: d.email, phone: d.phone || undefined,
        source: OFFER, tags,
      }),
    });
    if (r.ok) { const cd = await r.json(); return { ok: true, id: cd?.contact?.id ?? cd?.id, status: r.status }; }
    return { ok: false, status: r.status };
  } catch (e) { return { ok: false, reason: String(e) }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);
  let d: any;
  try { d = await req.json(); } catch { return j({ error: "invalid json" }, 400); }

  if (d.company) return j({ ok: true });                              // honeypot
  const name = String(d.name || "").trim();
  const email = String(d.email || "").trim().toLowerCase();
  const phone = String(d.phone || "").trim();
  if (!name || !emailOk(email)) return j({ error: "name and a valid email are required" }, 400);
  d = { ...d, name, email, phone };

  const channel = channelFromUtm(d.utm);
  const result: any = { ok: true, action: null, os: false, close: false, cc360: false, offer: OFFER };

  // 2) CC360 / GHL — upsert first so we can carry cc360_id onto the Sales OS row (keeps identity in sync).
  let cc360Id: string | null = null;
  try {
    const cc = await upsertCC360(d, channel);
    result.cc360 = cc.ok; cc360Id = cc.id ?? null;
    if (!cc.ok) result.cc360_status = cc.status;
  } catch (e) { result.cc360_error = String((e as any)?.message ?? e); }

  // 3) Close — find-or-create the sales-CRM lead (dedup by email).
  let closeId: string | null = null;
  try { closeId = await findOrCreateCloseLead(d); result.close = !!closeId; }
  catch (e) { result.close_error = String((e as any)?.message ?? e); }

  // 1) Sales OS — the source of truth. One row per person; never clobber good data.
  try {
    // Identity resolution: match on email OR any external id we just learned.
    let existing: any = null;
    if (email) {
      const r = await supabase.from("leads").select("lead_id,status,marketing_qualified,current_owner_id,cc360_id,close_id").eq("email", email).limit(1).maybeSingle();
      existing = r.data ?? null;
    }
    if (!existing && cc360Id) {
      const r = await supabase.from("leads").select("lead_id,status,marketing_qualified,current_owner_id,cc360_id,close_id").eq("cc360_id", cc360Id).limit(1).maybeSingle();
      existing = r.data ?? null;
    }

    let leadId: string | null = null;
    if (existing) {
      // UPDATE existing file — fill blanks only, mark MQL, gentle status nudge.
      const patch: any = { marketing_qualified: true };
      if (name && name !== "Unknown") patch.name = name;
      if (phone) patch.phone = phone;
      if (cc360Id && !existing.cc360_id) patch.cc360_id = cc360Id;
      if (closeId && !existing.close_id) patch.close_id = closeId;
      // Only advance a cold lead to "engaged" — never downgrade someone already in the pipeline.
      if (!existing.status || existing.status === "new") patch.status = "engaged";
      await supabase.from("leads").update(patch).eq("lead_id", existing.lead_id);
      leadId = existing.lead_id;
      result.action = "updated";
    } else {
      // NEW top-of-funnel lead — marketing-qualified, unassigned (setters/routing work these).
      const ins = await supabase.from("leads").insert({
        name, email, phone: phone || null,
        channel, first_source_system: "CC360",
        marketing_qualified: true, sales_qualified: false, status: "new",
        cc360_id: cc360Id, close_id: closeId,
      }).select("lead_id").single();
      leadId = ins.data?.lead_id ?? null;
      result.action = "inserted";
    }

    if (leadId) {
      result.os = true; result.lead_id = leadId;
      // Opt-in note (best-effort — a schema/constraint mismatch must not fail capture).
      try { await supabase.from("lead_notes").insert({ lead_id: leadId, kind: "note", body: noteBody(d, channel), ts: new Date().toISOString() }); }
      catch (_) { /* non-fatal */ }
    }
  } catch (e) { result.os_error = String((e as any)?.message ?? e); }

  // Close note last, now that we know the story (best-effort).
  try { if (closeId) await addCloseNote(closeId, noteBody(d, channel)); } catch (_) { /* non-fatal */ }

  return j(result);
});
