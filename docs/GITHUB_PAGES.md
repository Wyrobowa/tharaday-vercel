# GitHub Pages Guide (Frontend)

This backend is consumed by the `tharaday-next` frontend.

## Workflow setup
- The frontend repo uses a GitHub Actions workflow to build and publish `out/`.
- Pages must be configured to use GitHub Actions.

## Required variable
In the frontend repo:
- Set `NEXT_PUBLIC_API_BASE_URL=https://<project>.vercel.app` as a GitHub Actions variable.

## Verify
- After the workflow finishes, open the GitHub Pages URL.
- Use DevTools → Network to confirm API calls go to the Vercel URL.
