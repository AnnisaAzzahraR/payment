Netlify deploy steps for this frontend
------------------------------------

Quick checklist (required files in repo root):
- `kasir.html` (frontend entry)
- `kasir.js`
- `_redirects` (already present) — this proxies `/api/*` to the Render backend

Recommended: ensure `window.API_URL = '/api'` in `kasir.html` so Netlify proxy handles API calls.

Option A — Deploy via Netlify UI (recommended for first time):
1. Zip your project folder or push it to a Git repo (GitHub, GitLab, Bitbucket).
2. In Netlify dashboard: "Add new site" → "Import from Git" (or drag & drop the folder).
3. If importing from Git: select repo, set build command empty, Publish directory set to root (`/`).
4. Deploy. After publish, open the site and test `GET /api/invoices` from the browser (via UI).

Option B — Deploy with Netlify CLI (quick manual):
1. Install CLI: `npm install -g netlify-cli` or `npx netlify-cli`
2. Login: `netlify login`
3. From project root run (first deploy):
   `netlify init` and follow prompts (choose existing site or create new)
   or quick deploy:
   `netlify deploy --dir=. --prod`

Notes & troubleshooting:
- Ensure `_redirects` is in the published root so Netlify applies the proxy rule:
  `/api/* https://payment-qich.onrender.com/api/:splat 200`
- If API calls fail on the deployed site, open DevTools → Network and check the request URL and response.
- If you prefer environment-specific URLs, you can set an env var in Netlify and update `kasir.html` build-time to inject it.

Local testing reminders:
- For local quick test without proxy, set `window.API_URL = 'https://payment-qich.onrender.com/api'` in `kasir.html`.
- Alternatively run a local proxy server (`dev-proxy.js`) to forward `/api` to Render.

If you want, I can:
- Commit and push these changes to your git repo (if you want me to run git here).
- Run Netlify CLI deploy steps interactively (I can provide exact commands to run locally).
