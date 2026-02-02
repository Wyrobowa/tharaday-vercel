# Environment Variables

## Backend (tharaday-vercel)
Required:
- `DATABASE_URL` (Neon Postgres connection string)

Recommended:
- `ALLOWED_ORIGINS` (comma-separated list of allowed origins)
  - Example: `https://wyrobowa.github.io`

Local development:
- Copy `.env.example` → `.env.local`
- Never commit `.env.local`

## Frontend (tharaday-next)
Required for GitHub Pages:
- `NEXT_PUBLIC_API_BASE_URL` (your Vercel backend URL)

Where to set:
- Local dev: `.env.local`
- GitHub Actions: Repo Settings → Actions → Variables

Never put `DATABASE_URL` in frontend env files.
