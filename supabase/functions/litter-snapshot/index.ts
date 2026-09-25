// ────────────────────────────────────────────────────────────────────
//  BreedWise — Litter Snapshot logger + Academy ascension hook
//  A completed Litter Snapshot is a high-intent TPB signal AND hands the
//  setter the member's real litter economics. POST from the tool:
//   1) log to tool_submissions   2) tag + note the member in CC360
//  Gated by the TPB member code (SCORECARD2026) or the member code.
//  Deploy: supabase functions deploy litter-snapshot --project-ref xhjdowbnqcsvhtcccuqx --no-verify-jwt
// ────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CC = Deno.env.get("CC360_TOKEN") ?? "";
const CC_LOC = Deno.env.get("CC360_LOCATION") ?? "";
const GH = "https://services.leadconnectorhq.com";
const ccHead = { Authorization: "Bearer " + CC, Version: "2021-07-28", "Content-Type": "application/json" };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...cors } });
async function sha256(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
// sha256("SCORECARD2026") + sha256("ACCELERATOR2026")
const OK = new Set([
  "3669e01642f704c7f7fd45379aa6a2c7a231bf80199aad1c9fda1dc07b15f9d5",
  "25e7b557235afa23f4d1ae0ac108bfdfefa7ea58ea50bd986321cbd0034c52dc",
]);
const money = (v: number) => (v < 0 ? "-$" : "$") + Math.round(Math.abs(v)).toLocaleString("en-US");

async function pushCC360(email: string, name: string, m: any, flags: string[], priority: string): Promise<boolean> {
  if (!CC || !CC_LOC || !email) return false;
  const up = await fetch(`${GH}/contacts/upsert`, { method: "POST", headers: ccHead, body: JSON.stringify({ locationId: CC_LOC, email, ...(name ? { name } : {}) }) }).catch(() => null);
  if (!up || !up.ok) return false;
  const uj = await up.json().catch(() => ({} as any));
  const id = uj?.contact?.id || uj?.id; if (!id) return false;
  // A snapshot that surfaces a real problem is an ascension signal (softer than
  // the scorecard's academy-ready — a "worth a look" nudge for the setter).
  const signalFlags = ["noprofit", "lowmargin", "pricing", "demand", "conversion"];
  const hot = flags.some((f) => signalFlags.includes(f));
  const tags = ["litter-snapshot-complete"];
  if (hot) tags.push("academy-signal");
  flags.forEach((f) => { if (signalFlags.includes(f)) tags.push("snapshot-" + f); });
  await fetch(`${GH}/contacts/${id}/tags`, { method: "POST", headers: ccHead, body: JSON.stringify({ tags }) }).catch(() => {});
  const note = `🐾 Litter Snapshot${m.litter ? " — " + m.litter : ""}\n`
    + `Revenue ${money(m.revenue)} · Est. profit ${money(m.profit)} (${Math.round(m.marginPct)}% margin)\n`
    + `Profit/puppy ${money(m.profPer)} · Break-even ${money(m.breakeven)} · ${m.sold} sold / ${m.placed} placed / ${m.surv} survived of ${m.born}\n`
    + (m.hours ? `Owner hours ${Math.round(m.hours)} (${money(m.perHour)}/hr)\n` : "")
    + (flags.length ? `Flags: ${flags.join(", ")}\n` : "")
    + (priority ? `Next-litter priority: "${priority}"` : "");
  await fetch(`${GH}/contacts/${id}/notes`, { method: "POST", headers: ccHead, body: JSON.stringify({ body: note }) }).catch(() => {});
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);
  let b: any; try { b = await req.json(); } catch { return j({ error: "bad json" }, 400); }

  const code = String(b.code ?? "").trim();
  if (!OK.has(await sha256(code))) return j({ error: "unauthorized" }, 403);

  const email = String(b.member_email ?? "").trim().toLowerCase();
  const name = String(b.member_name ?? "").trim();
  const m = b.metrics ?? {};
  m.litter = String(b.litter ?? "").trim();
  const flags: string[] = Array.isArray(b.flags) ? b.flags.map((x: any) => String(x)) : [];
  const priority = String(b.priority ?? "").trim();

  let logged = false, log_error: string | null = null;
  try {
    const { error } = await supabase.from("tool_submissions").insert({
      tool: "litter-snapshot",
      tool_label: "Litter Snapshot",
      member_name: name || null,
      member_email: email || null,
      summary: `${m.litter || "Litter"} · profit ${money(m.profit ?? 0)} (${Math.round(m.marginPct ?? 0)}%) · ${m.sold ?? 0} sold`,
      meta: { revenue: m.revenue, profit: m.profit, marginPct: m.marginPct, profPer: m.profPer, breakeven: m.breakeven,
        sold: m.sold, placed: m.placed, surv: m.surv, born: m.born, hours: m.hours, flags, guess: b.guess ?? null },
      inputs: { demand: b.demand ?? null, guess: b.guess ?? null },
      result: { metrics: m, flags, priority },
    });
    logged = !error; if (error) log_error = error.message;
  } catch (e) { log_error = String((e as Error)?.message ?? e); }

  let cc360 = false;
  try { cc360 = await pushCC360(email, name, m, flags, priority); } catch (_) { /* never fail the save */ }

  return j({ ok: true, logged, log_error, cc360 });
});
