# Homepage API

Custom endpoints under `app/api/` that feed the homepage. All times are ISO 8601 UTC in responses; labels meant for display are computed server-side in `Asia/Baku`.

Errors always have the shape:

```json
{ "error": { "code": "GAME_FULL", "message": "Oyunda boş yer qalmayıb." } }
```

## Game status

Every game in a response carries a server-computed `status` and `remainingSpots` (`lib/game-backend.ts` → `deriveAvailability`). Clients should display these and never recompute them from the player counts.

| `status`    | Meaning                                            | Joinable |
| ----------- | -------------------------------------------------- | -------- |
| `open`      | Upcoming and at least one spot left                | yes      |
| `full`      | Upcoming, no spots left                            | no       |
| `closed`    | Start time has passed but status not yet updated   | no       |
| `live`      | In progress                                        | no       |
| `finished`  | Over                                               | no       |
| `cancelled` | Cancelled                                          | no       |

## `GET /api/sports`

Open-game counts for the homepage sport tabs. Every known sport is listed, including those with no open games.

| Query  | Default | Notes                                   |
| ------ | ------- | --------------------------------------- |
| `city` | `baku`  | `baku`/`Bakı`. Unknown → `400 UNKNOWN_CITY` |

```json
[
  { "sport": "football", "iconKey": "football", "openGamesCount": 4 },
  { "sport": "basketball", "iconKey": "basketball", "openGamesCount": 1 },
  { "sport": "tennis", "iconKey": "tennis", "openGamesCount": 0 }
]
```

Only `open` games count. The database query is cached (Next data cache, tag `games`, refreshed at least every 60 s). Any game, venue or participant change and every successful join expires it immediately, so counts stay exact while repeat requests skip the database.

## `GET /api/games`

Game cards for the "bu gün / sabah" grid and the "Hamısına bax" list, sorted by `startsAt`, soonest first.

| Query    | Default                    | Notes                                                        |
| -------- | -------------------------- | ------------------------------------------------------------ |
| `sport`  | all                        | `football`, `basketball`, `tennis`. Else `400 INVALID_SPORT` |
| `city`   | `baku`                     | As above                                                     |
| `from`   | now                        | ISO 8601 with offset, e.g. `2026-09-14T00:00:00+04:00`. Clamped to now: started games are never listed |
| `to`     | end of tomorrow, Baku time | ISO 8601, exclusive                                          |
| `status` | open and full              | `open` → only games with spots left                          |
| `page`   | `1`                        | 1-based                                                      |
| `limit`  | `12`                       | 1–50                                                         |

### Pagination

Offset pagination: request `page=N`; stop when `hasNextPage` is `false`. `totalDocs`/`totalPages` reflect the filters.

```json
{
  "games": [
    {
      "id": "12",
      "title": "Cümə axşamı 5-ə-5",
      "sport": "football",
      "level": "medium",
      "venue": {
        "id": "3",
        "name": "Inter Arena",
        "district": "Nərimanov",
        "address": "Nərimanov, Bakı",
        "city": "baku",
        "coordinates": { "lat": 40.4, "lng": 49.87 },
        "sportTypes": ["football", "basketball", "tennis"]
      },
      "district": "Nərimanov",
      "startsAt": "2026-09-13T13:00:00.000Z",
      "currentCount": 8,
      "maxCount": 12,
      "remainingSpots": 4,
      "status": "open",
      "coverImageUrl": "/api/media/file/cover-1600x900.webp",
      "coverImage": {
        "thumbnailUrl": "/api/media/file/cover-480x270.webp",
        "fullUrl": "/api/media/file/cover-1600x900.webp",
        "fallbackUrl": "/images/game-football-1-7880cc.png"
      },
      "host": { "name": "Elvin Məmmədov", "avatarUrl": null }
    }
  ],
  "pagination": { "page": 1, "limit": 12, "totalDocs": 1, "totalPages": 1, "hasNextPage": false }
}
```

## `GET /api/games/featured`

Hero-carousel games: the same card fields plus `relativeTimeLabel` and a participant preview.

| Query   | Default | Notes         |
| ------- | ------- | ------------- |
| `city`  | `baku`  | As above      |
| `limit` | `8`     | 1–8           |

### Ranking

Candidates are `open` games starting within the next 7 days. Each gets an urgency score:

```
score = 0.6 × (1 − hoursUntilStart / 168) + 0.4 × (currentCount / maxCount)
```

so games that start soon and are nearly full rank first. Ties go to the earlier start. The top `limit` (max 8) are returned.

```json
{
  "games": [
    {
      "…": "card fields as in /api/games",
      "relativeTimeLabel": "Bu gün · 17:00",
      "participants": {
        "preview": [{ "name": "Elvin Məmmədov", "initials": "EM" }],
        "total": 8
      }
    }
  ],
  "totalDocs": 1
}
```

`relativeTimeLabel` is `Bu gün · HH:mm`, `Sabah · HH:mm`, the weekday within the week, or the date beyond it, all in Baku time. `participants.preview` holds up to the first 5 players who joined through the join endpoint, oldest first. `total` is the game's `currentCount`.

## `POST /api/games/{id}/join`

Takes one spot for the signed-in user (Payload session or Google session cookie).

**200**

```json
{ "id": "12", "status": "open", "remainingSpots": 3, "currentCount": 9, "maxCount": 12 }
```

| Status | `code`              | When                                              |
| ------ | ------------------- | ------------------------------------------------- |
| 400    | `INVALID_GAME_ID`   | `id` is not a positive integer                    |
| 401    | `UNAUTHENTICATED`   | No signed-in user                                 |
| 404    | `GAME_NOT_FOUND`    |                                                   |
| 409    | `GAME_FULL`         | No spots left, including losing a race for the last spot |
| 409    | `GAME_NOT_JOINABLE` | Cancelled, finished, live, or already started     |
| 409    | `ALREADY_JOINED`    | This user already holds a spot                    |

### Concurrency

The spot is claimed with a single conditional `UPDATE … WHERE available_players > 0` inside a transaction (`lib/join-game.ts`). Postgres re-checks the condition after the row lock is released, so when two requests race for the last spot, exactly one succeeds and the other gets `409 GAME_FULL`. This holds across any number of app instances. A unique `(game, user)` index on `game-participants` prevents double joins, and a rejected join rolls the decrement back.

Every attempt, successful or not, is written to the `join-attempts` collection (outcome, game, user, IP), which admins can read in the Payload admin.

## Images

Uploads to `media` are resized to `thumbnail` (480×270) and `full` (≤1600 wide) WebP renditions. Render them with `next/image`, which also serves AVIF to browsers that accept it. Set `MEDIA_BASE_URL` (e.g. a CloudFront distribution in front of the app, or later an S3 bucket via `@payloadcms/storage-s3`) to have the API return CDN URLs. Games without an uploaded cover fall back to `image`, then to the sport's default image. `coverImage.fallbackUrl` is always the sport default, for use in an `onError` handler.
