# Mo7mels

A web application to generate embed codes, manage accounts, and save embeds to a lightweight API-backed dashboard.

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Run the API server and Vite together:
   ```
   npm run dev:full
   ```

3. Open your browser to `http://localhost:5173`

## Features

- Generate embed codes for YouTube videos
- Generate embed codes for TikTok videos
- Generate embed codes for Instagram posts and reels
- Generic iframe embeds for other URLs
- Login and signup pages with validation using Supabase Auth
- Confirm password field for new accounts
- Dashboard page for reviewing saved embed history
- File-based API server with JSON storage in `server/data/db.json`

## Available Scripts

- `npm run dev`: run the Vite frontend only
- `npm run server`: run the API server only
- `npm run dev:full`: run frontend and API together
- `npm start`: run the production server that serves the built app and API

## Deployment

The project is prepared for deployment on platforms like Render.

Render setup:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Port: provided automatically by Render through `PORT`
- Required environment variable: `SITE_URL=https://mo7mels.onrender.com`
- Canonical redirect: `ENABLE_CANONICAL_REDIRECT=true` to force traffic onto the primary domain
- Required for authenticated embed API: `SUPABASE_URL` and `SUPABASE_ANON_KEY`

The included `render.yaml` can be used to create the service quickly after connecting the repository.

## Custom Domain

To connect a custom domain on Render:

1. Open your Render service and add the domain under `Settings > Custom Domains`.
2. Add the DNS records exactly as Render shows for your domain or subdomain.
3. Set `SITE_URL` to your final primary URL: `https://mo7mels.onrender.com`.
4. If you want the Render default URL or secondary hostnames to redirect to the main domain, set `ENABLE_CANONICAL_REDIRECT=true`.
5. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as environment variables.
6. Redeploy the service after saving the environment variables.

If `SITE_URL` is missing in production, the server now refuses to generate canonical metadata, `robots.txt`, and `sitemap.xml` from request headers.

After deployment, the app now generates these URLs from the live domain automatically:

- Canonical URL in the main HTML
- Open Graph URL
- `robots.txt`
- `sitemap.xml`

Last deployment trigger: 2026-04-09