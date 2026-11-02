// ────────────────────────────────────────────────────────────────────
//  BreedWise — Content OS Script Generator (the "film yourself" OS)
//  A breeder plugs in their breed, topic, hook type and post details; Claude
//  returns a word-for-word viral short-form script (hook → body → CTA) plus
//  on-screen text, B-roll shots, caption and hashtags, grounded in current
//  short-form best practices. Every generation is saved to tool_submissions
//  so the team can see which ideas were made (and later, which worked).
//  Secrets: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//  Deploy: supabase functions deploy content-script --project-ref xhjdowbnqcsvhtcccuqx --no-verify-jwt
// ────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("SCRIPT_MODEL") ?? "claude-sonnet-5";
// sha256("BOSS2026") and sha256("BWTEAM2026")
const OK_HASHES = [
  "d9d2b67dcc9ce4c718b0c6a11096cafc66edc71c77f0db0c1a0a7ddfde876ebe",
  "368f5e7178dc18a1928df554c7251674d47b8cce87724d7a502d4aba67c99875",
];

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...cors } });
async function sha256(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const SYSTEM = `You are the BreedWise Content OS scripting engine — an elite short-form video scriptwriter for dog breeders. A breeder gives you their breed, a topic, the hook style they want, and details about the post. You write a complete, word-for-word script they can read straight off a teleprompter and post.

WRITE FOR TODAY'S SHORT-FORM BEST PRACTICES (Reels / TikTok / Shorts):
- The first line IS the hook. It must stop the scroll in the first 3 seconds — a pattern interrupt, a bold claim, a question, a mistake/myth, a curiosity gap, or a relatable callout. No slow intros, no "hey guys."
- Open a loop early and pay it off at the end so people watch through.
- One clear idea. Spoken, natural, first person — the way a real breeder talks, not a corporate ad. Short sentences. Contractions. Energy.
- Authenticity wins: assume they are filming themselves doing real work with their dogs. Write it to be said while that B-roll plays.
- End with ONE clear call to action that fits the topic (comment a word, DM, "follow for part 2," check the link, etc.).
- Keep the spoken script roughly 30–60 seconds (about 80–150 words) unless the details clearly call for shorter or longer.

MATCH the requested hook type. GROUND everything in the specific breed, topic and details provided — never generic. If details are thin, make reasonable, breed-accurate choices.

ALSO PRODUCE: a few on-screen text overlays (short, punchy — the words that appear on screen at key moments), B-roll shot ideas timed to the script (what they should be doing on camera), a ready-to-post caption, a handful of relevant hashtags, and 2–3 quick delivery tips.

HARD RULES: never fabricate health guarantees or specific medical/veterinary claims; keep claims honest and within what a responsible breeder can say. No hate, no attacks on other breeders. Return ONLY the structured object.`;

const SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    title: { type: "string" },                       // short label for this idea
    hook: { type: "string" },                         // the first-line hook, word for word
    script: { type: "string" },                       // full word-for-word spoken script (hook included), with line breaks
    cta: { type: "string" },                          // the call to action
    on_screen_text: { type: "array", items: { type: "string" } },
    broll: { type: "array", items: { type: "string" } },
    caption: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
    tips: { type: "array", items: { type: "string" } },
    est_seconds: { type: "integer" },
  },
  required: ["title", "hook", "script", "cta", "on_screen_text", "broll", "caption", "hashtags", "tips", "est_seconds"],
};

async function callClaude(userText: string): Promise<any> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 2500, system: SYSTEM, output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } }, messages: [{ role: "user", content: userText }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error("Claude: " + (data.error.message || "unknown"));
  if (data.stop_reason === "refusal") throw new Error("refusal");
  if (data.stop_reason === "max_tokens") throw new Error("truncated");
  const text = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  return JSON.parse(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);
  let body: any; try { body = await req.json(); } catch { return j({ error: "bad json" }, 400); }

  const provided = String(body.passcode ?? "").trim().toUpperCase();
  if (!provided) return j({ error: "Passcode required." }, 401);
  if (!OK_HASHES.includes(await sha256(provided))) return j({ error: "That passcode did not match." }, 403);
  if (!ANTHROPIC_KEY) return j({ error: "The script engine isn't configured — the ANTHROPIC_API_KEY secret needs to be set." }, 503);

  const inputs = body.inputs ?? {};
  const breed = String(inputs.breed || "").trim();
  const topic = String(inputs.topic || "").trim();
  if (!breed) return j({ error: "Please add your breed." }, 400);
  if (!topic) return j({ error: "Please add a topic." }, 400);

  const prompt = [
    "Write a short-form video script for this breeder.",
    "",
    "Breed: " + breed,
    "Topic: " + topic,
    "Hook type they want: " + (String(inputs.hook_type || "").trim() || "pick the strongest for this topic"),
    "Platform: " + (String(inputs.platform || "").trim() || "Instagram Reels / TikTok / YouTube Shorts"),
    "Brand voice / angle: " + (String(inputs.voice || "").trim() || "authentic, warm, expert"),
    "Post details (use these specifics): " + (String(inputs.details || "").trim() || "(none provided — use breed-accurate specifics)"),
    "Call to action they want: " + (String(inputs.cta || "").trim() || "pick the best fit for the topic"),
  ].join("\n");

  let result: any;
  try {
    result = await callClaude(prompt);
  } catch (e) {
    const m = (e as Error).message;
    const msg = m === "refusal" ? "The request couldn't be completed — try rephrasing your topic." : (m === "truncated" ? "That script ran long — please try again." : ("Could not generate the script: " + m));
    return j({ error: msg }, 502);
  }

  try {
    await supabase.from("tool_submissions").insert({
      tool: "content-script", tool_label: "Content OS Script Generator",
      member_name: inputs.name || null, member_email: inputs.email || null,
      summary: `${breed} · ${result.title || topic}` + (result.est_seconds ? ` · ~${result.est_seconds}s` : ""),
      meta: {
        breed, topic,
        hook_type: inputs.hook_type || null,
        platform: inputs.platform || null,
        handle: inputs.handle || null,
        title: result.title || null,
        hook: result.hook || null,
        est_seconds: result.est_seconds ?? null,
        ts: Math.floor(Date.now() / 1000),
      },
      inputs,
      result,
    });
  } catch (_) { /* best-effort logging */ }

  return j({ ok: true, result });
});
