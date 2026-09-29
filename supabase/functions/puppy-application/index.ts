// ────────────────────────────────────────────────────────────────────
//  BreedWise Accelerator — Client puppy-application capture
//  A per-client application page (e.g. ABR Kennels) POSTs here; we store
//  the application in tool_submissions tagged to that client so the
//  breeder (and the Accelerator team) can review inbound puppy families.
//  Deploy: supabase functions deploy puppy-application --project-ref xhjdowbnqcsvhtcccuqx --no-verify-jwt
// ────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...cors } });
const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);
  let b: any; try { b = await req.json(); } catch { return j({ error: "bad json" }, 400); }
  if (b.company) return j({ ok: true });                                   // honeypot
  const email = String(b.email ?? "").trim().toLowerCase();
  const name = [String(b.first ?? "").trim(), String(b.last ?? "").trim()].filter(Boolean).join(" ") || String(b.name ?? "").trim();
  const phone = String(b.phone ?? "").trim();
  if (!name || !emailRe.test(email) || !phone) return j({ error: "Please enter your name, a valid email, and a phone number." }, 400);

  const client = String(b.client ?? "unknown").trim();
  const kennel = String(b.kennel ?? "").trim();
  // Everything else on the form travels as answers.
  const skip = new Set(["first", "last", "name", "email", "phone", "client", "kennel", "company"]);
  const answers: Record<string, unknown> = {};
  Object.keys(b).forEach((k) => { if (!skip.has(k)) answers[k] = b[k]; });

  let logged = false, log_error: string | null = null;
  try {
    const { error } = await supabase.from("tool_submissions").insert({
      tool: "puppy-application", tool_label: "Puppy Application",
      member_name: name, member_email: email,
      summary: `${kennel || client} · ${name} · ${String(b.interest || "puppy")}`,
      meta: { client, kennel, phone, interest: b.interest ?? null, color: b.color ?? null, sex: b.sex ?? null, timeframe: b.timeframe ?? null, location: b.location ?? null, ts: Math.floor(Date.now() / 1000) },
      inputs: { answers }, result: null,
    });
    logged = !error; if (error) log_error = error.message;
  } catch (e) { log_error = String((e as Error)?.message ?? e); }

  return j({ ok: true, logged, log_error });
});
