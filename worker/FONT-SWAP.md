# Font swap — self-host woff2 at Worker cutover

> ## APPLY AT CUTOVER, NOT BEFORE
>
> The live **Namecheap (Flask/Passenger) deploy keeps Google Fonts** per the
> owner decision (locked decision #8: "Google Fonts CDN now; self-hosted woff2 at
> Worker migration"). Do **not** apply this diff while the app is still served
> from Namecheap. Apply it **only** as part of the Cloudflare Worker cutover
> (Phase 3), in the same change that flips serving to the Worker.

## What this does

Replaces the three Google Fonts `<link>` tags in
`src/lodestar/static/index.html` (two `preconnect`s + one stylesheet) with:

1. two `<link rel="preload">` hints for the staged woff2 files, and
2. an inline `@font-face` block pointing at the self-hosted fonts in
   `src/lodestar/static/fonts/`.

Self-hosting removes the two cross-origin handshakes (`fonts.googleapis.com`,
`fonts.gstatic.com`) and the render-blocking CSS round-trip, and keeps the UI
working with zero third-party requests once it is on the Worker.

## Path note — `/static/fonts/...` works on every host

The Worker's assets binding serves `src/lodestar/static` at the **site root**,
but `worker/src/index.ts` rewrites `GET /static/*` to the root-served asset
paths (the ASSETS binding in `wrangler.jsonc`), exactly so that index.html's
Flask-scheme URLs stay host-agnostic. The diff below therefore uses
`/static/fonts/...` — the same scheme as the favicon links — and resolves
identically under Flask, FastAPI, and the Worker.

## Fonts being self-hosted

- `cinzel-700-latin.woff2` — Cinzel 700 (the LODESTAR wordmark), latin subset.
- `inter-latin.woff2` — Inter, latin subset. Inter is a **variable** font on
  Google Fonts, so weights 400, 500, and 600 all resolve to this one file; the
  three `@font-face` rules below point at it and pin `font-weight` per face.

Provenance and SIL OFL 1.1 license: `src/lodestar/static/fonts/OFL-NOTE.md`.

## Exact diff to apply to `src/lodestar/static/index.html`

```diff
@@ -9,9 +9,28 @@
   <link rel="icon" href="/static/favicon-16.png" sizes="16x16" type="image/png">
   <link rel="apple-touch-icon" href="/static/apple-touch-icon.png">
   <meta name="theme-color" content="#EAF2F9">
-  <link rel="preconnect" href="https://fonts.googleapis.com">
-  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
-  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
+  <link rel="preload" href="/static/fonts/cinzel-700-latin.woff2" as="font" type="font/woff2" crossorigin>
+  <link rel="preload" href="/static/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
+  <style>
+    /* Self-hosted latin-subset woff2 (SIL OFL 1.1 — see static/fonts/OFL-NOTE.md). */
+    @font-face{
+      font-family:"Cinzel";font-style:normal;font-weight:700;font-display:swap;
+      src:url("/static/fonts/cinzel-700-latin.woff2") format("woff2");
+    }
+    @font-face{
+      font-family:"Inter";font-style:normal;font-weight:400;font-display:swap;
+      src:url("/static/fonts/inter-latin.woff2") format("woff2");
+    }
+    @font-face{
+      font-family:"Inter";font-style:normal;font-weight:500;font-display:swap;
+      src:url("/static/fonts/inter-latin.woff2") format("woff2");
+    }
+    @font-face{
+      font-family:"Inter";font-style:normal;font-weight:600;font-display:swap;
+      src:url("/static/fonts/inter-latin.woff2") format("woff2");
+    }
+  </style>
```

The existing `--font-display` / `--font-body` CSS variables and every `font:`
shorthand in the page are unchanged — the family names (`"Cinzel"`, `"Inter"`)
and weights (700; 400/500/600) match the staged faces exactly, so no other edit
is required.

## Post-swap verification (at cutover)

- `wrangler dev`, then load `/`: confirm the network panel shows the two
  `/static/fonts/*.woff2` requests (200, served via the /static/\* passthrough)
  and **no** request to `fonts.googleapis.com` or `fonts.gstatic.com`.
- Confirm the LODESTAR wordmark renders in Cinzel 700 and body/subtitle/chips in
  Inter (no FOUT beyond the `font-display:swap` flash).
- Spot-check "résumés" (U+00E9) and the em dash in the subtitle render with the
  self-hosted faces — both code points are inside the staged latin subset.
