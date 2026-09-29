// ────────────────────────────────────────────────────────────────────
//  Breedwise — VSL application intake (public endpoint)
//  Captures the 10-question application, SCORES it, and writes it into
//  all three systems:
//   1. Sales OS  (direct Supabase write — never lose a lead)
//   2. Close     (lead + full application note, tier in the subject line)
//   3. CC360     (best-effort contact + qualification tags for workflows)
//  Honeypot + validation protected. Returns { ok, tier, calendar }.
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

// ---- human-readable labels for the answer codes (Breeder Gameplan application) ----
const L: Record<string, Record<string, string>> = {
  litters_last:  { "0": "0", "1-2": "1–2", "3-5": "3–5", "6plus": "6+" },
  litters_next:  { "1": "1", "2-3": "2–3", "4-6": "4–6", "7plus": "7+" },
  price_current: { under2k: "Under $2,000", "2-4k": "$2,000–$4,000", "4-6k": "$4,000–$6,000", "6kplus": "$6,000+" },
  price_target:  { "4-6k": "$4,000–$6,000", "6-8k": "$6,000–$8,000", "8-12k": "$8,000–$12,000", "12kplus": "$12,000+" },
  struggle:      { whelping: "Whelping & losing puppies", genetics: "Genetics & health testing", pricing: "Pricing — charging what it's worth", selling: "Selling pups / building demand", buyers: "Finding qualified buyers & placements" },
  income_goal:   { under25: "Under $25,000", "25-50": "$25,000–$50,000", "50-100": "$50,000–$100,000", "100-250": "$100,000–$250,000", "250plus": "$250,000+" },
  investment:    { yes: "Yes — has at least $1,500 to invest", no: "No — not at $1,500 right now" },
  breeding_status: { first: "Planning first litter", "1-3": "1–3 litters", "4-10": "4–10 litters", "10plus": "10+ litters (established)" },
  females:        { "1": "1", "2-3": "2–3", "4-6": "4–6", "7plus": "7+" },
  health_testing: { full: "Full testing to breed standard", some: "Some testing, building toward full", starting: "Not yet, committed to start", none: "Little to none right now" },
  waitlist:       { full: "Full waitlist, buyers ready", some: "Some interest, no real waitlist", perlitter: "Markets each litter as it comes", struggle: "Struggles to find buyers" },
  timeline:       { now: "Right now / next 30 days", "1-3": "1–3 months", "3-6": "3–6 months", "6plus": "6+ months / exploring" },
  decision:       { me: "Just me", partner: "Me + partner/spouse", other: "Someone else (not decision-maker)" },
  decide:         { yes: "Yes", no: "No" },
};
const lab = (k: string, v: string) => (L[k] && L[k][v]) || v;

// ---- scoring & tier (Breeder Gameplan qualification) ----
function scoreApp(d: any) {
  const importance = Math.max(0, Math.min(10, parseInt(d.importance ?? d.urgency) || 0));
  let s = 0;
  s += d.investment === "yes" ? 40 : 0;                                         // ability to invest ($1,500+)
  s += importance * 3;                                                          // urgency to raise standards (0–30)
  s += ({ under25: 0, "25-50": 5, "50-100": 10, "100-250": 13, "250plus": 15 } as Record<string, number>)[d.income_goal] ?? 0;
  s += ({ "1": 2, "2-3": 4, "4-6": 6, "7plus": 8 } as Record<string, number>)[d.litters_next] ?? 0;   // volume signal
  if (["6-8k", "8-12k", "12kplus"].includes(d.price_target)) s += 5;            // premium ambition
  const disq = d.investment === "no" || importance <= 2;
  const tier = disq ? "disqualified" : (d.investment === "yes" && importance >= 8) ? "hot" : "warm";
  return { score: Math.max(0, s), tier, urgency: importance };
}

function noteBody(d: any, sc: any) {
  const lines = [
    `🎯 BREEDER GAMEPLAN APPLICATION · tier: ${sc.tier.toUpperCase()} · score ${sc.score} · importance ${sc.urgency}/10`,
    ``,
    `Name: ${d.name}`,
    `Email: ${d.email}`,
    d.phone ? `Phone: ${d.phone}` : null,
    d.breeds ? `Breeds: ${d.breeds}` : null,
    d.litters_last ? `Litters (last 12mo): ${lab("litters_last", d.litters_last)}` : null,
    d.litters_next ? `Litters planned (next 12mo): ${lab("litters_next", d.litters_next)}` : null,
    d.price_current ? `Current price/pup: ${lab("price_current", d.price_current)}` : null,
    d.price_target ? `Target price/pup: ${lab("price_target", d.price_target)}` : null,
    d.struggle ? `Biggest struggle: ${lab("struggle", d.struggle)}` : null,
    d.income_goal ? `12-mo income goal: ${lab("income_goal", d.income_goal)}` : null,
    `Importance to raise standards: ${sc.urgency}/10`,
    `Invest within 90 days: ${lab("investment", d.investment)}`,
    (d.ref || d.affiliate) ? `Referred by (affiliate ref): ${d.ref || d.affiliate}` : null,
  ] as (string | null)[];
  if (d.notes) lines.push(`Notes: ${d.notes}`);
  if (d.utm && Object.keys(d.utm).length) lines.push(`\nUTM: ${JSON.stringify(d.utm)}`);
  if (d.page) lines.push(`Page: ${d.page}`);
  return lines.filter(Boolean).join("\n");
}

// ---- Close ----
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

// ─── CC360 / GoHighLevel (LeadConnector v2) ─────────────────────────────────
const GH = "https://services.leadconnectorhq.com";
const ghHead = { Authorization: "Bearer " + GT, Version: "2021-07-28", "Content-Type": "application/json" };

// Custom-field id lookup, resolved by field NAME (cached per cold start).
// Create fields in CC360 with the names in answerFields() and they auto-map here.
const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
let _cf: Record<string, string> | null = null;
async function cfMap(): Promise<Record<string, string>> {
  if (_cf) return _cf;
  const m: Record<string, string> = {};
  try {
    const r = await fetch(`${GH}/locations/${LOC}/customFields`, { headers: ghHead });
    if (r.ok) {
      const j = await r.json();
      for (const f of (j.customFields || j.customField || [])) {
        if (f?.name) m["name:" + String(f.name).trim().toLowerCase()] = f.id;
        if (f?.fieldKey) m["key:" + String(f.fieldKey).replace(/^contact\./, "").trim().toLowerCase()] = f.id;
      }
    }
  } catch (_) { /* */ }
  _cf = m; return m;
}
// Pipeline lookup by NAME (cached).
let _pipes: any = null;
async function findPipeline(name: string) {
  if (!_pipes) { try { const r = await fetch(`${GH}/opportunities/pipelines?locationId=${LOC}`, { headers: ghHead }); _pipes = r.ok ? await r.json() : { pipelines: [] }; } catch (_) { _pipes = { pipelines: [] }; } }
  return (_pipes.pipelines || []).find((p: any) => String(p.name || "").trim().toLowerCase() === name.toLowerCase()) || null;
}

// Every application answer → the CC360 custom-field NAME it populates.
function answerFields(d: any, sc: any): Record<string, string> {
  return {
    "Breeds": d.breeds || "",
    "Breeding Females": lab("females", d.females),
    "Breeding Stage": lab("breeding_status", d.breeding_status),
    "Litters Last 12mo": lab("litters_last", d.litters_last),
    "Litters Next 12mo": lab("litters_next", d.litters_next),
    "Biggest Challenge": lab("struggle", d.struggle),
    "Health Testing": lab("health_testing", d.health_testing),
    "Current Puppy Price": lab("price_current", d.price_current),
    "Buyer Pipeline": lab("waitlist", d.waitlist),
    "Instagram Handle": d.instagram || "",
    "Investment Ready": lab("investment", d.investment),
    "Timeline To Improve": lab("timeline", d.timeline),
    "Decision Maker": lab("decision", d.decision),
    "Ready To Decide": lab("decide", d.alignment ?? d.decide),
    "Application Tier": sc.tier,
    "Application Score": String(sc.score),
    "Application Urgency": String(sc.urgency) + "/10",
  };
}

// Contact upsert with all answers as custom fields + full segmentation tags.
async function pushCC360(d: any, sc: any, owner: string) {
  if (!GT || !LOC) return { ok: false, reason: "no token" };
  const [first, ...rest] = (d.name || "").split(" ");
  const tags = [
    "academy-application",
    sc.tier === "disqualified" ? "academy-disqualified" : "academy-qualified",  // single trigger tag for the one workflow
    "tier-" + sc.tier,
    "urgency-" + sc.urgency,
    "invest-" + (d.investment || "na"),
    "stage-" + (d.breeding_status || "na"),
    "challenge-" + (d.struggle || "na"),
    "price-" + (d.price_current || "na"),
    "waitlist-" + (d.waitlist || "na"),
    "timeline-" + (d.timeline || "na"),
    "decision-" + (d.decision || "na"),
    "owner-" + owner,
    d.investment === "yes" ? "ready-to-invest" : "not-ready",
  ];
  const map = await cfMap();
  const cf: { id: string; field_value: string }[] = [];
  for (const [name, val] of Object.entries(answerFields(d, sc))) {
    const id = map["name:" + name.trim().toLowerCase()] || map["key:" + slug(name)];
    if (id && val) cf.push({ id, field_value: String(val) });
  }
  try {
    // upsert (create OR update by email/phone) so returning / previously-imported contacts
    // still get tagged + fielded and trigger the workflow, instead of a 400 on duplicate.
    const r = await fetch(`${GH}/contacts/upsert`, {
      method: "POST", headers: ghHead,
      body: JSON.stringify({
        locationId: LOC, firstName: first || d.name, lastName: rest.join(" ") || undefined,
        email: d.email, phone: d.phone || undefined, source: d.source || "Academy Application",
        tags, customFields: cf.length ? cf : undefined,
      }),
    });
    let contactId: string | null = null; let err = "";
    if (r.ok) { const jj = await r.json(); contactId = jj?.contact?.id ?? jj?.id ?? null; }
    else { try { err = (await r.text()).slice(0, 400); } catch (_) { /* */ } }
    if (!contactId && d.email) {   // duplicate: fetch existing id
      try { const s = await fetch(`${GH}/contacts/search/duplicate?locationId=${LOC}&email=${encodeURIComponent(d.email)}`, { headers: ghHead }); if (s.ok) { const sj = await s.json(); contactId = sj?.contact?.id ?? null; } } catch (_) { /* */ }
    }
    return { ok: r.ok, status: r.status, contactId, fields: cf.length, err };
  } catch (e) { return { ok: false, reason: String(e) }; }
}

// Create the pipeline opportunity. Lands in the "application submitted" stage of the
// first matching existing pipeline; tier tags drive the workflow routing after that.
async function createOpportunity(d: any, sc: any, contactId: string) {
  if (!GT || !LOC || !contactId) return { ok: false };
  const CANDIDATES = ["New VSL Funnel"];
  let p: any = null;
  for (const nm of CANDIDATES) { p = await findPipeline(nm); if (p) break; }
  if (!p) return { ok: false, reason: "no pipeline" };
  const stages = p.stages || [];
  const pick = (re: RegExp) => stages.find((s: any) => re.test(s.name || ""));
  const stage = sc.tier === "disqualified"
    ? (pick(/not a fit|not qualified/i) || pick(/application submitted|application started|new lead|new opt/i) || stages[0])
    : (pick(/application submitted|application started/i) || pick(/new lead|new opt|new/i) || stages[0]);
  if (!stage) return { ok: false, reason: "no stage" };
  const value = sc.tier === "disqualified" ? 291 : 6000;   // qualified -> $6k Academy; disqualified -> $291 TPB
  try {
    const r = await fetch(`${GH}/opportunities/`, {
      method: "POST", headers: ghHead,
      body: JSON.stringify({ pipelineId: p.id, locationId: LOC, pipelineStageId: stage.id, contactId, name: (d.name || "Applicant") + " · " + String(sc.tier).toUpperCase(), status: "open", monetaryValue: value }),
    });
    return { ok: r.ok, status: r.status };
  } catch (e) { return { ok: false, reason: String(e) }; }
}

// ---- analytics + reliability hooks (each no-ops unless its secret is set) ----
const SLACK = Deno.env.get("SLACK_WEBHOOK_URL") ?? "";
const SHEETS = Deno.env.get("SHEETS_WEBHOOK_URL") ?? "";
const FB_PIXEL = Deno.env.get("META_PIXEL_ID") ?? "";
const FB_TOKEN = Deno.env.get("META_CAPI_TOKEN") ?? "";

async function alertSlack(text: string) {
  if (!SLACK) return;
  try { await fetch(SLACK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }); } catch (_) { /* */ }
}
async function pushSheets(d: any, sc: any, owner: string) {
  if (!SHEETS) return;
  const row = {
    tab: "Applications",
    ts: new Date().toISOString(), name: d.name, email: d.email, phone: d.phone,
    tier: sc.tier, score: sc.score, urgency: sc.urgency, owner,
    breeds: d.breeds || "", breeding_status: d.breeding_status || "", females: d.females || "",
    litters_next: d.litters_next || "", challenge: d.challenge || d.struggle || "",
    health_testing: d.health_testing || "", price_current: d.price_current || "",
    investment: d.investment || "", timeline: d.timeline || "", decision: d.decision || "",
    source: d.source || "", page: d.page || "",
  };
  try { await fetch(SHEETS, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row) }); } catch (_) { /* */ }
}
async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function fbCapi(d: any, sc: any, src: string, attr: any = {}) {
  if (!FB_PIXEL || !FB_TOKEN) return;
  try {
    const em = d.email ? [await sha256(d.email)] : [];
    const ph = d.phone ? [await sha256(String(d.phone).replace(/[^0-9]/g, ""))] : [];
    const ud: any = { em, ph };
    if (attr.fbp) ud.fbp = attr.fbp;                       // browser pixel cookie — top match signal
    if (attr.fbc) ud.fbc = attr.fbc;                       // click id (fbclid) — ties event to the ad click
    if (attr.ip) ud.client_ip_address = attr.ip;
    if (attr.ua) ud.client_user_agent = attr.ua;
    const now = Math.floor(Date.now() / 1000);
    const events: any[] = [
      // Lead uses the same event_id as the browser Lead on application-received.html → deduped.
      { event_name: "Lead", event_time: now, action_source: "website", event_source_url: src, ...(attr.eventId ? { event_id: attr.eventId } : {}), user_data: ud, custom_data: { value: 1500, currency: "USD", content_name: "Academy Application", status: sc.tier } },
    ];
    // QualifiedLead (server-only, no browser twin) carries the richer $6k value for quality optimization.
    if (sc.tier !== "disqualified") {
      events.push({ event_name: "QualifiedLead", event_time: now, action_source: "website", event_source_url: src, user_data: ud, custom_data: { value: 6000, currency: "USD", content_name: "Academy Qualified Application", status: sc.tier } });
    }
    await fetch(`https://graph.facebook.com/v19.0/${FB_PIXEL}/events?access_token=${FB_TOKEN}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: events }) });
  } catch (_) { /* */ }
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
  if (!name || !emailOk(email) || !phone) return j({ error: "name, valid email and phone are required" }, 400);
  d = { ...d, name, email, phone };

  // Affiliate attribution — ?ref=CODE ties this applicant to the referring partner (first-touch).
  const refCode = String(d.ref || d.affiliate || "").trim();
  let affiliateId: string | null = null;
  if (refCode) {
    try {
      const a = await supabase.from("affiliates").select("id").ilike("ref_code", refCode).limit(1).maybeSingle();
      affiliateId = a.data?.id != null ? String(a.data.id) : null;
    } catch (_) { /* affiliates schema not applied yet — non-fatal */ }
  }

  const sc = scoreApp(d);
  // Setter/closer model: inbound leads go to the SETTER who works + books the Fit Call;
  // the closer (Austin) is assigned at booking. One setter now (Regina); round-robin when Yasmin starts.
  const SETTERS = ["regina"];                                          // add "yasmin" when she starts
  const owner = SETTERS[Math.floor(Math.random() * SETTERS.length)];
  const result: any = { ok: true, tier: sc.tier, score: sc.score, owner, os: false, close: false, cc360: false };

  // 1) Sales OS — direct write (source of truth; never lose the lead) ----------
  try {
    let leadId: string | null = null;
    const found = await supabase.from("leads").select("lead_id,status,current_owner_id,affiliate_id").eq("email", email).limit(1).maybeSingle();
    const leadPatch: any = {
      name, email, phone, channel: "IG_inbound", first_source_system: "CC360",
      marketing_qualified: true, sales_qualified: sc.tier !== "disqualified",
      app_tier: sc.tier, app_score: sc.score, app_urgency: sc.urgency, applied_at: new Date().toISOString(),
    };
    if (!found.data || found.data.status === "new" || !found.data.status) leadPatch.status = "engaged";
    if (!found.data || !found.data.current_owner_id) leadPatch.current_owner_id = owner;   // assign closer if unowned
    if (affiliateId && (!found.data || !found.data.affiliate_id)) leadPatch.affiliate_id = affiliateId; // first-touch attribution
    if (found.data) { leadId = found.data.lead_id; await supabase.from("leads").update(leadPatch).eq("lead_id", leadId); }
    else { const ins = await supabase.from("leads").insert(leadPatch).select("lead_id").single(); leadId = ins.data?.lead_id ?? null; }

    if (leadId) {
      await supabase.from("applications").insert({
        lead_id: leadId, name, email, phone,
        breeding_status: d.breeding_status, next_litter: d.next_litter, urgency: sc.urgency,
        investment: d.investment, mindset: d.mindset, ethical_meaning: d.ethical_meaning || null,
        practices: Array.isArray(d.practices) ? d.practices : [], alignment: d.alignment,
        goal: d.goal || null, challenge: d.challenge || null,
        score: sc.score, tier: sc.tier, utm: d.utm || {}, source: d.source || "VSL Landing Page", page: d.page || null,
      });
      await supabase.from("lead_notes").insert({ lead_id: leadId, kind: "application", body: noteBody(d, sc), ts: new Date().toISOString() });
      result.os = true; result.lead_id = leadId;
    }
  } catch (e) { result.os_error = String((e as any)?.message ?? e); }

  // 2) CC360 — the funnel trigger (contact + fields + tags + opportunity). Critical path.
  try {
    const cc = await pushCC360(d, sc, owner);
    result.cc360 = cc.ok; result.cc360_fields = (cc as any).fields ?? 0; if (!cc.ok) { result.cc360_status = cc.status; result.cc360_err = (cc as any).err; result.cc360_contact = (cc as any).contactId; }
    if ((cc as any).contactId) { result.cc360_contact_id = (cc as any).contactId; const op = await createOpportunity(d, sc, (cc as any).contactId); result.cc360_opp = op.ok; }
  } catch (e) { result.cc360_error = String((e as any)?.message ?? e); }

  // 3) Dialer mirror + analytics + alerts — run in the BACKGROUND after responding,
  //    so the intake response returns fast (keepalive on the client completes the rest).
  const referer = d.page || req.headers.get("referer") || "";
  // Meta attribution captured at application time — travels to CAPI now (Lead) and later (Schedule).
  const attr = {
    fbp: String(d.fbp || ""),
    fbc: String(d.fbc || ""),
    ip: (req.headers.get("x-forwarded-for") || "").split(",")[0].trim(),
    ua: req.headers.get("user-agent") || "",
    eventId: String(d.event_id || ""),
  };
  const background = (async () => {
    try {                                                   // Close dialer mirror
      const closeId = await findOrCreateCloseLead(d);
      if (closeId) {
        await addCloseNote(closeId, noteBody(d, sc));
        if (result.lead_id) await supabase.from("leads").update({ close_id: closeId }).eq("lead_id", result.lead_id);
      }
    } catch (_) { /* */ }
    try { await pushSheets(d, sc, owner); } catch (_) { /* */ }
    try { await fbCapi(d, sc, referer, attr); } catch (_) { /* */ }
    // Completed application supersedes any earlier partial capture — clear those tags.
    try { if (result.cc360_contact_id) await fetch(`${GH}/contacts/${result.cc360_contact_id}/tags`, { method: "DELETE", headers: ghHead, body: JSON.stringify({ tags: ["application-partial", "application-started"] }) }); } catch (_) { /* */ }
    // Persist attribution keyed by email so the off-page Schedule CAPI event (fired weeks later
    // from CC360 when the call is booked) can match back to the original ad click.
    try {
      await supabase.from("tool_submissions").insert({
        tool: "meta-attribution", tool_label: "Meta Attribution", member_email: email, member_name: name,
        summary: `fbc:${attr.fbc ? "y" : "n"} fbp:${attr.fbp ? "y" : "n"}`,
        meta: { fbp: attr.fbp || null, fbc: attr.fbc || null, ip: attr.ip || null, ua: attr.ua || null, fbclid: d.fbclid || null, event_id: attr.eventId || null, captured_at: Math.floor(Date.now() / 1000) },
        inputs: null, result: null,
      });
    } catch (_) { /* */ }
    try {
      const fail: string[] = [];
      if (!result.cc360) fail.push("CC360 push failed" + (result.cc360_status ? ` (status ${result.cc360_status})` : ""));
      if (!result.os) fail.push("Sales OS write failed");
      if (fail.length) await alertSlack(`:warning: Intake issue — ${name} <${email}> (tier ${sc.tier}). ${fail.join("; ")}. Recover this lead manually.`);
      else if (sc.tier === "hot") await alertSlack(`:fire: HOT lead — ${name} · ${d.breeds || "breed n/a"} · ${phone} · owner ${owner}. Call now.`);
    } catch (_) { /* */ }
  })();
  try { (globalThis as any).EdgeRuntime?.waitUntil?.(background); } catch (_) { /* */ }

  return j(result);
});
