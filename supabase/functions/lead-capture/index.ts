// ────────────────────────────────────────────────────────────────────
//  BreedWise — Cold lead capture (free-tool lead magnet → CC360)
//  Top-of-funnel: a reel commenter takes the free Scorecard, drops their
//  email, and enters CC360 tagged by their biggest gap + the reel angle,
//  ready for the "→ TPB" nurture workflow. Logs to tool_submissions too.
//  Light abuse gate via CAPTURE_TOKEN (embedded in the public page).
//  Deploy: supabase functions deploy lead-capture --project-ref xhjdowbnqcsvhtcccuqx --no-verify-jwt
// ────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CC = Deno.env.get("CC360_TOKEN") ?? "";
const CC_LOC = Deno.env.get("CC360_LOCATION") ?? "";
const TOKEN = Deno.env.get("CAPTURE_TOKEN") ?? "";
const GH = "https://services.leadconnectorhq.com";
const ccHead = { Authorization: "Bearer " + CC, Version: "2021-07-28", "Content-Type": "application/json" };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...cors } });
const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const clean = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);
  let b: any; try { b = await req.json(); } catch { return j({ error: "bad json" }, 400); }
  if (TOKEN && String(b.token ?? "") !== TOKEN) return j({ error: "unauthorized" }, 403);

  const email = String(b.email ?? "").trim().toLowerCase();
  if (!emailRe.test(email)) return j({ error: "A valid email is required." }, 400);
  const name = String(b.name ?? "").trim();
  const score = Number(b.score) || 0, maxScore = Number(b.maxScore) || 0;
  const gap = String(b.gap ?? "").trim();
  const engine = String(b.engine ?? "").trim();
  const source = clean(b.source ?? "");   // reel / campaign attribution
  const angle = clean(b.angle ?? "");     // demand / profit / whelping ...
  const phone = String(b.phone ?? "").trim();

  // CC360 — cold lead entering the funnel, segmented for the → TPB nurture.
  let cc360 = false;
  try {
    if (CC && CC_LOC) {
      const upBody: any = { locationId: CC_LOC, email, source: "Free Scorecard (lead magnet)" };
      if (name) upBody.name = name;
      if (phone) upBody.phone = phone;
      const up = await fetch(`${GH}/contacts/upsert`, { method: "POST", headers: ccHead, body: JSON.stringify(upBody) });
      if (up.ok) {
        const uj = await up.json().catch(() => ({} as any));
        const id = uj?.contact?.id || uj?.id;
        if (id) {
          const tags = ["lead-magnet", "free-scorecard", "cold-lead", "tpb-nurture"];
          if (gap) tags.push("gap-" + clean(gap));
          if (engine) tags.push("engine-" + clean(engine));
          if (source) tags.push("src-" + source);
          if (angle) tags.push("angle-" + angle);
          await fetch(`${GH}/contacts/${id}/tags`, { method: "POST", headers: ccHead, body: JSON.stringify({ tags }) }).catch(() => {});
          const note = `🧲 Free Scorecard lead — ${score}/${maxScore}\n`
            + `Biggest gap: ${gap || "—"}${engine ? " (" + engine + " engine)" : ""}\n`
            + (source ? `Source: ${source}${angle ? " · angle " + angle : ""}\n` : "")
            + `Entered via lead magnet → nurture to TPB.`;
          await fetch(`${GH}/contacts/${id}/notes`, { method: "POST", headers: ccHead, body: JSON.stringify({ body: note }) }).catch(() => {});
          cc360 = true;
        }
      }
    }
  } catch (_) { /* never fail the capture on a CC360 hiccup */ }

  let logged = false;
  try {
    const { error } = await supabase.from("tool_submissions").insert({
      tool: "free-scorecard", tool_label: "Free Scorecard (lead magnet)",
      member_name: name || null, member_email: email || null,
      summary: `${score}/${maxScore} · gap ${gap || "—"}${source ? " · " + source : ""}`,
      meta: { score, maxScore, gap, engine, source, angle },
      inputs: { answers: b.answers ?? null }, result: null,
    });
    logged = !error;
  } catch (_) { /* */ }

  return j({ ok: true, cc360, logged });
});
