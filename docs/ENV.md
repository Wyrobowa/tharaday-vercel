# Environment Variables

## Backend (tharaday-vercel)
Required:
- `DATABASE_URL` (Neon Postgres connection string)

Recommended:
- `ALLOWED_ORIGINS` (comma-separated list of allowed origins)
  - Example: `https://wyrobowa.github.io,http://localhost:3000`
  - Localhost origins (`http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5173`, `http://127.0.0.1:5173`) are also accepted automatically.
- `AUTH_TOKEN_TTL_SECONDS` (JWT lifetime in seconds, default `604800`)
- `SIGNUP_DEFAULT_ROLE_NAME` (signup role name, default `customer`)
- `SIGNUP_DEFAULT_STATUS_NAME` (signup status name, default `active`)

Required for auth:
- `AUTH_JWT_SECRET` (used to sign JWT tokens from `POST /api/login`)

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
