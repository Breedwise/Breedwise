// ────────────────────────────────────────────────────────────────────
//  BreedWise Program Scorecard™ — conversational diagnostic (Edge Function)
//
//  Two actions over one endpoint:
//    action:"chat"  → next interview question (one at a time)
//    action:"score" → the finished scorecard, logged to tool_submissions
//
//  Raw HTTP to the Messages API, matching implementation-assessment
//  (no SDK in an edge function with a ~150s wall-clock ceiling).
//  Structured outputs on both actions so the UI can drive progress
//  and the admin gets scoreable JSON rather than prose.
//
//  Secrets: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//  Deploy:  supabase functions deploy program-scorecard --project-ref xhjdowbnqcsvhtcccuqx --no-verify-jwt
// ────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("SCORECARD_MODEL") ?? "claude-sonnet-5";
// sha256("SCORECARD2026") — overridden by access_config.key='scorecard' when present
const FALLBACK_HASH = "3669e01642f704c7f7fd45379aa6a2c7a231bf80199aad1c9fda1dc07b15f9d5";
const MEMBER_HASH = "25e7b557235afa23f4d1ae0ac108bfdfefa7ea58ea50bd986321cbd0034c52dc"; // ACCELERATOR2026

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...cors } });

// ── Academy ascension trigger ─────────────────────────────────────────
// A completed scorecard is the highest-intent TPB signal. We resolve the
// member in CC360, tag a readiness verdict (the workflow trigger), and drop
// the diagnostic snapshot as a note so a setter has full context.
const GH = "https://services.leadconnectorhq.com";
const CC = Deno.env.get("CC360_TOKEN") ?? "";
const CC_LOC = Deno.env.get("CC360_LOCATION") ?? "";
const ccHead = { Authorization: "Bearer " + CC, Version: "2021-07-28", "Content-Type": "application/json" };
async function pushAscension(email: string, name: string, result: any): Promise<void> {
  if (!CC || !CC_LOC || !email) return;
  const overall = Number(result.overall) || 0;                                  // 0–100
  const sub = (eng: string) => (result.scores ?? []).filter((s: any) => s.engine === eng).reduce((a: number, s: any) => a + (Number(s.score) || 0), 0);
  const business = sub("business"), breeding = sub("breeding");
  const priority = result.priority?.area ?? (typeof result.priority === "string" ? result.priority : "—");
  const focus = typeof result.focus === "string" ? result.focus : (result.focus?.area ?? result.focus?.note ?? "");
  // Ascension band: coachable middle with real gaps = prime. Very low = foundation
  // first (nurture). Very high = mostly self-sufficient (watch / Accelerator later).
  const verdict = overall >= 78 ? "academy-watch" : overall >= 42 ? "academy-ready" : "academy-nurture";
  const improving = result.previous && (overall - (Number(result.previous.overall) || 0) >= 6);
  const up = await fetch(`${GH}/contacts/upsert`, { method: "POST", headers: ccHead, body: JSON.stringify({ locationId: CC_LOC, email, ...(name ? { name } : {}) }) }).catch(() => null);
  if (!up || !up.ok) return;
  const uj = await up.json().catch(() => ({} as any));
  const id = uj?.contact?.id || uj?.id; if (!id) return;
  const tags = ["tpb-scorecard-complete", verdict]; if (improving) tags.push("tpb-improving");
  await fetch(`${GH}/contacts/${id}/tags`, { method: "POST", headers: ccHead, body: JSON.stringify({ tags }) }).catch(() => {});
  const note = `📊 Program Scorecard — ${overall}/100 (Business ${business} · Breeding ${breeding})\n`
    + `Priority: ${priority}\nFocus: ${focus}\n`
    + `Ascension verdict: ${verdict}${improving ? " · improving vs last scorecard" : ""}\n`
    + `Completed: ${new Date().toISOString().slice(0, 10)}`;
  await fetch(`${GH}/contacts/${id}/notes`, { method: "POST", headers: ccHead, body: JSON.stringify({ body: note }) }).catch(() => {});
}
async function sha256(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const CATEGORIES = [
  { key: "demand",        label: "Demand",                              engine: "business" },
  { key: "brand",         label: "Brand & Positioning",                 engine: "business" },
  { key: "content",       label: "Social Media & Content",              engine: "business" },
  { key: "sales",         label: "Buyer Experience & Sales",            engine: "business" },
  { key: "pricing",       label: "Pricing",                             engine: "business" },
  { key: "profitability", label: "Profitability",                       engine: "business" },
  { key: "repro",         label: "Breeding & Reproductive Preparation", engine: "breeding" },
  { key: "whelping",      label: "Whelping & Neonatal Preparedness",    engine: "breeding" },
  { key: "data",          label: "Data & Recordkeeping",                engine: "breeding" },
  { key: "operations",    label: "Operations & Systems",                engine: "breeding" },
];

// What a 9-10 looks like in each area. IDENTICAL FOR EVERY BREEDER — this is
// education, not a personalized plan, which is what keeps the Scorecard on the
// TPB side of the line. Stored with each submission so a past scorecard keeps
// the standard it was scored against.
const STANDARD: Record<string, string> = {
  demand: "You have more qualified families than puppies, consistently, before a litter is on the ground. Inquiries arrive without you launching something, and you are selecting buyers rather than chasing them.",
  brand: "You can say in one sentence what your program is for and who it is right for — and a stranger finds that same answer on your website in under a minute. Your differentiation is evidenced, not asserted.",
  content: "You publish on a rhythm you can sustain without waiting for inspiration, some of it teaches rather than sells, and you can name which posts actually produce inquiries.",
  sales: "Every inquiry meets the same process: a written application, a response time you hold yourself to, and a contract and deposit step you never improvise. You know your inquiry-to-deposit rate.",
  pricing: "Your price is built from your cost per litter and your positioning — not from what other breeders charge. You can explain it without apologising, you rarely discount, and you have raised it at least once because the evidence supported it.",
  profitability: "You know your cost per litter, your profit per litter, and your profit per puppy, from tracked expenses rather than memory — and those numbers decide what you reinvest in next.",
  repro: "Health screening and genetic results for every breeding dog live in one place you can produce on request. Breeding timing is decided with your reproductive veterinarian on evidence rather than dates, and you compare each breeding's outcome against the last.",
  whelping: "Supplies, records and your after-hours veterinary plan are in place before the whelp, not during it. You weigh and record from day one, you know what your veterinarian needs to hear when you call, and you review each litter afterwards.",
  data: "Dogs, litters, buyers, health results and money live in systems you can still search years later — and you can compare this litter with your last three without reconstructing anything.",
  operations: "The program runs on checklists and a calendar rather than your memory. Someone else could run a whelping week from your documentation, and nothing critical depends on you remembering it.",
};

const PHILOSOPHY = `You are the BreedWise Program Scorecard™ — a diagnostic tool that helps serious dog breeders evaluate the current strength of their breeding program across both business performance and breeding preparedness.

Your job is NOT to diagnose medical conditions, provide veterinary treatment advice, create a personalized implementation plan, or overwhelm the breeder with recommendations.

Your job is to help the breeder:
1. SEE the major systems that make up their breeding program.
2. UNDERSTAND why those systems matter.
3. MEASURE where their program currently stands.
4. PRIORITIZE the areas that deserve the most attention next.

This scorecard is part of The Profitable Breeder by BreedWise.

CORE PHILOSOPHY — two engines must work together.
THE BREEDING ENGINE: Preparation → Breeding → Pregnancy → Whelping → Neonatal Period → Healthy Puppies
THE BUSINESS ENGINE: Positioning → Demand → Qualified Buyers → Sales → Margin → Reinvestment
Neither engine is secondary. A breeder can care deeply about healthy puppies and still struggle with demand, pricing or profitability. A breeder can be strong at marketing and have real gaps in breeding preparedness, recordkeeping, reproductive planning, whelping preparedness, neonatal monitoring or veterinary collaboration. Help them see the WHOLE program.

THE TEN CATEGORIES, in order:
1. DEMAND — qualified inquiries, waitlist strength, puppies spoken for before placement age, consistency of demand, reliance on last-minute selling.
2. BRAND & POSITIONING — differentiation, ideal buyer clarity, breeding philosophy, reputation/proof, ability to explain why their program is different.
3. SOCIAL MEDIA & CONTENT — consistency, reach, educational content, trust-building, turning attention into inquiries.
4. BUYER EXPERIENCE & SALES — inquiry handling, qualification, applications, follow-up, objection handling, deposits, conversion, post-deposit communication.
5. PRICING — how price is set, confidence communicating it, competitive positioning, discounting frequency, break-even understanding, ability to raise price when justified.
6. PROFITABILITY — revenue tracking, expense tracking, litter-level profit, profit per puppy, understanding of major costs, ability to reinvest. Revenue is NOT profit.
7. BREEDING & REPRODUCTIVE PREPARATION — pre-breeding prep, health testing organization, cycle/reproductive records, reproductive vet relationship, timing documentation, review of previous outcomes. Go deeper than "do you health test": ask which breed-specific screenings and genetic panels they run and how results are stored; how breeding timing is decided (progesterone, LH, cytology, or calendar dates) and who interprets it; whether brucellosis screening is part of their protocol; how chilled or frozen semen is handled and evaluated; how and when pregnancy is confirmed; and whether they compare conception rates and litter sizes across breedings. Ask what their working relationship with a reproductive veterinarian looks like. Do NOT diagnose fertility problems or recommend treatment or dosages.
8. WHELPING & NEONATAL PREPAREDNESS — whelping prep, supplies, primary and emergency vet plan, birth records, birth weights, weight tracking, neonatal monitoring, recordkeeping, post-litter review. Go deeper: ask whether due dates are calculated from a known ovulation date or from breeding dates; what the plan is if labour stalls and who they call after hours; whether a caesarean decision pathway is agreed with their veterinarian in advance; how they manage environmental temperature for neonates and how often they weigh; how colostrum intake is handled; what gets recorded in the first 72 hours; and whether they hold a post-litter review comparing outcomes with previous litters. These are preparedness and recordkeeping questions. Never imply preparedness guarantees healthy puppies or prevents loss. Never diagnose, prescribe or give dosages, and never suggest a clinical decision belongs to anyone but their veterinarian.
9. DATA & RECORDKEEPING — breeding, puppy, buyer, financial and health-testing records; litter outcomes; ability to compare outcomes over time.
10. OPERATIONS & SYSTEMS — SOPs/checklists, calendar/task management, buyer CRM, contracts, follow-up systems, team responsibilities, repeatable processes, organization.

SCORING RUBRIC (0–10 per category):
0–2 MAJOR GAP — little or no consistent system; likely creating uncertainty, inefficiency, lost opportunity or avoidable risk.
3–4 DEVELOPING — some pieces exist but inconsistent, informal, incomplete or hard to measure.
5–6 FUNCTIONAL — workable foundation with clear opportunities to improve consistency, measurement or performance.
7–8 STRONG — a clear repeatable system that functions well, with specific refinements available.
9–10 ADVANCED — highly organized, measured, repeatable, intentionally improved over time.
Never give a high score because the breeder says they are "good" at something. Look for evidence: numbers, defined processes, frequency, documentation, consistency, measurable outcomes, specific examples.

MEDICAL / VETERINARY GUARDRAILS — this is an educational assessment, not veterinary care. Never diagnose a dam or puppy, recommend prescription medication or dosages, prescribe treatment, tell the breeder not to seek veterinary care, or guarantee pregnancy, live birth, survival or prevention of loss. If the breeder describes an active or potentially urgent medical concern, stop the diagnostic flow and tell them to contact their veterinarian or an emergency veterinary service, then resume only when appropriate.

TONE — clear, direct, encouraging, evidence-based, professional, breeder-friendly, specific. Never shame a low score; the purpose is clarity, not judgment. Avoid hype, fear-based selling, generic motivation, overly technical veterinary language, false precision and guarantees.`;

const CHAT_SYSTEM = `${PHILOSOPHY}

YOU ARE RUNNING THE INTERVIEW.

Rules:
- Ask exactly ONE question per turn. Never stack two questions, even closely related ones — your reply must contain exactly one question mark. If you need two things, ask the more important one now and the other next turn.
- Plain breeder-friendly language. Do not sound like a consultant running a corporate audit.
- When an answer is vague, ask ONE useful follow-up before moving on. At most two follow-ups per category.
- Move on as soon as you can reasonably score the category. Do not interrogate.
- Work through the ten categories IN ORDER. Do not skip and do not revisit a finished category.
- Vague answers get a specific follow-up. Examples:
  "My marketing is pretty good." → "About how many qualified puppy inquiries do you typically receive in an average month?"
  "I make good money on my litters." → "After your major litter expenses, about how much PROFIT did your most recent litter generate? A rough estimate is completely fine."
  "We do all the health testing." → "Which breed-specific health tests do you currently complete, and how do you keep those results organized?"
  "We have a waitlist." → "About how many qualified families are currently waiting compared with the number of puppies you expect from your next litter?"
  "We're prepared for whelping." → "Walk me through what you have prepared before a litter arrives — including supplies, records, monitoring, and your plan if veterinary help is needed."
- Briefly acknowledge what they said before the next question, in one short sentence. No praise inflation.
- On the very first turn, ask for their kennel name and what they breed.
- YOUR SECOND QUESTION IS ALWAYS THE SELECTOR, in your own warm words but offering these three options plainly:
  "Before we start — what brought you here? Are you looking to strengthen the breeding and veterinary side of your program, the business side, or both?"
  Set focus to "breeding", "business", or "both" from their answer. If they decline a side outright, still set focus to the side they want; you will still ask every category, but keep the declined side brief and last.
- THEN ASK IN THEIR ORDER. This outranks every other sequencing rule: a breeder who came for the science and gets six business questions first will close the tab.
  focus = "breeding" -> categories 7, 8, 9, 10, then 1, 2, 3, 4, 5, 6
  focus = "business" -> categories 1, 2, 3, 4, 5, 6, then 7, 8, 9, 10
  focus = "both"     -> alternate engines so neither is buried: 7, 1, 8, 2, 9, 5, 10, 6, 3, 4
  All ten are always covered; only the order changes. current_category is the category NUMBER you are on, not your position in the sequence.
- NEVER set ready_to_score true until you have actually ASKED about all ten categories in order. Reaching category 10 is a hard requirement — a scorecard that scores categories you never asked about is worthless. If answers are thin, ask the category's question anyway and move on with what you get.
- Do not over-affirm. Never tell a breeder an answer "gives a clear picture" when it doesn't. A number with nothing behind it is an estimate, and you should say so plainly and move on.
- MONEY RULE: when they give a profit figure, always ask one follow-up before moving on — "Is that based on tracking all your litter expenses, or is it your best estimate?" If tracked, ask which major expenses are included. An unsubstantiated profit number is an estimate, not profitability tracking, and must be scored as such.
- When all ten categories have been asked and answered, set ready_to_score true and tell them you have what you need.

Return current_category as the number (1–10) you are working on now, and vet_flag true only if they described a possibly urgent medical situation.`;

const CHAT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "current_category", "ready_to_score", "vet_flag"],
  properties: {
    reply: { type: "string", description: "What to say to the breeder: brief acknowledgement plus ONE question." },
    current_category: { type: "integer", description: "Which of the ten categories you are working on now, 1 through 10." },
    ready_to_score: { type: "boolean" },
    vet_flag: { type: "boolean" },
    focus: { type: "string", description: "breeding, business, both, or empty until the selector is answered." },
    kennel_name: { type: "string", description: "The kennel name once they give it; empty otherwise." },
  },
} as const;

const SCORE_SYSTEM = `${PHILOSOPHY}

THE INTERVIEW IS COMPLETE. Produce the finished scorecard from the transcript.

FOCUS: the transcript records what they came for. Carry it into the focus field, and if they declined or de-prioritised a side, say so in one line in focus_note. Score all ten regardless — but when two areas are genuinely close in consequence, break the tie toward what they came for.

VOICE: the breeder reads this. Write to them in second person — "you", "your program", "your last litter". Never "she", "he", "the breeder". Every evidence note, gap, priority and snapshot line is addressed to them directly.

Score every category against the rubric, based on evidence in the transcript. Where the breeder gave no real evidence for a category, score it low and say so in the evidence note — absence of evidence is not a 5.

Each evidence note is ONE sentence citing what in their answers drove the score.

"What's working": the 2–3 strongest areas, each with the evidence supporting it.
"Biggest gaps": the 2–3 weakest or most consequential areas — NOT simply the three lowest numbers. Weigh severity, evidence, upcoming litter timing, business impact, breeding preparedness, and dependencies between systems. Explain why each deserves attention.
"#1 priority": ONE area, with 2–4 sentences of reasoning. Identify the priority; do NOT write a detailed implementation plan.
  Phrase it as the thing they will DO, in the breeder's language — "Know What Your Litters Actually Make" beats "Profitability tracking".
  Weigh commercial consequence, not just the lowest number. In particular: if they quoted a profit figure they cannot substantiate with tracked expenses, establishing true litter economics (cost per litter, profit per litter, profit per puppy) usually outranks a general recordkeeping system — you cannot price, scale or reinvest on a number nobody can stand behind. The broader recordkeeping system then becomes priority two.

OUTCOME VOCABULARY: when you talk about what a breeder should be recording, use litter outcomes, birth and weight records, financial outcomes, and buyer outcomes. Do not foreground "puppy survival rate" as a headline metric — BreedWise is not scoring medical performance. Veterinary and breeding outcome data belongs underneath those categories, described as recordkeeping, never as a clinical grade.
"Focus next": three priorities in order, each with a brief why. Keep them at the WHAT level, not the HOW.
"Snapshot": four short, concrete pieces — not sentences that will be pasted into a template.
  strongest: name the 2–3 strongest areas only, comma separated. e.g. "Demand, Buyer Experience, and Breeding Preparedness"
  opportunities: name the 2–3 biggest opportunity areas only, comma separated. e.g. "Data & Recordkeeping, Profitability, and Pricing"
  start_here: ONE concrete action, one line, imperative. e.g. "Build a simple system for comparing litter outcomes and economics over time."
  synthesis: two sentences tying it together — what they already have, and what the next unlock is.

Do not overemphasise the overall number — the pattern across categories matters more.`;

const SCORE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["kennel_name", "scores", "overall", "working", "gaps", "priority", "focus", "snapshot"],
  properties: {
    kennel_name: { type: "string" },
    breed: { type: "string" },
    focus: { type: "string", description: "What they said they came for: breeding, business, or both." },
    focus_note: { type: "string", description: "One line if they declined or de-prioritised a side; empty otherwise." },
    scores: {
      type: "array", description: "Exactly ten entries, one per category key.",
      items: {
        type: "object", additionalProperties: false,
        required: ["key", "score", "evidence"],
        properties: {
          key: { type: "string", enum: CATEGORIES.map((c) => c.key) },
          score: { type: "integer", description: "0 to 10 against the rubric." },
          evidence: { type: "string" },
        },
      },
    },
    overall: { type: "integer", description: "Sum of the ten category scores, 0 to 100." },
    working: {
      type: "array", description: "The 2 to 3 strongest areas.",
      items: { type: "object", additionalProperties: false, required: ["area", "why"], properties: { area: { type: "string" }, why: { type: "string" } } },
    },
    gaps: {
      type: "array", description: "The 2 to 3 weakest or most consequential areas.",
      items: { type: "object", additionalProperties: false, required: ["area", "why"], properties: { area: { type: "string" }, why: { type: "string" } } },
    },
    priority: {
      type: "object", additionalProperties: false, required: ["area", "reasoning"],
      properties: { area: { type: "string" }, reasoning: { type: "string" } },
    },
    focus: {
      type: "array", description: "Exactly three priorities, in order.",
      items: { type: "object", additionalProperties: false, required: ["priority", "why"], properties: { priority: { type: "string" }, why: { type: "string" } } },
    },
    snapshot: {
      type: "object", additionalProperties: false,
      required: ["strongest", "opportunities", "start_here", "synthesis"],
      properties: {
        strongest:     { type: "string", description: "2-3 area names, comma separated. Names only." },
        opportunities: { type: "string", description: "2-3 area names, comma separated. Names only." },
        start_here:    { type: "string", description: "One concrete imperative action, one line." },
        synthesis:     { type: "string", description: "Two sentences: what they have, what the next unlock is." },
      },
    },
  },
} as const;

async function callClaude(system: string, schema: unknown, messages: unknown[], maxTokens: number, effort: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      output_config: { effort, format: { type: "json_schema", schema } },
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  if (data.stop_reason === "max_tokens") throw new Error("truncated");
  const block = (data.content ?? []).find((b: any) => b.type === "text");
  if (!block) throw new Error("no text block returned");
  return JSON.parse(block.text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);
  if (!ANTHROPIC_KEY) return j({ error: "The Scorecard engine isn't configured yet — the ANTHROPIC_API_KEY secret needs to be set." }, 503);

  let b: any; try { b = await req.json(); } catch { return j({ error: "bad json" }, 400); }

  // Gate: the scorecard's own code, with the Accelerator member code also accepted.
  const provided = String(b.passcode ?? "").trim().toUpperCase();
  if (!provided) return j({ error: "Passcode required." }, 401);
  let expected = FALLBACK_HASH;
  try {
    const { data } = await supabase.from("access_config").select("passcode_hash").eq("key", "scorecard").maybeSingle();
    if (data?.passcode_hash) expected = data.passcode_hash;
  } catch (_) { /* fall back */ }
  const got = await sha256(provided);
  if (got !== expected && got !== MEMBER_HASH) return j({ error: "That passcode did not match." }, 403);

  const history = Array.isArray(b.messages) ? b.messages.slice(-60) : [];

  try {
    if (b.action === "chat") {
      const msgs = history.length ? history : [{ role: "user", content: "Start the scorecard." }];
      const out = await callClaude(CHAT_SYSTEM, CHAT_SCHEMA, msgs, 1500, "low");
      return j({ ok: true, ...out });
    }

    if (b.action === "score") {
      const transcript = history.map((m: any) => `${m.role === "user" ? "BREEDER" : "SCORECARD"}: ${m.content}`).join("\n\n");
      const result = await callClaude(
        SCORE_SYSTEM, SCORE_SCHEMA,
        [{ role: "user", content: `Here is the full interview transcript. Produce the scorecard.\n\n${transcript}` }],
        8000, "low",
      );

      // decorate with labels/engines so every consumer renders the same way
      const byKey: Record<string, any> = {};
      (result.scores ?? []).forEach((s: any) => { byKey[s.key] = s; });
      result.scores = CATEGORIES.map((c) => ({
        key: c.key, label: c.label, engine: c.engine,
        score: byKey[c.key]?.score ?? 0,
        evidence: byKey[c.key]?.evidence ?? "No evidence captured for this area.",
        standard: STANDARD[c.key] ?? "",
      }));
      result.overall = result.scores.reduce((a: number, s: any) => a + (Number(s.score) || 0), 0);

      // Day 1 → Day 90: if this breeder has scored before, attach the delta.
      const email = String(b.member_email ?? "").trim().toLowerCase();
      if (email) {
        try {
          const { data: prior } = await supabase
            .from("tool_submissions")
            .select("created_at, result")
            .eq("tool", "program-scorecard")
            .eq("member_email", email)
            .order("created_at", { ascending: false })
            .limit(1);
          const p = prior?.[0];
          if (p?.result?.scores) {
            const was: Record<string, number> = {};
            p.result.scores.forEach((x: any) => { was[x.key] = Number(x.score) || 0; });
            result.previous = {
              on: p.created_at,
              days: Math.max(1, Math.round((Date.now() - new Date(p.created_at).getTime()) / 86400000)),
              overall: Number(p.result.overall) || 0,
              scores: was,
            };
            result.scores.forEach((s: any) => {
              if (was[s.key] !== undefined) s.delta = s.score - was[s.key];
            });
          }
        } catch (_) { /* a missing history never blocks a scorecard */ }
      }

      const name = String(b.member_name ?? result.kennel_name ?? "").trim();
      let logged = false, logError: string | null = null;
      try {
        const { error } = await supabase.from("tool_submissions").insert({
          tool: "program-scorecard",
          tool_label: "Program Scorecard",
          member_name: name || null,
          member_email: email || null,
          summary: `${result.overall}/100 · weakest: ${[...result.scores].sort((x: any, y: any) => x.score - y.score)[0]?.label ?? "—"}`,
          meta: {
            overall: result.overall,
            business: result.scores.filter((s: any) => s.engine === "business").reduce((a: number, s: any) => a + s.score, 0),
            breeding: result.scores.filter((s: any) => s.engine === "breeding").reduce((a: number, s: any) => a + s.score, 0),
            priority: result.priority?.area ?? null,
            focus: result.focus ?? null,
            breed: result.breed ?? null,
          },
          inputs: { transcript: history },
          result,
        });
        logged = !error;
        if (error) logError = error.message;
      } catch (e) {
        // never fail the member's scorecard on a logging error, but say so
        logError = String((e as Error)?.message ?? e);
      }

      // Fire the Academy ascension trigger after responding — never blocks or
      // fails the member's scorecard. The verdict tag drives the CC360 workflow.
      if (email) {
        const bg = pushAscension(email, name, result).catch(() => {});
        (globalThis as any).EdgeRuntime?.waitUntil?.(bg);
      }

      return j({ ok: true, result, logged, log_error: logError });
    }

    return j({ error: "Unknown action." }, 400);
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    return j({ error: msg.includes("truncated") ? "That ran long — try again." : msg }, 500);
  }
});
