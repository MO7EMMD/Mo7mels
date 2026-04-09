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

The included `render.yaml` can be used to create the service quickly after connecting the repository.