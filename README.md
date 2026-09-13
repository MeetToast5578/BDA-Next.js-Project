# BDA

A [Next.js](https://nextjs.org) app with [Payload CMS](https://payloadcms.com) as the backend, backed by Postgres.

## Getting started

1. Create a `.env` file with:

   ```
   PAYLOAD_SECRET=<any random string>
   DATABASE_URL=<postgres connection string>
   ```

2. Install and run:

   ```bash
   npm install
   npm run dev
   ```

- App: [http://localhost:3000](http://localhost:3000)
- Payload admin: [http://localhost:3000/admin](http://localhost:3000/admin)

## Structure

| Path                | What it holds                                                   |
| ------------------- | --------------------------------------------------------------- |
| `app/(frontend)`    | Public site routes                                                |
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
| `npm run contract:emit` | Regenerate the Prisma contract                |
