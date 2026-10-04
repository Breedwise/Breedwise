// ────────────────────────────────────────────────────────────────────
//  BreedWise — Website / brand asset upload portal
//  action: "sign"  → create signed upload URLs for a member's files
//          "save"  → record the submission (fields + uploaded file paths)
//          "links" → (admin, secret-gated) signed download URLs for a folder
//  Files land in the private Storage bucket "member-assets".
//  Deploy: supabase functions deploy asset-upload --project-ref xhjdowbnqcsvhtcccuqx --no-verify-jwt
// ────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const BUCKET = "member-assets";
const ADMIN_SECRET = "bw_assets_7Hq2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", ...cors } });
const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const slug = (s: string) => (s || "member").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "member";
const safeName = (s: string) => (s || "file").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
  // ignore "already exists"; any other error will surface when we try to sign
  if (error && !/exist/i.test(error.message || "")) { /* fall through; sign will report */ }
  bucketReady = true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);
  let b: any; try { b = await req.json(); } catch { return j({ error: "bad json" }, 400); }
  const action = String(b.action ?? "");

  if (action === "sign") {
    const email = String(b.email ?? "").trim().toLowerCase();
    if (!emailRe.test(email)) return j({ error: "Please enter a valid email." }, 400);
    const kennel = String(b.kennel ?? "").trim();
    const files = Array.isArray(b.files) ? b.files.slice(0, 60) : [];
    if (!files.length) return j({ error: "No files to upload." }, 400);
    await ensureBucket();
    const folder = `${slug(kennel || email)}-${Date.now().toString(36)}`;
    const uploads: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i] || {};
      const path = `${folder}/${String(f.field || "file")}-${i + 1}-${safeName(String(f.name || "file"))}`;
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error || !data) return j({ error: "Could not prepare upload: " + (error?.message || "unknown") }, 500);
      uploads.push({ name: f.name, field: f.field, path: data.path, token: data.token });
    }
    return j({ ok: true, folder, bucket: BUCKET, uploads });
  }

  if (action === "save") {
    const email = String(b.email ?? "").trim().toLowerCase();
    if (!emailRe.test(email)) return j({ error: "Please enter a valid email." }, 400);
    const name = String(b.name ?? "").trim();
    const kennel = String(b.kennel ?? "").trim();
    const files = Array.isArray(b.files) ? b.files : [];
    const fields = b.fields && typeof b.fields === "object" ? b.fields : {};
    try {
      await supabase.from("tool_submissions").insert({
        tool: "website-assets", tool_label: "Website Assets",
        member_name: name || kennel || null, member_email: email,
        summary: `${kennel || name || email} · ${files.length} file${files.length === 1 ? "" : "s"} for website build`,
        meta: { phone: String(b.phone ?? "") || null, kennel: kennel || null, folder: String(b.folder ?? "") || null, bucket: BUCKET, fileCount: files.length, source: "Website Asset Upload", ts: Math.floor(Date.now() / 1000) },
        inputs: { fields, files },
        result: { folder: String(b.folder ?? ""), bucket: BUCKET, files },
      });
    } catch (_) { /* never fail the member on a logging error */ }
    return j({ ok: true });
  }

  if (action === "links") {
    if (b.secret !== ADMIN_SECRET) return j({ error: "no" }, 403);
    const paths: string[] = Array.isArray(b.paths) ? b.paths.map((x: any) => String(x)) : [];
    const out: any[] = [];
    for (const p of paths.slice(0, 80)) {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p, 60 * 60 * 6); // 6h
      out.push({ path: p, url: data?.signedUrl || null });
    }
    return j({ ok: true, links: out });
  }

  return j({ error: "Unknown action." }, 400);
});
