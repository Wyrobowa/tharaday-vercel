# Backend (Vercel Functions)

This folder contains the API for the webapp, intended to be deployed as a
separate Vercel project (frontend lives in `tharaday-next`).

## Setup (GitHub Pages + Vercel)
1. Create a new Vercel project and set the **Root Directory** to this repo.
2. Add environment variable `DATABASE_URL` in Vercel (use your Neon URL).
3. (Recommended) Add `ALLOWED_ORIGINS` with your GitHub Pages origin, e.g. `https://<user>.github.io`.
4. Deploy. Your API base URL will look like `https://<project>.vercel.app`.

## Local env
- Copy `.env.example` to `.env.local` for local development.
- Do not commit `.env.local` (it is ignored).

## Endpoints
- `GET /api/health`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users`
- `DELETE /api/users?id=...`
- `GET /api/roles`
- `GET /api/statuses`
- `GET /api/items`
- `POST /api/items`
- `PATCH /api/items`
- `DELETE /api/items?id=...`
- `GET /api/item-types`
- `GET /api/priorities`

## Structure
- `api/` -> thin Vercel Function entrypoints
- `src/lib/` -> shared helpers (db, http)
- `src/routes/` -> route handlers

## Docs
- `docs/DEPLOY.md` -> deploy checklist for backend + frontend
- `docs/VERCEL.md` -> Vercel setup and verification
- `docs/ENV.md` -> environment variables reference
- `docs/GITHUB_PAGES.md` -> GitHub Pages notes for frontend
