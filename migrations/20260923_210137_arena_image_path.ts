import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "arenas" ADD COLUMN "image_path" varchar;`)

  // Point the seeded venues at their photo in public/images/arenas. Their old uploads were written to
  // the local ./media folder, which a Vercel deploy never has, so the link to them is dropped too.
  await db.execute(sql`
   UPDATE "arenas" SET "image_id" = NULL, "image_path" = CASE "name"
     WHEN 'Inter Arena' THEN '/images/arenas/inter-arena.png'
     WHEN 'Aku Arena' THEN '/images/arenas/aku-arena.png'
     WHEN '707 Stadium' THEN '/images/arenas/707-stadium.png'
     WHEN 'Sahil Sport Mərkəzi' THEN '/images/arenas/sahil-sport-merkezi.png'
     WHEN 'Yasamal Idman Kompleksi' THEN '/images/arenas/yasamal-idman-kompleksi.png'
     WHEN 'Binəqədi Futbol Parkı' THEN '/images/arenas/bineqedi-futbol-parki.png'
     WHEN 'Nəsimi Arena' THEN '/images/arenas/nesimi-arena.png'
     WHEN 'Xəzər Tennis Klubu' THEN '/images/arenas/xezer-tennis-klubu.png'
     WHEN 'Sabunçu İdman Meydanı' THEN '/images/arenas/sabuncu-idman-meydani.png'
     WHEN 'Qaradağ Sport Hub' THEN '/images/arenas/qaradag-sport-hub.png'
     WHEN 'Suraxanı Basket Zalı' THEN '/images/arenas/suraxani-basket-zali.png'
     WHEN 'Dərnəgül Mini Futbol' THEN '/images/arenas/dernegul-mini-futbol.png'
   END
   WHERE "name" IN ('Inter Arena', 'Aku Arena', '707 Stadium', 'Sahil Sport Mərkəzi', 'Yasamal Idman Kompleksi',
     'Binəqədi Futbol Parkı', 'Nəsimi Arena', 'Xəzər Tennis Klubu', 'Sabunçu İdman Meydanı', 'Qaradağ Sport Hub',
     'Suraxanı Basket Zalı', 'Dərnəgül Mini Futbol');`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "arenas" DROP COLUMN "image_path";`)
}
