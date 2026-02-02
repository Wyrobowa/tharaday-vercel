# Vercel Deploy Guide

## Create the project
1. Go to Vercel and click **Add New → Project**.
2. Import the `tharaday-vercel` repo.
3. Keep defaults (Framework preset can be Other / No Framework).
4. Deploy.

## Environment variables
Set these in Vercel → Project → Settings → Environment Variables:
- `DATABASE_URL` (Neon connection string)
- `ALLOWED_ORIGINS` (GitHub Pages origin)

After changing env vars, redeploy.

## Verify
Open `https://<project>.vercel.app/api/health` and confirm:
```
{ "ok": true }
```
