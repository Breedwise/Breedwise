// ────────────────────────────────────────────────────────────────────
//  BreedWise — First-party engagement tracking (ingest)
//  Anonymous, no PII. Receives two beacon types from the site tracker:
//   t:"pv"       → one per page load (counts a view)
//   t:"session"  → engagement snapshot (active time, scroll depth,
//                  per-section dwell, form reached/started), keyed by sid
//  Stored in tool_submissions (tool='site-pageview' / 'site-session').
//  Deploy: supabase functions deploy track --project-ref xhjdowbnqcsvhtcccuqx --no-verify-jwt
// ────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...cors } });
const clip = (s: any, n = 120) => String(s ?? "").slice(0, n);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);
  let b: any; try { b = await req.json(); } catch { return j({ error: "bad json" }, 400); }
  const t = String(b.t ?? "");
  const page = clip(b.page || "", 120);
  const sid = clip(b.sid || "", 60);
  if (!page || (t !== "pv" && t !== "session")) return j({ ok: true, skipped: true });

  try {
    if (t === "pv") {
      await supabase.from("tool_submissions").insert({
        tool: "site-pageview", tool_label: "Pageview", member_email: null, member_name: null,
        summary: page,
        meta: { sid, page, ref: clip(b.ref || "", 200), src: clip(b.src || "", 60), w: Number(b.w) || null, h: Number(b.h) || null, ts: Math.floor(Date.now() / 1000) },
        inputs: null, result: null,
      });
    } else {
      const sections = (b.sections && typeof b.sections === "object") ? b.sections : {};
      const clean: Record<string, number> = {};
      Object.keys(sections).slice(0, 40).forEach((k) => { const v = Number(sections[k]); if (v > 0) clean[clip(k, 60)] = Math.round(v); });
      await supabase.from("tool_submissions").insert({
        tool: "site-session", tool_label: "Site Session", member_email: null, member_name: null,
        summary: `${page} · ${Math.round(Number(b.active) || 0)}s · ${Math.round(Number(b.scroll) || 0)}%`,
        meta: {
          sid, page, dur: Math.round(Number(b.dur) || 0), active: Math.round(Number(b.active) || 0),
          scroll: Math.round(Number(b.scroll) || 0), sections: clean,
          reachedForm: !!b.reachedForm, startedForm: !!b.startedForm, src: clip(b.src || "", 60), ts: Math.floor(Date.now() / 1000),
        },
        inputs: null, result: null,
      });
    }
  } catch (_) { /* never block a beacon */ }
  return j({ ok: true });
});
