// POST /api/upload  (multipart/form-data: screenshot, code[, student][, lang])
export const onRequestOptions = () =>
  new Response(null, { headers: corsHeaders() });

export async function onRequestPost({ request, env }) {
  try {
    const form = await request.formData();
    const shot = form.get('screenshot'); // File (image/png)
    const code = form.get('code');       // File (text/plain)
    const student = (form.get('student') || '').toString().trim();
    const lang    = (form.get('lang') || '').toString().trim().toUpperCase();

    if (!(shot instanceof File) || !(code instanceof File)) {
      return json({ ok:false, error:"Expected 'screenshot' and 'code' files." }, 400);
    }

    const now = new Date();
    const ymd = now.toISOString().slice(0,10).replaceAll('-',''); // YYYYMMDD
    const safe = s => s.replace(/[^\w.-]+/g,'_').slice(0,64) || 'student';
    const base = `${ymd}/${safe(student)}_${crypto.randomUUID()}`;

    // Store screenshot
    const imgKey = `${base}.png`;
    await env.R2_BUCKET.put(imgKey, shot.stream(), {
      httpMetadata: { contentType: shot.type || 'image/png', cacheControl: 'public, max-age=31536000, immutable' }
    });

    // Store code
    const codeKey = `${base}.${lang ? lang.toLowerCase() : 'txt'}.txt`;
    await env.R2_BUCKET.put(codeKey, code.stream(), {
      httpMetadata: { contentType: code.type || 'text/plain; charset=utf-8', cacheControl: 'public, max-age=31536000, immutable' }
    });

    // Build URLs via our router (no public bucket domain needed)
    const url = new URL(request.url);
    const origin = `${url.protocol}//${url.host}`;
    const imageUrl = `${origin}/api/file?key=${encodeURIComponent(imgKey)}`;
    const codeUrl  = `${origin}/api/file?key=${encodeURIComponent(codeKey)}`;

    return json({ ok:true, imageUrl, codeUrl, imgKey, codeKey }, 200);
  } catch (err) {
    console.error(err);
    return json({ ok:false, error:'Upload failed' }, 500);
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
function json(data, status=200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}
