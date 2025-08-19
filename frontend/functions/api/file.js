// GET /api/file?key=<r2-key>  -> streams file from R2
export async function onRequest({ request, env }) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  if (!key) return new Response('Missing key', { status: 400 });

  const obj = await env.R2_BUCKET.get(key);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  const meta = obj.httpMetadata || {};
  if (meta.contentType) headers.set('Content-Type', meta.contentType);
  if (meta.cacheControl) headers.set('Cache-Control', meta.cacheControl);
  // inline view with a friendly filename
  const filename = key.split('/').pop() || 'file';
  headers.set('Content-Disposition', `inline; filename="${filename}"`);

  return new Response(obj.body, { headers });
}
