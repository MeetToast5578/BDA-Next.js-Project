# OyunaGəl API

The homepage, game and venue endpoints live under `/api/v1`. Payload's own REST API (collections, auth) stays at `/api/*`, which is why the two don't share paths: a custom `/api/games` route would shadow Payload's and break the admin panel.

All times in responses are ISO 8601 UTC. Every display label (`dateLabel`, `timeLabel`, `relativeTimeLabel`, `sportLabel`, `levelLabel`, `venue.label`) is computed server-side in `Asia/Baku`, so the frontend never does timezone math.

Errors always have the shape:

```json
{ "error": { "code": "GAME_FULL", "message": "Oyunda boş yer qalmayıb." } }
```

## Screens → endpoints

| Screen (Figma)                          | Endpoint                                             |
| --------------------------------------- | ---------------------------------------------------- |
| Hero carousel                           | `GET /api/v1/games/featured`                         |
| Sport tabs ("Futbol · 18 açıq oyun")    | `GET /api/v1/sports`                                 |
| "Açıq oyunlar" grid, "Daha çox"         | `GET /api/v1/games?page=N`                           |
| Empty state ("Hələ açıq oyun yoxdur")   | `GET /api/v1/games?sport=…` returning `games: []`    |
| Oyun Detalı                             | `GET /api/v1/games/{id}`                             |
| "Bir addım qaldı" → "Qoşulmanı təsdiq et" | `POST /api/v1/games/{id}/join` (returns host phone) |
| Yeni Oyun Yarat: Meydança picker        | `GET /api/v1/venues?sport=…&q=…`                     |
| Yeni Oyun Yarat: "Oyunu dərc et"        | `POST /api/v1/games`                                 |
| Daxil ol / Qeydiyyat                    | Payload auth, see [Accounts](#accounts)              |

Joining and creating games require a signed-in account. The create form asks for the host's phone (prefilled from the profile); the host name is taken from the account. Joining needs no input: "Qoşulmanı təsdiq et" sends the request with no body.

## Game status

Every game carries a server-computed `status` and `remainingSpots` (`lib/game-backend.ts` → `deriveAvailability`). Display these; never recompute them from the counts.

| `status`    | Meaning                                          | Joinable |
| ----------- | ------------------------------------------------ | -------- |
| `open`      | Upcoming and at least one spot left              | yes      |
| `full`      | Upcoming, no spots left                          | no       |
| `closed`    | Start time has passed but status not yet updated | no       |
| `live`      | In progress                                      | no       |
| `finished`  | Over                                             | no       |
| `cancelled` | Cancelled                                        | no       |

## Game card

Returned by the list, featured and detail endpoints.

```json
{
  "id": "12",
  "title": "Cümə axşamı 5-ə-5",
  "sport": "football",
  "sportLabel": "Futbol",
  "level": "medium",
  "levelLabel": "Orta səviyyə",
  "venue": {
    "id": "3",
    "name": "Aku Arena",
    "label": "Aku Arena — Nizami, Bakı",
    "district": "Nizami",
    "address": "Nizami, Bakı",
    "city": "baku",
    "cityLabel": "Bakı",
    "coordinates": { "lat": 40.4, "lng": 49.87 },
    "sportTypes": ["football"]
  },
  "district": "Nizami",
  "startsAt": "2026-08-02T16:00:00.000Z",
  "dateLabel": "Baz, 2 Avq",
  "timeLabel": "20:00",
  "relativeTimeLabel": "Bu gün · 20:00",
  "currentCount": 11,
  "maxCount": 12,
  "remainingSpots": 1,
  "status": "open",
  "coverImageUrl": "/api/media/file/cover-1600x900.webp",
  "coverImage": {
    "thumbnailUrl": "/api/media/file/cover-480x270.webp",
    "fullUrl": "/api/media/file/cover-1600x900.webp",
    "fallbackUrl": "/images/game-football-1-7880cc.png"
  },
  "host": { "name": "Elvin Abbasov", "initials": "EA", "avatarUrl": null }
}
```

- The card line "Aku Arena · Nizami, Bakı · Orta səviyyə" is `venue.name · venue.district, venue.cityLabel · levelLabel`.
- "6/10 oyunçu" / "4 yer qalıb" are `currentCount/maxCount` and `remainingSpots`.
- `relativeTimeLabel` is `Bu gün · HH:mm`, `Sabah · HH:mm`, the weekday within the week, or the date beyond it.
- `coverImage.fallbackUrl` is always the sport's default image, for an `onError` handler.

## `GET /api/v1/sports`

Sport tabs. Every known sport is listed, including those with no open games.

| Query  | Default | Notes                                        |
| ------ | ------- | -------------------------------------------- |
| `city` | `baku`  | `baku` or `Bakı`. Unknown → `400 UNKNOWN_CITY` |

```json
[
  { "sport": "football", "label": "Futbol", "iconKey": "football", "openGamesCount": 18 },
  { "sport": "basketball", "label": "Basketbol", "iconKey": "basketball", "openGamesCount": 9 },
  { "sport": "tennis", "label": "Tennis", "iconKey": "tennis", "openGamesCount": 7 }
]
```

Only `open` games count. The query is cached (Next data cache, tag `games`, refreshed at least every 60 s). Any game, venue or participant change and every successful join expire it immediately.

## `GET /api/v1/games`

The "bu gün / sabah" grid and the "Hamısına bax" list, soonest first.

| Query    | Default                    | Notes                                                        |
| -------- | -------------------------- | ------------------------------------------------------------ |
| `sport`  | all                        | `football`, `basketball`, `tennis`. Else `400 INVALID_SPORT` |
| `city`   | `baku`                     | As above                                                     |
| `from`   | now                        | ISO 8601 with offset, e.g. `2026-09-14T00:00:00+04:00`. Clamped to now: started games are never listed |
| `to`     | end of tomorrow, Baku time | ISO 8601, exclusive. Pass a later date for "Hamısına bax"    |
| `status` | open and full              | `open` → only games with spots left                          |
| `page`   | `1`                        | 1-based                                                      |
| `limit`  | `12`                       | 1–50                                                         |

```json
{
  "games": [{ "…": "game card" }],
  "pagination": { "page": 1, "limit": 12, "totalDocs": 30, "totalPages": 3, "hasNextPage": true }
}
```

**Pagination** is page-based: "Daha çox" requests `page + 1` and appends; hide it when `hasNextPage` is `false`. `totalDocs`/`totalPages` reflect the filters.

## `GET /api/v1/games/featured`

Hero-carousel games: game cards plus a participant preview for the avatar stack.

| Query   | Default | Notes    |
| ------- | ------- | -------- |
| `city`  | `baku`  | As above |
| `limit` | `8`     | 1–8      |

**Ranking.** Candidates are `open` games starting within the next 7 days, each scored

```
score = 0.6 × (1 − hoursUntilStart / 168) + 0.4 × (currentCount / maxCount)
```

so games that start soon and are nearly full rank first. Ties go to the earlier start.

```json
{
  "games": [
    {
      "…": "game card",
      "participants": {
        "preview": [{ "name": "Elvin Abbasov", "initials": "EA", "avatarUrl": "/api/media/file/elvin.png" }],
        "total": 11
      }
    }
  ],
  "totalDocs": 1
}
```

`preview` holds up to the first 5 players who joined through the join endpoint, oldest first. Show `avatarUrl` when set, else `initials`. The "+N" bubble is `total − preview.length`.

## `GET /api/v1/games/{id}`

"Oyun Detalı". Signing in is optional.

```json
{
  "…": "game card",
  "host": { "name": "Elvin Abbasov", "initials": "EA", "avatarUrl": null, "phone": null },
  "participants": { "preview": [{ "name": "…", "initials": "RM", "avatarUrl": null }], "total": 11 },
  "viewer": { "joined": false, "isHost": false }
}
```

`host.phone` is `null` until the viewer has joined (or is the host), matching "Əlaqə oyuna qoşulduqdan sonra görünür". The button reads "Qoşul - {remainingSpots} yer qalıb" while `status` is `open`. `404 GAME_NOT_FOUND` for unknown IDs.

## `POST /api/v1/games/{id}/join`

"Oyuna qoşul". Requires a signed-in user (Payload session or Google session cookie).

Body (optional): `{ "phone": "+994 50 210 34 56" }`. It defaults to the profile's phone number.

**200** also returns the full game detail, now with `host.phone`:

```json
{
  "id": "12",
  "status": "full",
  "remainingSpots": 0,
  "currentCount": 12,
  "maxCount": 12,
  "game": { "…": "as GET /api/v1/games/{id}", "host": { "name": "Elvin Abbasov", "phone": "+994502103456" } }
}
```

The spot is taken when this request succeeds. The "Bir addım qaldı" modal then closes and the page reloads its data, which shows the new count and the host's phone.

| Status | `code`              | When                                                      |
| ------ | ------------------- | --------------------------------------------------------- |
| 400    | `INVALID_GAME_ID`   | `id` is not a positive integer                            |
| 400    | `INVALID_PHONE`     | `phone` isn't an Azerbaijani number                       |
| 401    | `UNAUTHENTICATED`   | Not signed in: send the user to "Daxil ol"                |
| 404    | `GAME_NOT_FOUND`    |                                                           |
| 409    | `GAME_FULL`         | No spots left, including losing a race for the last spot  |
| 409    | `GAME_NOT_JOINABLE` | Cancelled, finished, live, or already started             |
| 409    | `ALREADY_JOINED`    | This user already holds a spot                            |

**Concurrency.** The spot is claimed with one conditional `UPDATE … WHERE available_players > 0` inside a transaction (`lib/join-game.ts`). Postgres re-checks the condition after the row lock is released, so when two requests race for the last spot, exactly one succeeds and the other gets `409 GAME_FULL`, across any number of app instances. A unique `(game, user)` index prevents double joins, and a rejected join rolls the decrement back. Every attempt is written to the `join-attempts` collection (outcome, game, user, IP), readable by admins.

## `GET /api/v1/venues`

Options for the "Meydança" picker.

| Query   | Default | Notes                                                   |
| ------- | ------- | ------------------------------------------------------- |
| `city`  | `baku`  | As above                                                |
| `sport` | all     | Venues offering that sport (venues with no sports set are always included) |
| `q`     | none    | Search in name, district and address; ignores case and Azerbaijani letters (`inter`, `nerimanov`) |

```json
[{ "id": "3", "name": "Aku Arena", "label": "Aku Arena — Nizami, Bakı", "district": "Nizami", "…": "as venue above" }]
```

## `POST /api/v1/games`

"Yeni Oyun Yarat" → "Oyunu dərc et". Requires a signed-in user, who becomes the host and, in the same transaction, the game's first participant.

```json
{
  "sport": "Futbol",
  "level": "Orta",
  "venueId": 3,
  "scheduledDate": "2026-08-04",
  "scheduledTime": "17:00",
  "currentCount": 1,
  "maxCount": 10,
  "hostPhone": "+994 50 210 34 56",
  "title": "Cümə axşamı 5-ə-5"
}
```

| Field           | Notes                                                                      |
| --------------- | -------------------------------------------------------------------------- |
| `sport`         | `football`/`basketball`/`tennis` or the labels `Futbol`/`Basketbol`/`Tennis` |
| `level`         | `beginner`/`medium`/`high` or `Başlanğıc`/`Orta`/`Yüksək`                  |
| `venueId`       | From `GET /api/v1/venues`                                                  |
| `scheduledDate`, `scheduledTime` | Baku local time, `YYYY-MM-DD` and `HH:mm`; must be in the future |
| `currentCount`  | "Mövcud iştirakçı sayı": players already in, including the host, `1 … maxCount − 1` (0 or missing counts as 1). The game opens with `maxCount − currentCount` spots |
| `maxCount`      | Even (two equal sides), from 2 up to the sport's full size: football 22, basketball 10, tennis 4 |
| `hostPhone`     | Optional if the profile has a phone number; shown to players after they join |
| `title`         | Optional, defaults to "Futbol oyunu" etc. (the design has no title field)  |

The host name ("Ad Soyad (Host)") comes from the account, so show it read-only.

**201** `{ "game": { …as GET /api/v1/games/{id} } }`. Errors: `401 UNAUTHENTICATED`; `400` with `INVALID_SPORT`, `INVALID_LEVEL`, `INVALID_VENUE`, `INVALID_DATE`, `DATE_IN_PAST`, `INVALID_MAX_COUNT`, `INVALID_CURRENT_COUNT`, `INVALID_PHONE`, `VENUE_NOT_FOUND`, `VENUE_SPORT_MISMATCH`, `PHONE_REQUIRED`.

## Accounts

Payload's built-in auth endpoints on the `users` collection:

| Screen                 | Request                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------- |
| Qeydiyyat              | `POST /api/users` `{ "email", "password", "fullName": "<Ad> <Soyad>" }`. Password ≥ 8 characters |
| Daxil ol               | `POST /api/users/login` `{ "email", "password" }` (sets the `payload-token` cookie). A wrong email or password is a generic `401`; 5 failures lock the account for 10 minutes (also a `401`, with a "locked" message) |
| Google ilə davam et    | Link to `/api/auth/google`. The callback verifies the code with Google server-side, requires a verified email, and creates the account on first sign-in (name, email, profile picture) |
| Şifrəni unutmusunuz?   | `POST /api/users/forgot-password` `{ "email" }`. No email adapter is configured yet, so the mail is only printed to the server log |
| Current user           | `GET /api/users/me`                                                                     |
| Log out                | `POST /api/users/logout`                                                                |

Users can only read and edit their own account. Self-registered accounts are always plain users.

## Images

Uploads to `media` get `thumbnail` (480×270) and `full` (≤1600 wide) WebP renditions. Render them with `next/image`, which also serves AVIF to browsers that accept it. Set `MEDIA_BASE_URL` (a CDN in front of the app, or later an S3 bucket via `@payloadcms/storage-s3`) to get CDN URLs. Games without an uploaded cover fall back to `image`, then to the sport's default image.
