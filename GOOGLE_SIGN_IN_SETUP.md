# Google sign-in and persistent data setup

Mo7mels already stores user accounts and saved embeds through the PostgreSQL database configured by `DATABASE_URL`. Google sign-in uses that same database; it does not move user data to Google Sheets.

A Google account must be created and verified by you at Google. The site integration is prepared in the app, but it stays disabled until you add OAuth credentials.

## Create OAuth credentials

1. Sign in to [Google Cloud Console](https://console.cloud.google.com/) with your Google account and select or create a project.
2. Configure the OAuth consent screen and add `www.mo7mels.com` as an authorized domain.
   - Use `https://www.mo7mels.com/` as the app homepage.
   - Use `https://www.mo7mels.com/#privacy` as the privacy policy link and `https://www.mo7mels.com/#rules` as the terms link.
3. Create an OAuth client with application type **Web application**.
4. Add this authorized JavaScript origin: `https://www.mo7mels.com`.
5. Add this authorized redirect URI: `https://www.mo7mels.com/api/auth/google/callback`.
6. In the Mo7mels Render service environment, set:
   - `GOOGLE_CLIENT_ID` to the client ID from Google Cloud.
   - `GOOGLE_CLIENT_SECRET` to the client secret. Keep this value server-only.
   - `VITE_GOOGLE_AUTH_ENABLED` to `true`.
7. Redeploy the service so the frontend displays the Google sign-in option.

The callback checks OAuth state, requires a verified Google email, creates or reuses the matching Mo7mels account, and stores a seven-day session in the configured database. The session credential is held in an HttpOnly cookie.

## Google Search

Google Search Console already has a site verification file in `public/`. Once you sign in to Search Console with your Google account, verify the `https://www.mo7mels.com/` URL-prefix property and submit `https://www.mo7mels.com/sitemap.xml`. Google decides when pages are indexed; submitting a sitemap requests discovery and does not guarantee a ranking or immediate listing.
