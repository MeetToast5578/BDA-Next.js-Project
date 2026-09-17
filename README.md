# BDA

A [Next.js](https://nextjs.org) app with [Payload CMS](https://payloadcms.com) as the backend, backed by Postgres.

## Getting started

1. Create a `.env` file with:

   ```
   PAYLOAD_SECRET=<any random string>
   DATABASE_URL=<postgres connection string>
   # Optional: CDN origin that serves /api/media/*, used in API image URLs
   MEDIA_BASE_URL=https://cdn.example.com
   ```

2. Install and run:

   ```bash
   npm install
   npm run dev
   ```

- App: [http://localhost:3000](http://localhost:3000)
- Payload admin: [http://localhost:3000/admin](http://localhost:3000/admin)
- Seed sample venues and games (dev only): `curl -X POST http://localhost:3000/api/seed-games` while the dev server runs
- API reference: [docs/api.md](docs/api.md)

## Structure

| Path                | What it holds                                                   |
| ------------------- | --------------------------------------------------------------- |
| `app/(frontend)`    | Public site: home, `/games`, `/games/[id]`, `/games/new`, `/login`, `/register` |
| `components/`       | Frontend components (CSS Modules); design tokens are in `app/(frontend)/globals.css` |
| `app/(payload)`     | Payload admin panel and its REST/GraphQL routes (generated)       |
| `app/api`           | Custom API routes — games, sports, Google auth, seeding           |
| `collections/`      | Payload collection definitions                                    |
| `lib/`              | Shared server helpers                                             |
| `src/prisma/`       | Prisma 8 contract and client                                      |
| `migrations/`       | Prisma migration history                                          |
| `scripts/`          | One-off dev scripts                                               |
| `payload.config.ts` | Payload configuration                                             |

## Scripts

| Command                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Start the dev server                          |
| `npm run build`         | Production build                              |
| `npm start`             | Serve the production build                    |
| `npm run lint`          | Run ESLint                                    |
| `npm test`              | Run the Vitest suite (join tests use `DATABASE_URL`) |
| `npm run contract:emit` | Regenerate the Prisma contract                |
