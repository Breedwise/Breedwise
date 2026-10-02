// ────────────────────────────────────────────────────────────────────
//  BreedWise — Real-time command dashboard feed (Geckoboard-style)
//  One gated endpoint that fans out to every source and returns a single
//  JSON the wall display polls. Tokens stay server-side.
//    1) website   — first-party page analytics (tool_submissions)
//    2) ads        — Meta ad insights (spend / leads / CPL / ROAS)   [needs META_ADS_TOKEN]
//    3) crm        — CC360 pipeline stage distribution + value, outbound
//    4) cash       — Stripe cash collected (today / 7d / MTD)
//  Gated by DASH_SECRET (?secret= or x-dash-secret header).
//  Deploy: supabase functions deploy bw-dashboard --project-ref xhjdowbnqcsvhtcccuqx --no-verify-jwt
// ────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const DASH = Deno.env.get("DASH_SECRET") ?? "";
const CC = Deno.env.get("CC360_TOKEN") ?? "";
const CC_LOC = Deno.env.get("CC360_LOCATION") ?? "";
const STRIPE = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const CLOSE = Deno.env.get("CLOSE_API_KEY") ?? "";
const META_ADS = Deno.env.get("META_ADS_TOKEN") ?? "";
const META_ACCT = Deno.env.get("META_AD_ACCOUNT_ID") ?? "832632449145533"; // Breedwise Ad Account
const GH = "https://services.leadconnectorhq.com";
const ccHead = { Authorization: "Bearer " + CC, Version: "2021-07-28", "Content-Type": "application/json" };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };
const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...cors } });

// timed fetch so one slow upstream never stalls the whole board
async function tf(url: string, opts: RequestInit = {}, ms = 9000): Promise<Response> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...opts, signal: c.signal }); } finally { clearTimeout(t); }
}
const num = (v: unknown) => Number(v) || 0;
const DAY = 86400000;
function bounds() {
  const now = Date.now();
  const d = new Date();
  const y = d.getUTCFullYear(), mo = d.getUTCMonth();
  const mtd = Date.UTC(y, mo, 1);
  const daysInMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  const dayOfMonth = d.getUTCDate();
  return { now, t24: now - DAY, t48: now - 2 * DAY, d7: now - 7 * DAY, d30: now - 30 * DAY, mtd, dayOfMonth, daysInMonth };
}

/* ---------- 1) WEBSITE (first-party analytics) ---------- */
async function website() {
  const b = bounds();
  const since = new Date(b.d7).toISOString();
  const { data } = await supabase.from("tool_submissions").select("tool,meta,created_at")
    .in("tool", ["site-pageview", "site-session"]).gte("created_at", since).limit(20000);
  const rows = data || [];
  const TEST_SRC = new Set(["corsdiag", "beacontest", "qa-analytics"]);
  const isTest = (m: any) => !m || /^(qa|corstest)/i.test(String(m.sid || "")) || TEST_SRC.has(String(m.src || ""));
  const pv = rows.filter((r) => r.tool === "site-pageview" && !isTest(r.meta));
  const ses: any = {};
  rows.filter((r) => r.tool === "site-session" && !isTest(r.meta)).forEach((r) => {
    const m = r.meta || {}, sid = m.sid || Math.random();
    if (!ses[sid] || num(m.active) > num(ses[sid].active)) ses[sid] = m;
  });
  const sessions = Object.values(ses) as any[];
  const t24 = new Date(b.t24).toISOString();
  const pv24 = pv.filter((r) => r.created_at >= t24);
  const avg = (a: number[]) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;
  const pageCount: Record<string, number> = {};
  pv.forEach((r) => { const p = (r.meta || {}).page || "?"; pageCount[p] = (pageCount[p] || 0) + 1; });
  const topPages = Object.entries(pageCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([page, n]) => ({ page, n }));
  const reached = sessions.filter((m) => m.reachedForm).length;
  const started = sessions.filter((m) => m.startedForm).length;
  return {
    available: true,
    views24: pv24.length, views7d: pv.length,
    sessions7d: sessions.length,
    uniques24: new Set(pv24.map((r) => (r.meta || {}).sid).filter(Boolean)).size,
    uniques7d: new Set(pv.map((r) => (r.meta || {}).sid).filter(Boolean)).size,
    avgActiveSec: avg(sessions.map((m) => num(m.active))),
    avgScrollPct: avg(sessions.map((m) => num(m.scroll))),
    formReachedPct: sessions.length ? Math.round(reached / sessions.length * 100) : 0,
    formStartedPct: sessions.length ? Math.round(started / sessions.length * 100) : 0,
    topPages,
  };
}

/* ---------- 2) META ADS ---------- */
async function ads() {
  if (!META_ADS) return { available: false, need: "META_ADS_TOKEN", account: META_ACCT };
  const acct = META_ACCT.replace(/^act_/, "");
  const fields = "spend,impressions,clicks,ctr,cpc,actions,action_values,cost_per_action_type";
  async function pull(preset: string) {
    const u = `https://graph.facebook.com/v21.0/act_${acct}/insights?date_preset=${preset}&fields=${fields}&access_token=${encodeURIComponent(META_ADS)}`;
    const r = await tf(u); const jd = await r.json().catch(() => ({}));
    if (jd.error) throw new Error(jd.error.message || "meta error");
    const d = (jd.data && jd.data[0]) || {};
    const leadAct = (arr: any[], key: string) => { const a = (arr || []).find((x) => x.action_type === key || x.action_type === "offsite_conversion.fb_pixel_" + key); return a ? num(a.value) : 0; };
    const leads = leadAct(d.actions, "lead");
    const purchases = leadAct(d.actions, "purchase");
    const revenue = (() => { const a = (d.action_values || []).find((x: any) => x.action_type === "purchase" || x.action_type === "offsite_conversion.fb_pixel_purchase"); return a ? num(a.value) : 0; })();
    const spend = num(d.spend);
    return { spend, impressions: num(d.impressions), clicks: num(d.clicks), ctr: num(d.ctr), leads, purchases, revenue, cpl: leads ? spend / leads : 0, roas: spend ? revenue / spend : 0 };
  }
  try {
    const [today, d7] = await Promise.all([pull("today"), pull("last_7d")]);
    return { available: true, account: acct, today, last7d: d7 };
  } catch (e) { return { available: false, error: String((e as Error).message || e), account: acct }; }
}

/* ---------- 3) CC360 pipeline + outbound ---------- */
async function crm(pipelineIdParam: string) {
  if (!CC || !CC_LOC) return { available: false, need: "CC360_TOKEN" };
  // pipelines → stage id→name map
  const pr = await tf(`${GH}/opportunities/pipelines?locationId=${CC_LOC}`, { headers: ccHead });
  const pj = await pr.json().catch(() => ({} as any));
  const pipelines: any[] = pj.pipelines || [];
  // choose the target pipeline: query param → env → name match → first
  const wanted = (pipelineIdParam || Deno.env.get("DASH_PIPELINE_ID") || "").trim();
  let target = pipelines.find((p) => p.id === wanted)
    || pipelines.find((p) => /new vsl/i.test(p.name))
    || pipelines.find((p) => /sales pipeline/i.test(p.name))
    || pipelines[0];
  const stageMeta: Record<string, { name: string; order: number }> = {};
  (target?.stages || []).forEach((s: any, i: number) => { stageMeta[s.id] = { name: s.name, order: s.position ?? i }; });
  // pull ALL open opportunities in the target pipeline (one pipeline is small enough)
  const b = bounds();
  const stages: Record<string, { name: string; order: number; count: number; value: number }> = {};
  let totalLeads = 0, totalValue = 0, wonCount = 0, wonValue = 0, openCount = 0, total = 0, startAfter = "", startAfterId = "", pages = 0;
  let newToday = 0, newYest = 0, new7 = 0, stale = 0, bookedCount = 0, enrolledCount = 0, closes7 = 0;
  while (target && pages < 20) {
    // no status filter — every lead that entered the funnel, by stage
    let u = `${GH}/opportunities/search?location_id=${CC_LOC}&limit=100&pipeline_id=${target.id}`;
    if (startAfter) u += `&startAfter=${startAfter}&startAfterId=${startAfterId}`;
    const r = await tf(u, { headers: ccHead }); const d = await r.json().catch(() => ({} as any));
    const opps: any[] = d.opportunities || [];
    total = d.meta?.total ?? total;
    opps.forEach((o) => {
      const sid = o.pipelineStageId || "unknown";
      const nm = (stageMeta[sid]?.name || "").toLowerCase();
      if (!stages[sid]) stages[sid] = { name: stageMeta[sid]?.name || "Unstaged", order: stageMeta[sid]?.order ?? 99, count: 0, value: 0 };
      stages[sid].count++; stages[sid].value += num(o.monetaryValue);
      totalLeads++; totalValue += num(o.monetaryValue);
      const st = (o.status || "").toLowerCase();
      const created = Date.parse(o.createdAt || o.created_at || "") || 0;
      const updated = Date.parse(o.updatedAt || o.lastStatusChangeAt || o.updated_at || "") || created;
      if (created >= b.t24) newToday++; else if (created >= b.t48) newYest++;
      if (created >= b.d7) new7++;
      if (/booked/.test(nm)) bookedCount++;
      const isEnrolled = /enrolled|won/.test(nm) || st === "won";
      if (isEnrolled) enrolledCount++;
      if (isEnrolled && updated >= b.d7) closes7++;
      if (st === "won") { wonCount++; wonValue += num(o.monetaryValue); }
      else if (st === "open") { openCount++; if (updated < b.now - 3 * DAY) stale++; }
    });
    if (opps.length < 100 || !d.meta?.startAfterId) break;
    startAfter = d.meta.startAfter; startAfterId = d.meta.startAfterId; pages++;
  }
  const dist = Object.values(stages).sort((a, b) => a.order - b.order).map((s) => ({ name: s.name, count: s.count, value: Math.round(s.value) }));
  // outbound via Close dialer (best-effort)
  let outbound: any = { available: false };
  if (CLOSE) {
    try {
      const auth = "Basic " + btoa(CLOSE + ":");
      const b = bounds();
      async function countCalls(sinceMs: number) {
        const since = new Date(sinceMs).toISOString();
        const r = await tf(`https://api.close.com/api/v1/activity/call/?date_created__gte=${since}&_limit=100`, { headers: { Authorization: auth } });
        const d = await r.json().catch(() => ({} as any));
        const data: any[] = d.data || [];
        const out = data.filter((c) => (c.direction || "").toLowerCase() === "outbound").length;
        return { count: out, capped: !!d.has_more };
      }
      const [c24, c7] = await Promise.all([countCalls(b.t24), countCalls(b.d7)]);
      outbound = { available: true, calls24: c24.count, calls24Capped: c24.capped, calls7d: c7.count, calls7dCapped: c7.capped };
    } catch (e) { outbound = { available: false, error: String((e as Error).message || e) }; }
  }
  return { available: true, pipeline: target?.name || "", pipelineId: target?.id || "",
    pipelines: pipelines.map((p) => ({ id: p.id, name: p.name })),
    totalLeads, totalValue: Math.round(totalValue), openCount, wonCount, wonValue: Math.round(wonValue),
    newLeads: { today: newToday, yesterday: newYest, d7: new7 }, applications7d: new7,
    bookedCount, enrolledCount, closes7d: closes7, stale,
    total, distribution: dist, outbound };
}

/* ---------- 4) STRIPE cash collected ---------- */
async function cash() {
  if (!STRIPE) return { available: false, need: "STRIPE_SECRET_KEY" };
  const b = bounds();
  const gte = Math.floor(b.d30 / 1000);
  let url: string | null = `https://api.stripe.com/v1/balance_transactions?limit=100&created[gte]=${gte}`;
  let today = 0, prev = 0, sum7 = 0, sumMtd = 0, sum30 = 0, cnt24 = 0, cntMtd = 0, refunds30 = 0, net30 = 0, pages = 0;
  while (url && pages < 6) {
    const r: Response = await tf(url, { headers: { Authorization: "Bearer " + STRIPE } });
    const d: any = await r.json().catch(() => ({}));
    if (d.error) return { available: false, error: d.error.message };
    (d.data || []).forEach((t: any) => {
      const amt = num(t.amount) / 100, net = num(t.net) / 100, ms = num(t.created) * 1000, ty = t.type;
      if (ty === "charge" || ty === "payment") {
        sum30 += amt; net30 += net;
        if (ms >= b.t24) { today += amt; cnt24++; } else if (ms >= b.t48) prev += amt;
        if (ms >= b.d7) sum7 += amt;
        if (ms >= b.mtd) { sumMtd += amt; cntMtd++; }
      } else if (ty === "refund" || ty === "payment_refund" || ty === "adjustment") {
        refunds30 += Math.abs(amt); net30 += net;
      }
    });
    if (d.has_more && d.data?.length) { const last = d.data[d.data.length - 1].id; url = `https://api.stripe.com/v1/balance_transactions?limit=100&created[gte]=${gte}&starting_after=${last}`; pages++; }
    else url = null;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  const goal = Number(Deno.env.get("DASH_REVENUE_GOAL")) || 100000;
  const expectedByNow = goal * (b.dayOfMonth / b.daysInMonth);
  const daysLeft = Math.max(0, b.daysInMonth - b.dayOfMonth);
  const projectedEOM = b.dayOfMonth > 0 ? sumMtd / b.dayOfMonth * b.daysInMonth : 0;
  const neededPerDay = daysLeft > 0 ? Math.max(0, (goal - sumMtd) / daysLeft) : 0;
  return { available: true, currency: "USD",
    today: round(today), yesterday: round(prev),
    deltaPct: prev > 0 ? Math.round((today - prev) / prev * 100) : null,
    count24: cnt24, last7d: round(sum7), mtd: round(sumMtd), countMtd: cntMtd,
    aov: cntMtd > 0 ? round(sumMtd / cntMtd) : 0, refunds30d: round(refunds30),
    last30d: round(sum30), net30d: round(net30),
    goal, pacePct: expectedByNow > 0 ? Math.round(sumMtd / expectedByNow * 100) : 0,
    onPace: sumMtd >= expectedByNow, expectedByNow: round(expectedByNow),
    neededPerDay: round(neededPerDay), projectedEOM: round(projectedEOM),
    dayOfMonth: b.dayOfMonth, daysInMonth: b.daysInMonth };
}

/* ---------- partials, actual submissions, closes + close rate ---------- */
async function extras() {
  const partial = new Set<string>(), completed = new Set<string>();
  try {
    const { data } = await supabase.from("tool_submissions").select("member_email,meta,tool_label").eq("tool", "meta-attribution").limit(20000);
    (data || []).forEach((r: any) => { const e = String(r.member_email ?? "").trim().toLowerCase(); if (!e) return; const p = r.meta?.partial === true || /partial/i.test(String(r.tool_label || "")); if (p) partial.add(e); else completed.add(e); });
  } catch (_) { /* */ }
  try { const { data } = await supabase.from("applications").select("email").limit(20000); (data || []).forEach((r: any) => { const e = String(r.email ?? "").trim().toLowerCase(); if (e) completed.add(e); }); } catch (_) { /* */ }
  const partialOnly = [...partial].filter((e) => !completed.has(e));
  // open partials tagged in CC360 right now
  let ccOpen = 0;
  if (CC && CC_LOC) { try { for (let page = 1; page <= 15; page++) { const r = await tf(`${GH}/contacts/search`, { method: "POST", headers: ccHead, body: JSON.stringify({ locationId: CC_LOC, page, pageLimit: 100, filters: [{ field: "tags", operator: "contains", value: "application-partial" }] }) }); if (!r.ok) break; const d = await r.json().catch(() => ({} as any)); const cc = d.contacts || d.data || []; ccOpen += cc.length; if (cc.length < 100) break; } } catch (_) { /* */ } }
  // manually-logged closes (survives off-Stripe deals)
  let academy = 0, tpb = 0, academyCash = 0, updated: string | null = null;
  try { const { data } = await supabase.from("tool_submissions").select("meta,updated_at,created_at").eq("tool", "sales-results").order("created_at", { ascending: false }).limit(1); if (data && data[0]) { const mm = data[0].meta || {}; academy = Number(mm.academy) || 0; tpb = Number(mm.tpb) || 0; academyCash = Number(mm.academyCash) || 0; updated = data[0].updated_at || data[0].created_at; } } catch (_) { /* */ }
  const submissions = completed.size;
  const closes = academy + tpb;
  return {
    available: true, submissions,
    partialsOpen: ccOpen, partialsRecoverable: partialOnly.length,
    academy, tpb, closes, academyCash, salesUpdated: updated,
    closeRate: submissions > 0 ? Math.round(closes / submissions * 100) : 0,
    academyCloseRate: submissions > 0 ? Math.round(academy / submissions * 100) : 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // POST: log the current sales results (gated). body: {secret, action:"set-sales", academy, tpb, academyCash}
  if (req.method === "POST") {
    let body: any = {}; try { body = await req.json(); } catch { /* */ }
    if (!DASH || body.secret !== DASH) return j({ error: "unauthorized" }, 401);
    if (body.action === "set-sales") {
      const meta = { academy: Number(body.academy) || 0, tpb: Number(body.tpb) || 0, academyCash: Number(body.academyCash) || 0 };
      const summary = `Academy ${meta.academy} · TPB ${meta.tpb}`;
      try {
        const { data } = await supabase.from("tool_submissions").select("id").eq("tool", "sales-results").order("created_at", { ascending: false }).limit(1);
        if (data && data[0]) await supabase.from("tool_submissions").update({ meta, summary, updated_at: new Date().toISOString() }).eq("id", data[0].id);
        else await supabase.from("tool_submissions").insert({ tool: "sales-results", tool_label: "Sales Results", summary, meta });
        return j({ ok: true, sales: meta });
      } catch (e) { return j({ error: String((e as Error).message || e) }, 500); }
    }
    return j({ error: "unknown action" }, 400);
  }

  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") || req.headers.get("x-dash-secret") || "";
  if (!DASH || secret !== DASH) return j({ error: "unauthorized" }, 401);

  const pipelineId = url.searchParams.get("pipeline_id") || "";
  const [w, a, c, m, e] = await Promise.allSettled([website(), ads(), crm(pipelineId), cash(), extras()]);
  const val = (x: any, label: string) => x.status === "fulfilled" ? x.value : { available: false, error: String(x.reason?.message || x.reason || label + " failed") };
  return j({
    ok: true, generated: new Date().toISOString(),
    website: val(w, "website"), ads: val(a, "ads"), crm: val(c, "crm"), cash: val(m, "cash"), sales: val(e, "extras"),
  });
});
