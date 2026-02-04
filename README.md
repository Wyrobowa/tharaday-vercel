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
- `GET /api/authors`
- `POST /api/authors`
- `PATCH /api/authors`
- `DELETE /api/authors?id=...`
- `GET /api/health`
- `GET /api/publishers`
- `POST /api/publishers`
- `PATCH /api/publishers`
- `DELETE /api/publishers?id=...`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users`
- `DELETE /api/users?id=...`
- `GET /api/roles`
- `GET /api/statuses`
- `GET /api/books`
- `POST /api/books`
- `PATCH /api/books`
- `DELETE /api/books?id=...`
- `GET /api/tags`
- `GET /api/priorities`

## Database schema + seeds
- `docs/schema.sql` -> baseline tables for users/books + lookup tables
- `docs/seed.sql` -> starter data for local/dev environments

The homepage (`/`) renders a list of endpoints from `public/routes.json`. That
file is generated at install time by `scripts/generate-routes.mjs` based on the
JSDoc metadata in `api/*.ts`.

## Structure
- `api/` -> Vercel Function routes
- `api/_db.ts` -> Neon DB helper
- `api/_utils.ts` -> CORS + HTTP helpers
- `public/routes.json` -> generated endpoint list for the homepage

## Docs
- `docs/DEPLOY.md` -> deploy checklist for backend + frontend
- `docs/VERCEL.md` -> Vercel setup and verification
- `docs/ENV.md` -> environment variables reference
- `docs/GITHUB_PAGES.md` -> GitHub Pages notes for frontend
