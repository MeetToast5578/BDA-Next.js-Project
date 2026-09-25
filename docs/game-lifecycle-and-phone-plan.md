# Leaving games, past games, and the remembered phone number: plan

> **Status: built.** All five phases are done, with the decisions in §6 as suggested and the leave
> cut-off at the start time. They were verified on a production build (`next build && next start`)
> as well as `next dev`. Where the build departs from the plan, §5 says so under the task. The one
> open item is a native speaker's read of the new Azerbaijani strings.

Three requests, checked against the code as it is on `main` after PR #7:

1. **Leave a game after joining, but only before it starts.** Mostly **already built** in PR #7 (§1).
   A few edges are left.
2. **Games whose start time has passed should become past games, with a place to browse them.** Only
   partly there. The profile's "Keçmiş" tab exists, but games never actually finish, and there is no
   public list of past games (§2, §3).
3. **The create form's phone field should fill itself with the number the person used last, which
   now means the one in their profile.** The form does read the profile phone, but two things break
   it (§4):
   - a bug keeps showing the *old* number after the profile changes;
   - a number typed into the form is never remembered.

"Due date" below means the game's start time (`scheduledAt`), which is what the code already uses.

---

## 1. Leaving a game: what exists, what's left

**Already built** (PR #7):
- "Oyundan çıx" on the game page, for a player who joined, while the game is `open` or `full`.
- It confirms first, then `POST /api/v1/games/{id}/leave` hands the spot back and the page returns
  to its join state.
- The server enforces the rule, whatever the page shows: `releaseSpot` refuses once
  `scheduled_at <= now()` or the game isn't `scheduled` (409 `GAME_STARTED`). The host can't leave
  their own game (they delete it), and leaving twice can't invent spots.

**Left:**
- After kick-off a joined player just loses the button, with no explanation. Show "Oyun başlayıb —
  artıq çıxmaq mümkün deyil" instead (T4.1).
- The profile's "Qoşulduğum · Qarşıdakı" cards only link to the game. Leaving could be offered there
  too (T4.2, optional).
- **Decision:** the cut-off is exactly the start time today. If players should have to stay committed
  from, say, 2 hours before, that is one constant used by `releaseSpot` and the page (T4.3).

---

## 2. Game lifecycle: started games become past games

### What happens today
- A game's status is worked out on every read (`deriveAvailability`). Once the start time passes it
  becomes `closed`, and the game page shows "Qeydiyyat bağlıdır" (registration closed)… forever.
  Nothing ever sets `finished`: only the seed script and admins write that.
- Past games vanish from the home page and `/games`, which is right.
- Past games still show up under the profile's "Keçmiş" tab, which is also right.
- **Bug:** `PATCH /api/v1/games/{id}` never checks whether the game has started. A host can open
  `/games/{id}/edit` on last week's game, move it into the future and revive it, participants and
  all. The game page still offers "Oyunu redaktə et" on past games.

### Proposal
- **Status follows the clock, with no background job.** Keep working status out on read (no cron to
  run or monitor), but replace `closed` with:
  - `live` from the start time until start + the sport's usual length, shown as "Oyun davam edir";
  - `finished` after that, shown as "Oyun keçirilib".

  The length lives in `SPORT_META`, proposed as football 90, basketball 60, tennis 90 minutes. A
  cancelled game stays `cancelled`, and a status an admin sets in `/admin` still wins.
- **Started games are frozen.** Edit refuses with 409 `GAME_STARTED`, the edit page sends the host
  back to the game, and the edit button disappears.
  - **Decision:** should a host still be able to *delete* a game that has happened? That erases it
    from every participant's history and stats. I'd refuse it after the start (admins can still
    delete in `/admin`).
- **The game page's past state:**

```
aside, once the game has started
┌─ HOST ─────────────────────────────┐
│ (EA) Elvin Abbasov                 │   unchanged; the phone stays visible to those who played
└────────────────────────────────────┘
┌────────────────────────────────────┐
│  ✓ Oyun keçirilib · Baz, 13 Sen    │   JoinPanel's grey state pill ("Bu oyunun hostu sizsiniz")
└────────────────────────────────────┘
  Siz bu oyunda iştirak etdiniz          only for players who were in it
                                         no join, leave or edit buttons
```

---

## 3. Past games catalog

`/games` gets the same "Qarşıdakı | Keçmiş" segmented control the profile uses. `?when=past` lists
games that have already started, most recent first, with the same sport tabs and grid. This is one
page with one pattern, so "Bütün oyunlar" and "Mənim oyunlarım" behave alike.

```
← Ana səhifəyə qayıt
Keçmiş oyunlar                                            h1 · swaps with "Bütün açıq oyunlar"
Aktiv filtr: Bütün idman növləri • Bakı
[ Qarşıdakı | Keçmiş ]                                    segmented, 40px (profile's control)
┌ ⚽ Futbol ──────┐ ┌ 🎾 Tennis ──────┐ ┌ 🏀 Basketbol ───┐
│ 42 keçmiş oyun │ │ 7 keçmiş oyun  │ │ 9 keçmiş oyun  │   counts switch with the view
└────────────────┘ └────────────────┘ └────────────────┘
┌ card · past ┐ ┌ card · past ┐ ┌ card · past ┐            "Keçmiş oyun", no "yer qalıb"
                  [ Daha çox ]
```

- **API:** `GET /api/v1/games?when=past` (`when=upcoming` stays the default). No lower time limit;
  it's paged. Cancelled games are left out, since the public list is games that happened; they stay
  in each person's own history. It's cached like the upcoming list: games tag, the time rounded to
  the minute.
- **Empty:** "Hələ keçirilmiş oyun yoxdur" with "Açıq oyunlara bax".
- **Decision:** all past games, or only the last N days? I'd show them all; paging keeps it cheap.

---

## 4. The phone number follows the profile

### What happens today
- The create form starts from `game?.host.phone ?? user.phoneNumber`, and join step 1 from
  `user.phoneNumber`. So the profile *is* the source.
- **Bug, confirmed in the browser against a production build:** save a number on `/profile`, then
  click "Oyun yarat", and the form is still empty. Only a full reload shows the number.
  - The cause: `getCurrentUser()` is `use cache: private`, cached in the browser for five minutes,
    and the profile save only refreshes `/profile` itself.
  - In `next dev` it is worse: the same stale user came back from the server for the same session
    cookie, even after a reload.
  - The header chip has the same staleness on every page except `/profile`.
- A number typed into the create or join form is never saved anywhere but that game. Someone without
  a profile phone retypes it every time.

### Proposal
- **Expire the cached session whenever the profile changes.**
  - Tag the private session read with the user id (`cacheTag` inside `getCurrentUser`, once the user
    is known).
  - Add a small Server Action that re-reads the session and calls `updateTag` on that tag, which is
    what the Next docs prescribe (`authentication-with-cache-components.md`, step 5).
  - Call it after every profile change: the edit modal, and the phone saves below.
  - To verify on a production build: save a number, click "Oyun yarat", and it's there.
  - Fallback if `updateTag` doesn't reach the browser's private cache: `revalidatePath('/', 'layout')`
    in the same action, which the docs say purges the client cache.
- **Remember the number used.** When a game is created or joined with a number and the profile has
  none, the server saves it to the profile.
  - This is best effort. Phone numbers are unique across accounts, so a number another account
    holds is simply not saved, and it never fails the create or join.
  - The response says `savedToProfile`, and the form says so.
- **A different number from the profile's:** a "Bu nömrəni profilimdə saxla" checkbox appears under
  the field only when the typed number is valid and differs from the profile. Unchecked by default,
  since a host may give a friend's number for one game.
  - **Decision:** or always overwrite with the last number used, which is the literal ask.
- **Say where the number comes from:**

```
Host telefon nömrəsi
[ +994 │ 50 210 34 56                ]
Profilinizdəki nömrə · Profildə dəyiş            prefilled from the profile (link to /profile)

— the profile has no number —
Bu nömrə profilinizə əlavə olunacaq, növbəti dəfə avtomatik doldurulacaq.

— typed a different, valid number —
[ ] Bu nömrəni profilimdə saxla
```

The join modal's phone field gets the same three states.

---

## 5. Tasks

One phase per commit. Phase 1 first: it fixes a bug that affects people today, and it is the
request with the most visible effect.

### Phase 1: The phone number follows the profile

- [x] **T1.1 Expire the cached session on profile changes.**
      - `lib/session.ts`: add `cacheTag(sessionTag(user.id))` in `getCurrentUser`.
      - New `app/(frontend)/profile/actions.ts` → `expireSession()`: re-reads the session, then
        calls `updateTag`.
      - Call it from `EditProfile` after a successful save, before `router.refresh()`.
      - Verify with `next build && next start`: save a number, go to "Oyun yarat" by client-side
        navigation, and the field is filled. Also check that the header chip on another page shows a
        new name. Use the `revalidatePath` fallback if needed.

      *As built:*
      - `expireSession()` lives in `lib/session-actions.ts`, since create and join call it too. It
        replaces `router.refresh()`, because a Server Action's `updateTag` already re-renders the
        page.
      - Tracing the production build showed a second cause. The navigation did fetch the new user,
        but React's `<Activity>` keeps a visited page mounted, so the old form state (the empty
        field) came back with it. `GameForm` and `JoinPanel` are now keyed on the profile's phone
        number, which is the fix the Next docs give for this.
      - `updateTag` stays, for `next dev` (which cached the stale user on the server) and the header
        chip. The `revalidatePath` fallback wasn't needed.
- [x] **T1.2 `rememberPhone(userId, phone, { overwrite })`** in `lib/profile-queries.ts`.
      - Saves the number when the profile has none, or when `overwrite` is set.
      - Skips when another account holds it, reusing `updateMyProfile`'s uniqueness check.
      - Returns whether it saved, and never throws into the caller.
- [x] **T1.3 Create and join remember the number.** `POST /api/v1/games` and
      `POST /api/v1/games/{id}/join`:
      - after success, call `rememberPhone`;
      - accept `saveToProfile: true` for the overwrite case;
      - return `savedToProfile`.

      Both clients call `expireSession()` when it's `true`.
- [x] **T1.4 Field hints and checkbox** in `GameForm` and `JoinPanel`, per §4. It lives in the
      shared `PhoneInput` area, so both forms get it from one place. The profile number is passed
      in; the component works out which of the three states applies.

      *As built:* the state is worked out by `phoneSource()` in `lib/profile-form.ts`, so it can be
      unit-tested. `components/ui/PhoneProfileNote.tsx` renders it under either form's field, and
      `PhoneInput` is unchanged.
- [x] **T1.5 Tests.**
      - Database: `rememberPhone` fills an empty profile, leaves a set one alone unless asked, and
        skips a number another account holds; create and join save only when they should.
      - Unit: the three hint states.
      - Browser, on a production build: the flow above, plus "create a game with a new number, then
        open 'Oyun yarat' again and it's filled".

      *As built:* the database tests cover `rememberPhone` itself. The browser pass covered when
      create and join save, including the create API's `savedToProfile`.
- [x] **T1.6 Docs:** `saveToProfile` / `savedToProfile` in `docs/api.md` (create and join).

### Phase 2: Game lifecycle

- [x] **T2.1 Status follows the clock.** `deriveAvailability`: `closed` becomes `live` / `finished`,
      using a new `SPORT_META[sport].durationMinutes`.
      - Update `STATUS_LABELS`, the `closed` filter in `findGames` (keep only `open` / `full`), the
        `AvailabilityStatus` type, `docs/api.md`'s status table, and the tests that expect `closed`.
- [x] **T2.2 Freeze started games.**
      - `PATCH /api/v1/games/{id}` answers 409 `GAME_STARTED` once the game has started or isn't
        `scheduled`.
      - The edit page redirects to the game, the game page hides "Oyunu redaktə et", and
        `GameForm`'s error table gets `GAME_STARTED`.
      - Database test: a past game can't be moved into the future.

      *As built:* the edit refusal applies to admins too, so an admin who needs to change a played
      game does it in `/admin`. `tests/game-freeze.test.ts` calls the route handlers with real
      sessions; its tests fail against the old route.
- [x] **T2.3 Delete after start** (per the decision): `DELETE /api/v1/games/{id}` refuses once the
      game has started (admins unaffected). The danger zone isn't reachable anyway, since the edit
      page redirects.
- [x] **T2.4 The game page's past state** in `JoinPanel`: the "Oyun keçirilib · {date}" or "Oyun
      davam edir" pill replaces the disabled button, plus "Siz bu oyunda iştirak etdiniz" for players
      who were in it.

### Phase 3: Past games catalog

- [x] **T3.1 API.** `parseGameListParams` gains `when` (`upcoming` default, `past`).
      - `findGames` gets a past branch: started, not cancelled, newest first, time rounded like
        today's.
      - `getOpenGamesCountBySport` gets a past counterpart for the tabs.
      - Unit tests for the parser; a database test for ordering and the cancelled exclusion.

      *As built:* the past queries are `use cache` functions, and `next/cache` throws outside Next,
      so Vitest can't call them. Instead, the ordering, the cancelled exclusion, the sport filter and
      the paging were checked against the database through the API on a running server.
- [x] **T3.2 Shared segmented control.** Pull the profile's "Qarşıdakı | Keçmiş" out into
      `components/ui/SegmentedLinks.tsx` (links, optimistic, `data-pending`), and use it on both pages.
- [x] **T3.3 `/games?when=past`.**
      - `GamesSection` takes `when`: title, tab counts ("N keçmiş oyun"), card context `past`, the
        empty state, and `GamesGrid`'s query.
      - The skeleton follows.
      - `when` is kept when switching sport, and the sport when switching `when`.

      *As built:* the page is its own route, `/games/past`, rather than a query on `/games`. That
      gives it its own title, metadata and prerendered shell. The API still takes `when=past`, and
      "Oyunların vaxtı" (Qarşıdakı | Keçmiş) switches between the two routes, keeping the sport.
- [x] **T3.4 Docs:** `GET /api/v1/games` `when=past` in `docs/api.md`; README routes.

### Phase 4: Leaving: the remaining edges

- [x] **T4.1 Explain the missing button.** For a joined player after kick-off, show "Oyun başlayıb —
      artıq çıxmaq mümkün deyil" under "Siz bu oyuna qoşulmusunuz" until the game is `finished`, when
      T2.4's state takes over.

      *As built:* this is part of T2.4's `live` state: "Oyun davam edir", then "Siz bu oyundasınız.
      Oyun başladığı üçün artıq ondan çıxmaq mümkün deyil."
- [x] **T4.2 Leave from the profile** *(optional)*. On "Qoşulduğum · Qarşıdakı" cards, a secondary
      "Çıx" beside "Oyuna bax" opens the same confirm (`LeaveGame`, reused). On success the card
      leaves the list and the count updates.

      *As built:* "Oyundan çıx" *replaces* "Oyuna bax" on those cards, because the card's title and
      image already open the game. It only shows before kick-off. A card for a game that has started
      goes back to "Oyuna bax".
- [ ] ~~**T4.3 Cut-off** *(only if a buffer is wanted)*. Add `LEAVE_CUTOFF_MINUTES` in
      `lib/game-backend.ts`, used by `releaseSpot`'s SQL (`scheduled_at > now() + interval`) and by
      the page's button. Database test at the boundary.~~

      *Not needed:* decision 4 keeps the cut-off at the start time, which `releaseSpot` already
      enforces.

### Phase 5: Verification
- [x] typecheck, lint, all tests against a real Postgres, `npm run build`.
- [x] Browser pass on a production build (`next start`), not only `next dev`: the phone bug only
      shows its real behaviour there.
- [ ] A native speaker reads the new Azerbaijani strings.

## 6. Decisions

All five went as suggested; for 4, the latest time to leave is right before the game starts.

| # | Question | Decided |
| --- | --- | --- |
| 1 | The typed number differs from the profile's | Checkbox "Bu nömrəni profilimdə saxla", unchecked. Alternative: always overwrite with the last used |
| 2 | When does a game count as over | Start + the sport's usual length (90 / 60 / 90 min). A per-game length would need a new field and a migration |
| 3 | May a host delete a game that already happened | No; admins still can |
| 4 | Leave cut-off | At the start time, as now |
| 5 | Past catalog | All past games, paged; cancelled ones left out |
