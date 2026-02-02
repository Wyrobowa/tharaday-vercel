# Deploy Checklist

This checklist covers both repos:
- Backend: `tharaday-vercel` (Vercel Functions)
- Frontend: `tharaday-next` (GitHub Pages)

## 1) Backend (Vercel)
- Push backend changes to `main`.
- In Vercel project settings, set env vars:
  - `DATABASE_URL` (Neon connection string)
  - `ALLOWED_ORIGINS` (GitHub Pages origin, e.g. `https://wyrobowa.github.io`)
- Redeploy the latest production deployment (or push to trigger).
- Verify: open `https://<project>.vercel.app/api/health` and check `{ "ok": true }`.

## 2) Frontend (GitHub Pages)
- In `tharaday-next`, set env for build:
  - `NEXT_PUBLIC_API_BASE_URL=https://<project>.vercel.app`
- Commit and push to `main`.
- In GitHub repo settings:
  - Pages → Source = GitHub Actions
  - Actions Variables → `NEXT_PUBLIC_API_BASE_URL` set
- Wait for the Actions workflow to publish.
- Verify: open the GitHub Pages site and check API calls in the browser network tab.
