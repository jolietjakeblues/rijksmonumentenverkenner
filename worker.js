// Proxies SPARQL queries to the RCE CHO (Cultureel erfgoed) endpoint. This endpoint is
// publicly open (verified live: a plain curl with no Authorization header gets a normal
// SPARQL response, not a 401/403) -- so there's no API token to attach server-side, and
// the site itself has no login gate either: the underlying data (rijksmonumenten) is
// already public government data, so there's nothing here that needs to sit behind
// authentication the way the Rijkscollectie project's (rights-encumbered) images did.
const UPSTREAM = 'https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/sparql';

// Query-shape allowlist, same pattern as the Rijkscollectie project's proxy: only
// SELECT/ASK, length-capped, no SPARQL Update keywords used as actual syntax (string
// literals stripped first so a quoted search term containing a keyword-like word, e.g.
// "drop", isn't rejected). Doesn't limit how much WORK a valid SELECT can cause, and
// doesn't rate-limit -- same known limitation as the Rijkscollectie proxy.
const MAX_QUERY_LENGTH = 4000;
const MUTATION_KEYWORDS = /\b(INSERT|DELETE|LOAD|CLEAR|DROP|CREATE|COPY|MOVE|ADD)\b/i;

function stripStringLiterals(query) {
  return query.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

function isAllowedQuery(query) {
  if (typeof query !== 'string' || !query.trim()) return false;
  if (query.length > MAX_QUERY_LENGTH) return false;
  const withoutStrings = stripStringLiterals(query);
  if (MUTATION_KEYWORDS.test(withoutStrings)) return false;
  const stripped = withoutStrings
    .replace(/PREFIX\s+[^:]*:\s*<[^>]*>/gi, '')
    .replace(/BASE\s*<[^>]*>/gi, '')
    .trim();
  return /^(SELECT|ASK)\b/i.test(stripped);
}

// Same palette and fonts as the app, kept tiny and self-contained (no external requests).
const NOT_FOUND_HTML = `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Pagina niet gevonden · Rijksmonumentenverkenner</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;
         background: #17130d; color: #ece4d4; font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  main { max-width: 420px; }
  p.code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #ab9d84; margin: 0 0 6px; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 24px; margin: 0 0 12px; }
  p { color: #ab9d84; line-height: 1.5; margin: 0 0 18px; }
  a { color: #f0c14e; }
</style>
</head>
<body>
<main>
  <p class="code">404</p>
  <h1>Deze pagina bestaat niet</h1>
  <p>Het adres klopt niet (meer). Alle monumenten, gezichten, complexen en werelderfgoed vind je via de zoekpagina.</p>
  <a href="/">Naar de Rijksmonumentenverkenner &rarr;</a>
</main>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/sparql') {
      // The page POSTs the query as a form field (no URL-length ceiling); GET ?query= still
      // works for anything that links to the proxy directly.
      let query = url.searchParams.get('query');
      if (request.method === 'POST') {
        const type = request.headers.get('Content-Type') || '';
        if (type.includes('application/x-www-form-urlencoded')) query = new URLSearchParams(await request.text()).get('query');
      } else if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405, headers: { 'Allow': 'GET, POST' } });
      }
      if (!isAllowedQuery(query)) {
        return new Response('Query not allowed: only SELECT/ASK queries up to ' + MAX_QUERY_LENGTH + ' characters are proxied.', { status: 400 });
      }

      // Forwarded as a form POST too, so a long query doesn't hit a URL limit upstream either.
      const upstreamResponse = await fetch(UPSTREAM, {
        method: 'POST',
        headers: { 'Accept': 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ query })
      });

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: {
          'Content-Type': upstreamResponse.headers.get('Content-Type') || 'application/sparql-results+json'
        }
      });
    }

    const asset = await env.ASSETS.fetch(request);
    // Unknown paths used to return an empty 404 body: a blank page with no way back.
    if (asset.status === 404 && (request.method === 'GET' || request.method === 'HEAD')) {
      return new Response(NOT_FOUND_HTML, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    return asset;
  }
};
