# Nino's Collectibles — owner admin (preview build)

Private, owner-only area at `/admin`. Built on the existing Nuxt 4 / Nitro / Tailwind site. Nothing here is deployed; this document records what was built, what was reused, and what is still needed from Nino.

## Status

Ready for a preview trial once Nick sets four things in Vercel (below). Not pushed or deployed. Verified locally against a real Redis server and a mock of Square's OAuth API; never connected to a real Square account. Nino's real inventory, prices, sales, schedule and account settings were not entered anywhere.

## What Nick configures in Vercel (project `niko`)

The project currently has **no environment variables**. The team has a Redis marketplace integration installed, but it is **not connected to this project**.

| Setting | How | Needed for |
| --- | --- | --- |
| `REDIS_URL` | Vercel → project `niko` → Storage → connect a Redis (or Upstash) database. Vercel adds the variable. Pick a free plan if offered; don't buy anything without deciding to. | Everything. Without it the admin stays locked on Vercel. |
| `NUXT_SESSION_SECRET` | 32+ random characters (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). | Session cookies and sealing Square tokens. |
| `NUXT_ADMIN_SETUP_CODE` | 12+ random characters (`node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))"`). Send to Nino privately. | Nino creating his account. |
| `NUXT_SQUARE_APP_ID`, `NUXT_SQUARE_APP_SECRET`, `NUXT_SQUARE_ENV` | Create an application at developer.squareup.com (free). Use its **Sandbox** credentials and `sandbox` first. On the app's OAuth page add the redirect URL `https://<preview host>/api/admin/auth/square/callback`. | Connect Square (optional). |

Scope each variable to **Preview** first. Add the Production values only when the admin is approved for the live site.

## How to run it locally

```bash
npm install
NUXT_ADMIN_DEMO=1 npm run dev          # demo: in-memory SAMPLE data, password demo-nino
# real flow on local disk:
NUXT_SESSION_SECRET=<32+ chars> NUXT_ADMIN_SETUP_CODE=<12+ chars> npm run dev
# real flow on Redis:
REDIS_URL=redis://127.0.0.1:6379 NUXT_SESSION_SECRET=… NUXT_ADMIN_SETUP_CODE=… npm run dev
```

Open `/admin`. Variables are listed in `.env.example`.

## What is in it

| Area | Route | Notes |
| --- | --- | --- |
| Dashboard | `/admin` | Show-day actions first (Scan, Add listing, Change quantity / mark sold, Update event), then counts (listed, drafts, low stock, upcoming events), low-stock list, recent edits, connection status. |
| Inventory | `/admin/inventory` | Search, filters (All / Listed / Drafts / Hidden / Low stock / Sold / Trash), per-row quantity −/+, Mark sold, Hide/List, multi-select bulk actions with a confirmation dialog. Trash is reversible. |
| Card form | `/admin/inventory/new`, `/admin/inventory/:id` | Photos (camera or library), title, game, set, card number, rarity, condition, raw/graded with grader, grade and cert, price, quantity, availability, description, private notes. Only the title is required to save; listing needs a price. Earlier versions of each card can be restored. |
| Scan | `/admin/scan` | Phone camera via `<input capture="environment">`. Each scan creates a draft with the photos and nothing else decided. |
| Events | `/admin/events`, `/admin/events/:id` | Individual events (name, date, last day, hours, venue, city, state, link, notes, show-on-site). Read-only list of what OnTreasure currently shows, with "Add here" pre-filling from the OnTreasure record. No recurring schedule is assumed. |
| Instagram | `/admin/instagram` | Sync status (manual import, import date, live sync not set up) and feature/hide per imported post. |
| Square | `/admin/square` | Connection status, Preview sync, per-field conflict resolution with "remember who owns this field", explicit tick-boxes for imports and pushes, confirmation before apply. |
| Settings | `/admin/settings` | Public copy (hero, feed, about, contact lines), featured cards (listed cards only, ordered), Instagram/OnTreasure links, public email/phone, low-stock number. |

The public homepage reads `/api/site`: featured cards get their own "Cards on the table" section (only when at least one is featured), hidden Instagram posts drop out of the feed, owner-added published events join the OnTreasure list, and copy fields override the built-in text only when filled in. With an empty store the homepage renders exactly as before.

## Access control

- **First visit.** With no owner account, `/admin/login` shows "Set up your admin": the setup code, then the email and password Nino chooses. The password is stored only as an scrypt hash. Setup is closed when `NUXT_ADMIN_SETUP_CODE` is missing or shorter than 12 characters, and refuses everything (409) once the account exists, so the code works once. Wrong codes are limited to 5 per address per 15 minutes and 20 site-wide per hour.
- **After setup, only the owner can sign in**: his email + password, or Sign in with Square once he has connected Square. Another email, another password or another Square account is refused.
- **Sessions** are h3 sealed cookies (HTTP-only, SameSite Lax, Secure, 12 hours). Each carries the owner id and a session version that the server re-checks on every request. Changing the password signs out every other device; resetting the owner account invalidates all old cookies.
- `server/middleware/admin-guard.ts` runs before every `/admin` and `/api/admin` request: no session gives 401 for the API (sign-in routes excepted) and a redirect to `/admin/login` for pages. Mutations must be same-origin. Responses are `no-store` and `noindex`.
- Signed-out visitors learn only which step is open (setup, sign in, or "not ready" with the reason). Owner email, Square link and storage details are returned only to the signed-in owner. No response ever contains the password hash or a Square token.
- **Recovery** if Nino forgets his password: Nick deletes the key `ninos:admin:owner` in the Redis database, sets a new `NUXT_ADMIN_SETUP_CODE`, redeploys, and Nino runs setup again. Inventory, photos and settings are untouched; Square needs reconnecting.

## Storage

`server/plugins/admin-storage.ts` mounts one store that every admin read and write goes through:

| Situation | Backend | Notes |
| --- | --- | --- |
| `REDIS_URL` (or `KV_URL`) set | Redis via ioredis, keys under `ninos:admin:` | Durable and shared by every Vercel function instance. Owner account, inventory, photos, events, settings, revisions, activity, rate limits and the sealed Square tokens all live here. |
| On Vercel without Redis | none | Admin locked with a message naming what is missing. Public site unaffected. |
| Local, no Redis | `.data/admin` on disk | Development only. |
| Demo mode | memory | SAMPLE data only, wiped on restart, never reads or writes Redis, never contacts Square. Ignored on the production deployment. |

Photos are resized on the phone (1600 px, JPEG) before upload and capped at 4 MB on the server, so they fit comfortably in a free Redis plan. A large catalogue should move photos to Vercel Blob later; nothing else changes.

## What came from which source

**Infinite Heroes** (Next.js + Supabase admin, source available and read):
- `requireAdmin()` server-side gate that redirects to sign-in → the Nitro guard + `requireOwner()`.
- Protected admin layout with section navigation and a sign-out form → `app/layouts/admin.vue`.
- `ActionForm` status notice (saved / error) and `DeleteForm` confirm step → toasts + `AdminConfirm` dialog.
- Dashboard count cards linking to sections.
- `saveRevision` before each settings overwrite → revisions for products, events and settings.
- Media upload rules (allowed image types, 10 MB cap) → `/api/admin/uploads`, minus the Vercel Blob dependency.
- Events admin: one event per record with a published checkbox. Its weekly-recurrence option was deliberately not carried over.
- Site settings as a key/value form with social links and contact details.

**Harris in Wonderland** (TanStack Start + Square, source available and read):
- Admin dashboard metric tiles with "live vs fallback" and fetched-at honesty → connection status panels and the `source: 'demo' | 'square'` marker on every Square preview.
- Product shape (name, price, sold-out, stock, image, categories) → the Square preview rows.
- Its catalog loader reads Square Online's undocumented storefront editor endpoint (`/app/store/api/v28/editor/...`). That was **not** reused; the brief rules out undocumented endpoints. This build calls only the official Square Catalog and Inventory APIs.
- Its role-based permissions (owner/manager/staff) were not reused: this site has one owner.

**Forge card-scanner project: not available.** The accessible Forge repositories (`ForgeCT`, `Forge`, `MorphForge`) and `card-shop-inventory-management-` contain no camera, OCR or scanning code. Rather than invent one, the Scan page uses the phone's camera through a file input and creates a draft with the photos. Card recognition (reading the name/set/number from the photo) is not included; the page says so.

## Square

- **Connect from the admin.** On Square → Connect Square, Nino is sent to Square's own sign-in and approval page. His Square password never touches this site. Square sends him back with a one-time code; the server exchanges it using the app secret, reads his business name, owner email and main location, and stores the access and refresh tokens sealed with AES-256-GCM under a key derived from `NUXT_SESSION_SECRET`. That key lives only in the environment, never in Redis, so the database alone does not reveal the tokens. Tokens refresh automatically within a week of expiry. No token ever reaches the browser.
- **Sign in with Square** appears on the login page only after he has connected Square, and accepts only that merchant.
- **One Square account at a time.** Connecting a different account while one is linked is refused ("disconnect first"); tokens from any refused attempt are revoked at Square immediately.
- **Disconnect** revokes the app's access at Square, deletes the stored tokens and unlinks the merchant. Email + password keep working; cards keep their Square item ids.
- **Sync** (preview, per-field conflicts, confirm before apply, no deletes, no duplicates) runs only on that OAuth connection, through the official Catalog and Inventory APIs. There is no pasted-token path.
- **Demo mode** uses a labelled SAMPLE Square account and catalog and makes no network calls to Square.

## Instagram

- The site feed is a manual import of public posts (`app/data/media.ts`, imported 2026-10-10). The admin shows exactly that: source, import date, "live sync: not set up". No password is requested, no cookies are stored, nothing claims to be current.
- Feature/hide controls act on the imported posts and update the homepage.
- A live feed needs the Instagram Graph API on a Meta app Nino approves, with the token kept in server env. Not built.

## Needs Nino's approval or credentials

1. Nick: the four Vercel settings above (Redis connection, session secret, setup code, Square sandbox app).
2. Nino: his own email and password at first setup, and approving the Square connection on Square's page. Nobody else needs either.
3. Nino: moving Square from sandbox to his real account is his decision; it needs the app's Production credentials and `NUXT_SQUARE_ENV=production`.
4. Public copy, featured cards and events: entered by Nino, nothing pre-filled.
5. Whether the admin goes live on the production domain at all.

## Verification performed

- `npm run typecheck`, `npm run build`, `NITRO_PRESET=vercel npm run build` (ioredis bundled in the function), `npm test` (27 unit tests).
- End-to-end against a real Redis (append-only persistence) and a local mock of Square's OAuth, merchant, team-member, location, catalog, inventory and revoke endpoints: 71 checks covering locked states (Vercel without Redis, missing setup code), setup with missing, wrong, right and reused codes, owner-only sign-in, forged cookies and cross-site posts, Square connect, sign-in, wrong-merchant refusal with immediate revoke, disconnect and reconnect, survival of session, owner, cards, photo bytes, settings and the sealed Square connection across an app restart and an app + Redis restart, password change signing out other sessions, shared rate limits, and demo mode writing nothing to Redis and calling nothing at Square.
- Playwright at 390 px: setup with a wrong then right code, dashboard storage card, Connect Square round trip and toast, Disconnect dialog, Settings owner panel, Sign in with Square, email + password sign-in, no horizontal overflow on any admin page, no hydration warnings. Demo-mode admin regression and the public homepage audit (1440/768/390/320) still pass.
