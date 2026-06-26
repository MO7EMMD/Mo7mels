Render deployment checklist for Mo7mels

1. Set required environment variables in Render service settings:

   - `SITE_URL` = your production URL (e.g. https://your-site.onrender.com)
   - `DATABASE_URL` = Postgres connection string (postgres://user:pass@host:5432/dbname)

2. Optional but recommended for email OTP delivery:

   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
   - If you don't provide SMTP credentials, set `OTP_DEBUG=false` for production and use another verification flow.

3. Build & start commands (already configured in `render.yaml`):

   - Build command: `npm install && npm run build`
   - Start command: `npm start`

4. After deployment, run the migration (if migrating from legacy JSON):

   - Open a one-off shell on the instance or run locally with the same `DATABASE_URL` and execute:

     ```bash
     npm run migrate:json
     ```

   - Confirm users/embeds/subscriptions exist in the database.

5. Verify site behavior:

   - Visit `SITE_URL` and try signup/login flows.
   - If OTP emails are enabled, verify SMTP delivery.
   - Check the Dashboard for charts and account settings.

6. Rollback plan:

   - If issues arise, you can rollback to a previous Git commit in Render or restore database from backups.

Notes:
 - The migration script will generate placeholder emails for legacy users missing an email (format: `username@migration.local`). You can manually update these in the DB.
 - Ensure `NODE_ENV` is set to `production` on Render for proper logging and behavior.
