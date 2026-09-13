import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import sharp from "sharp";

import { Users } from "./collections/Users";
import { Media } from "./collections/Media";
import { Games } from "./collections/Games";
import { Teams } from "./collections/Teams";
import { Arena } from "./collections/Arena";


const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const postgres = postgresAdapter({
  pool: {
    connectionString: process.env.DATABASE_URL || "",
  },
});

// When Postgres is unreachable the adapter calls `rejectInitializing()` with no argument and
// nothing ever awaits `initializing` on that path, so Node reports `unhandledRejection: undefined`
// and the dev overlay shows that instead of the real connection error.
const db: typeof postgres = {
  ...postgres,
  init: (args) => {
    const adapter = postgres.init(args);
    void adapter.initializing?.catch(() => {});
    return adapter;
  },
};

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Games, Teams, Arena],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db,
  sharp,
  plugins: [],
});


