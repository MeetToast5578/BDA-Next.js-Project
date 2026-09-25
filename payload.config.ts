import { postgresAdapter } from "@payloadcms/db-postgres";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import sharp from "sharp";

import { Users } from "./collections/Users";
import { Media } from "./collections/Media";
import { Arena } from "./collections/Arena";
import { Teams } from "./collections/Teams";
import { Games } from "./collections/Games";
import { GameParticipants } from "./collections/GameParticipants";
import { JoinAttempts } from "./collections/JoinAttempts";
import { MAX_UPLOAD_BYTES } from "./lib/uploads";

/**
 * Only a well-formed token counts. `vercel env pull` writes the literal "[SENSITIVE]" for secrets it
 * may not export, and the adapter throws on a malformed token at config load — which takes the whole
 * app down, not just uploads. An unusable token therefore means "no Blob", same as an absent one.
 */
const blobToken = /^vercel_blob_rw_[a-z\d]+_[a-z\d]+$/i.test(process.env.BLOB_READ_WRITE_TOKEN ?? "")
  ? (process.env.BLOB_READ_WRITE_TOKEN as string)
  : "";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Arena, Teams, Games, GameParticipants, JoinAttempts],
  upload: {
    // Vercel refuses request bodies over 4.5 MB before they reach the app, with a bare error page;
    // stopping at 4 MB here answers with a message instead. The picture pickers check it too.
    limits: { fileSize: MAX_UPLOAD_BYTES },
    abortOnLimit: true,
    responseOnLimit: "Şəkil 4 MB-dan böyük ola bilməz.",
  },
  // Nothing in the app queries GraphQL; the REST API under /api/v1 is the only data surface.
  graphQL: { disable: true },
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    // DATABASE_URL is a pooled (PgBouncer) endpoint. Drizzle's dev-time schema push introspects via
    // session-level queries the pooler drops mid-flight, which fails Payload init and breaks every
    // write in the admin panel. Schema changes go through migrations instead.
    push: false,
    pool: {
      connectionString: process.env.DATABASE_URL || "",
    },
  }),
  sharp,
  plugins: [
    // Vercel's filesystem is read-only and per-invocation, so uploads cannot live on disk there.
    // Disabled without a token so local dev keeps writing to ./media and needs no Blob store.
    vercelBlobStorage({
      enabled: Boolean(blobToken),
      collections: { media: true },
      token: blobToken,
    }),
  ],
});
