// ────────────────────────────────────────────────────────────────────
//  BreedWise — First-party engagement analytics (read/aggregate)
//  Aggregates the site-pageview / site-session rows written by `track`
//  into views, time-on-page, scroll depth, per-section dwell and form
//  reach/start — per page and overall. Gated by DASH_SECRET.
//  Deploy: supabase functions deploy site-analytics --project-ref xhjdowbnqcsvhtcccuqx --no-verify-jwt
// ────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SECRET = Deno.env.get("DASH_SECRET") ?? "";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };
const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...cors } });
const avg = (a: number[]) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  if (!SECRET || url.searchParams.get("secret") !== SECRET) return j({ error: "unauthorized" }, 401);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days")) || 30));
  const since = new Date(Date.now() - days * 86400000).toISOString();

  let rows: any[] = [];
  try {
    const { data } = await supabase.from("tool_submissions").select("tool,meta,created_at")
      .in("tool", ["site-pageview", "site-session"]).gte("created_at", since).limit(20000);
    rows = data || [];
  } catch (e) { return j({ error: "query failed", detail: String(e) }, 502); }

  // Exclude verification/test rows so the dashboard reflects real traffic only.
  const TEST_SRC = new Set(["corsdiag", "beacontest", "qa-analytics"]);
  const isTest = (m: any) => !m || /^(qa|corstest)/i.test(String(m.sid || "")) || TEST_SRC.has(String(m.src || ""));
  const pvs = rows.filter((r) => r.tool === "site-pageview").map((r) => r.meta || {}).filter((m) => !isTest(m));
  // Dedup session rows by sid — keep the one with the most active time (fullest snapshot).
  const bySid: Record<string, any> = {};
  rows.filter((r) => r.tool === "site-session").forEach((r) => {
    const m = r.meta || {}; if (isTest(m)) return; const sid = m.sid || Math.random();
    if (!bySid[sid] || (Number(m.active) || 0) > (Number(bySid[sid].active) || 0)) bySid[sid] = m;
  });
  const sessions = Object.values(bySid);

  const pages = Array.from(new Set([...pvs.map((m: any) => m.page), ...sessions.map((m: any) => m.page)].filter(Boolean)));
  function build(pvSet: any[], sess: any[]) {
    const views = pvSet.length;
    const uniques = new Set(pvSet.map((m) => m.sid).filter(Boolean)).size;
    const active = sess.map((m: any) => Number(m.active) || 0);
    const scroll = sess.map((m: any) => Number(m.scroll) || 0);
    const dist = { d25: 0, d50: 0, d75: 0, d100: 0 };
    scroll.forEach((s) => { if (s >= 25) dist.d25++; if (s >= 50) dist.d50++; if (s >= 75) dist.d75++; if (s >= 100) dist.d100++; });
    const secAgg: Record<string, { total: number; n: number }> = {};
    sess.forEach((m: any) => { const s = m.sections || {}; Object.keys(s).forEach((k) => { (secAgg[k] = secAgg[k] || { total: 0, n: 0 }); secAgg[k].total += Number(s[k]) || 0; secAgg[k].n++; }); });
    const sections = Object.keys(secAgg).map((k) => ({ label: k, avgSec: Math.round(secAgg[k].total / secAgg[k].n), seen: secAgg[k].n })).sort((a, b) => b.avgSec - a.avgSec);
    const reached = sess.filter((m: any) => m.reachedForm).length;
    const started = sess.filter((m: any) => m.startedForm).length;
    const refs: Record<string, number> = {};
    pvSet.forEach((m) => { const r = (m.src || refHost(m.ref) || "direct"); refs[r] = (refs[r] || 0) + 1; });
    const sources = Object.keys(refs).map((k) => ({ src: k, n: refs[k] })).sort((a, b) => b.n - a.n).slice(0, 8);
    return {
      views, uniques, sessions: sess.length,
      avgActiveSec: avg(active), avgScrollPct: avg(scroll),
      scrollFunnel: dist,
      formReachedPct: sess.length ? Math.round(reached / sess.length * 100) : 0,
      formStartedPct: sess.length ? Math.round(started / sess.length * 100) : 0,
      sections: sections.slice(0, 24), sources,
    };
  }
  function refHost(u: string) { try { return u ? new URL(u).hostname.replace(/^www\./, "") : ""; } catch { return ""; } }

  const perPage: Record<string, any> = {};
  pages.forEach((p) => { perPage[p] = build(pvs.filter((m: any) => m.page === p), sessions.filter((m: any) => m.page === p)); });
  const overall = build(pvs, sessions);

  return j({ ok: true, generated: new Date().toISOString(), days, overall, pages: perPage });
});
