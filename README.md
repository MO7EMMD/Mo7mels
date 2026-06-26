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
- Login and signup pages with email OTP verification
- Confirm password field for new accounts
- Dashboard page for reviewing saved embed history
- File-based API server with JSON storage in `server/data/db.json`

## Available Scripts

- `npm run dev`: run the Vite frontend only
- `npm run server`: run the API server only
- `npm run dev:full`: run frontend and API together
- `npm start`: run the production server that serves the built app and API

## Deployment

Recommended simple/free deployment: **Render** (frontend + API in one service).

### Render setup

1. Connect the repository to Render and create a Web Service.
2. Use the included `render.yaml` (Blueprint) for automatic configuration.
3. Set these required environment variables in Render:
   - `SITE_URL=https://mo7mels.com`
   - `DATABASE_URL=postgres://...`
4. Set optional variables as needed:
   - `SITE_NAME`
   - `SITE_LOGO_URL`
   - `EMAIL_FROM`
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_SECURE`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `RESEND_API_KEY` (optional alternative to SMTP)
   - `OTP_DEBUG` = `true` (debug mode only)
   - `ENABLE_CANONICAL_REDIRECT`
   - `VITE_MAINTENANCE_MODE`
   - `VITE_MAINTENANCE_TITLE`
   - `VITE_MAINTENANCE_MESSAGE`
   - `VITE_LINKEDIN_URL`
5. Deploy.

Notes:

- Render will run `npm install && npm run build` then `npm start`.
- The Express server serves API and built frontend together.
- Keep a hosted Postgres database (for example Neon/Supabase/Render Postgres).
- For OTP email delivery, configure either SMTP settings or `RESEND_API_KEY`.

## Custom Domain

To connect a custom domain on Render:

1. Open your Render service and go to `Settings > Custom Domains`.
2. Add your domain (`mo7mels.com` and optionally `www.mo7mels.com`).
3. Set `SITE_URL` to your final primary URL.
4. Set `ENABLE_CANONICAL_REDIRECT=true` if you want non-primary hostnames redirected.
5. Add SMTP and branding environment variables if you want production OTP emails.
6. Redeploy after saving variables.

If `SITE_URL` is missing in production, the server now refuses to generate canonical metadata, `robots.txt`, and `sitemap.xml` from request headers.

After deployment, the app now generates these URLs from the live domain automatically:

- Canonical URL in the main HTML
- Open Graph URL
- `robots.txt`
- `sitemap.xml`

Last deployment trigger: 2026-04-09

## Account Settings & Dashboard Charts

- The dashboard includes an "Account Settings" section where users can update their name, change their email, and change their password.
- Password rules: at least 8 characters and include letters and numbers.
- Changing email requires the current password for security.
- A small Chart.js bar chart summarizes embed counts by platform. The frontend depends on `chart.js` and `react-chartjs-2`.

## Local testing checklist

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` with at minimum:

```
DATABASE_URL=postgres://user:pass@host:5432/dbname
OTP_DEBUG=true
```

3. Start server and frontend:

```bash
npm run dev:full
```

4. Open `http://localhost:5173`, sign in, then visit the Dashboard to use Account Settings and see charts.

## Data migration from legacy JSON

If you have an existing `server/data/db.json` file and want to migrate users, embeds, and subscriptions into Postgres, run:

```bash
npm run migrate:json
```

This script will attempt to map legacy `username` -> `name`, generate an email when missing (`username@migration.local`), hash plaintext passwords, and insert records into your Postgres database configured by `DATABASE_URL`.

Deployment note: ensure `DATABASE_URL` is set on Render and SMTP variables provided if you want real OTP emails. For quick testing set `OTP_DEBUG=true`.
