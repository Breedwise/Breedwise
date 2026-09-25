// ────────────────────────────────────────────────────────────────────
//  Breedwise — one-time CC360 setup
//  Creates the Academy-application CONTACT custom fields via the
//  LeadConnector v2 API using the CC360_TOKEN secret (nothing exposed).
//  Also lists existing pipelines so we can confirm "Academy Applications".
//  Invoke:  GET ?secret=SETUP_SECRET
//  Deploy:  supabase functions deploy cc360-setup --project-ref xhjdowbnqcsvhtcccuqx --no-verify-jwt
// ────────────────────────────────────────────────────────────────────
const GT = Deno.env.get("CC360_TOKEN") ?? "";
const LOC = Deno.env.get("CC360_LOCATION") ?? "";
const SECRET = Deno.env.get("SETUP_SECRET") ?? "";
const DIAG = Deno.env.get("DIAG_SECRET") ?? "";   // read-only workflow-verification probe
const GH = "https://services.leadconnectorhq.com";
const head = { Authorization: "Bearer " + GT, Version: "2021-07-28", "Content-Type": "application/json" };
const j = (o: unknown, s = 200) => new Response(JSON.stringify(o, null, 2), { status: s, headers: { "content-type": "application/json" } });

// Field names MUST match answerFields() in vsl-apply so answers auto-map.
const FIELDS = [
  "Breeds", "Breeding Females", "Breeding Stage", "Litters Last 12mo", "Litters Next 12mo",
  "Biggest Challenge", "Health Testing", "Current Puppy Price", "Buyer Pipeline", "Instagram Handle",
  "Investment Ready", "Timeline To Improve", "Decision Maker", "Ready To Decide",
  "Application Tier", "Application Score", "Application Urgency",
];

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const s = url.searchParams.get("secret");
  const authed = (SECRET && s === SECRET) || (DIAG && s === DIAG);
  if (!authed) return j({ error: "unauthorized" }, 401);
  if (!GT || !LOC) return j({ error: "missing CC360 token/location secrets" }, 500);

  // Workflow verification probe:  ?probe=<email|phone|contactId>
  // Returns the contact + tags (trigger) + tasks (did the workflow create/assign a task?)
  // + opportunities + conversation messages (did SMS / email actually send?). Read-only.
  const probe = url.searchParams.get("probe");
  if (probe) {
    const out: any = { ok: true, probe };
    try {
      // 1) resolve contact (accept a raw contactId too)
      let c: any = null;
      if (/^[A-Za-z0-9]{20,}$/.test(probe) && !probe.includes("@")) {
        const r = await fetch(`${GH}/contacts/${probe}`, { headers: head });
        if (r.ok) c = (await r.json()).contact;
      }
      if (!c) {
        const r = await fetch(`${GH}/contacts/?locationId=${LOC}&query=${encodeURIComponent(probe)}&limit=1`, { headers: head });
        const d = await r.json();
        c = (d.contacts || [])[0] || null;
      }
      if (!c) return j({ ok: true, probe, found: false, note: "no contact matched" });
      const id = c.id;
      out.contact = { id, name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.contactName, email: c.email, phone: c.phone, source: c.source, created: c.dateAdded, assignedTo: c.assignedTo || null };
      out.tags = c.tags || [];

      // 2) tasks — the workflow's task action lands here (title, dueDate, assignedTo, completed)
      try {
        const r = await fetch(`${GH}/contacts/${id}/tasks`, { headers: head });
        const d = await r.json();
        out.tasks = (d.tasks || []).map((t: any) => ({ title: t.title, body: t.body, dueDate: t.dueDate, completed: t.completed, assignedTo: t.assignedTo }));
      } catch (e) { out.tasks = { error: String(e) }; }

      // 3) opportunities
      try {
        const r = await fetch(`${GH}/opportunities/search?location_id=${LOC}&contact_id=${id}`, { headers: head });
        const d = await r.json();
        out.opportunities = (d.opportunities || []).map((o: any) => ({ name: o.name, pipeline: o.pipelineId, stage: o.pipelineStageId, status: o.status, value: o.monetaryValue }));
      } catch (e) { out.opportunities = { error: String(e) }; }

      // 4) conversation messages — proves SMS/email actually queued or sent
      try {
        const r = await fetch(`${GH}/conversations/search?locationId=${LOC}&contactId=${id}`, { headers: head });
        const d = await r.json();
        const convs = d.conversations || [];
        const msgs: any[] = [];
        for (const cv of convs.slice(0, 3)) {
          try {
            const mr = await fetch(`${GH}/conversations/${cv.id}/messages`, { headers: head });
            const md = await mr.json();
            const list = (md.messages && md.messages.messages) || md.messages || [];
            for (const m of list) msgs.push({ type: m.messageType || m.type, direction: m.direction, status: m.status, body: (m.body || "").slice(0, 140), dateAdded: m.dateAdded });
          } catch (_) { /* */ }
        }
        out.conversations = { count: convs.length, messages: msgs };
      } catch (e) { out.conversations = { error: String(e) }; }

      return j(out);
    } catch (e) { return j({ error: "probe failed", detail: String(e) }, 502); }
  }

  // Contact lookup:  ?find=<name|email|phone>  — returns matches with tags + opp state
  const find = url.searchParams.get("find");
  if (find) {
    try {
      const r = await fetch(`${GH}/contacts/?locationId=${LOC}&query=${encodeURIComponent(find)}&limit=20`, { headers: head });
      const d = await r.json();
      const contacts = (d.contacts || []).map((c: any) => ({
        id: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.contactName,
        email: c.email, phone: c.phone, source: c.source,
        created: c.dateAdded || c.createdAt, tags: c.tags || [],
      }));
      return j({ ok: true, query: find, count: contacts.length, contacts });
    } catch (e) { return j({ error: "search failed", detail: String(e) }, 502); }
  }

  // Existing fields (skip dupes)
  const have = new Set<string>();
  try {
    const r = await fetch(`${GH}/locations/${LOC}/customFields`, { headers: head });
    if (r.ok) { const d = await r.json(); for (const f of (d.customFields || d.customField || [])) have.add(String(f.name).trim().toLowerCase()); }
    else return j({ error: "could not list custom fields", status: r.status, body: (await r.text()).slice(0, 300) }, 502);
  } catch (e) { return j({ error: "list failed", detail: String(e) }, 502); }

  const fields: any[] = [];
  for (const name of FIELDS) {
    if (have.has(name.toLowerCase())) { fields.push({ name, skipped: "exists" }); continue; }
    try {
      const r = await fetch(`${GH}/locations/${LOC}/customFields`, {
        method: "POST", headers: head,
        body: JSON.stringify({ name, dataType: "TEXT", model: "contact" }),
      });
      fields.push({ name, ok: r.ok, status: r.status, ...(r.ok ? {} : { resp: (await r.text()).slice(0, 200) }) });
    } catch (e) { fields.push({ name, ok: false, error: String(e) }); }
  }

  // Confirm pipeline state (pipelines/workflows are UI-only in GHL — cannot be API-created)
  let pipelines: any = "unavailable";
  try {
    const r = await fetch(`${GH}/opportunities/pipelines?locationId=${LOC}`, { headers: head });
    if (r.ok) { const d = await r.json(); pipelines = (d.pipelines || []).map((p: any) => ({ name: p.name, stages: (p.stages || []).map((s: any) => s.name) })); }
  } catch (_) { /* */ }

  // Also list page-funnels — in GHL a "Funnel" (pages) is distinct from a "Pipeline" (opportunity stages)
  let funnels: any = "unavailable";
  try {
    const r = await fetch(`${GH}/funnels/funnel/list?locationId=${LOC}`, { headers: head });
    if (r.ok) { const d = await r.json(); funnels = (d.funnels || []).map((f: any) => ({ name: f.name, id: f._id || f.id })); }
    else funnels = { status: r.status, body: (await r.text()).slice(0, 200) };
  } catch (e) { funnels = { error: String(e) }; }

  // Which sub-account (location) is this token bound to?
  let location: any = "unavailable";
  try {
    const r = await fetch(`${GH}/locations/${LOC}`, { headers: head });
    if (r.ok) { const d = await r.json(); const l = d.location || d; location = { id: LOC, name: l.name, company: l.companyId }; }
    else location = { id: LOC, status: r.status, body: (await r.text()).slice(0, 200) };
  } catch (e) { location = { id: LOC, error: String(e) }; }

  return j({ ok: true, created: fields.filter((f) => f.ok).length, skipped: fields.filter((f) => f.skipped).length, fields, pipelines, funnels, location });
});
