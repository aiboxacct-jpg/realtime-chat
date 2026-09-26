# Deploy runbook — Real-time Chat

How this app went from a private Muse artifact to a live site. Follow these
steps to redeploy or to ship a similar app the same way.

## What lives where

- Code: https://github.com/aiboxacct-jpg/realtime-chat (private)
- Live site: https://realtime-chat-nine-ochre.vercel.app
- Database: Turso `realtime-chat` (org `feetandmore`, region aws-us-west-2, free/Starter tier)
- Secrets: `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` are stored as Vercel
  environment variables (Production and Preview) on the `realtime-chat`
  project. The token can also be re-created anytime in the Turso dashboard
  (app.turso.tech → database → Tokens). They are intentionally NOT written
  down anywhere else.

## Steps (in order)

1. **Port the app for Vercel.** The Muse artifact ran on a private runtime
   (React SPA + server actions + local SQLite). The port:
   - Frontend: Vite + React SPA calling same-origin `/api/*` (fetch).
   - Backend: `api/` serverless functions (plain Node req/res handlers).
   - Database: Turso via `@libsql/client` + drizzle-orm libsql dialect,
     configured only through `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`.
   - IMPORTANT: every relative import in `api/` and `lib/` must use an
     explicit `.js` extension (e.g. `from "../../lib/db.js"`). Extensionless
     ESM imports crash on Vercel with `ERR_MODULE_NOT_FOUND`.
2. **Push to GitHub.** Create a repo (the building-agent token cannot create
   repos, so create it by hand on github.com), then push the ported project.
3. **Import into Vercel.** vercel.com → Add New Project → select the repo.
   Framework preset auto-detects Vite; keep the defaults. Deploy (the app
   will error at runtime until step 5 — expected).
4. **Create the Turso database.** turso.tech → sign up/in with GitHub →
   create database `realtime-chat` (free tier). Note the database URL
   (`libsql://…`) and create an auth token (Read & Write).
5. **Run the migration.** From the project dir with the two env vars set:
   `npm run db:migrate` (drizzle-kit, uses `drizzle.config.ts`).
6. **Add env vars in Vercel.** Project → Settings → Environment Variables:
   `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, applied to Production and
   Preview. Then Deployments → Redeploy the latest (clean, no build cache).
7. **Smoke test.** Register → login → post a message → list messages via the
   `/api/*` endpoints (or just use the site). Delete any test rows afterwards.

## Gotchas hit on 2026-09-25

- GitHub fine-grained token lacked repo-creation permission → repo was
  created manually.
- GitHub password sign-in rejected for the OAuth-based account → signed in
  via the phone-app browser takeover instead.
- Git Data API returns 409 "Git Repository is empty" on a fresh repo → seed
  it with one Contents-API commit first.
- The Turso `realtime-chat` database already existed in the account, so no
  duplicate was created.
- Extensionless imports (the `.js` issue above) were the only code fix needed.
