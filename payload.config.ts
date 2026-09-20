import { postgresAdapter } from "@payloadcms/db-postgres";
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
  plugins: [],
});
