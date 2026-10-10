# Nino's Collectibles — owner admin (preview build)

Private, owner-only area at `/admin`. Built on the existing Nuxt 4 / Nitro / Tailwind site. Nothing here is deployed. Start with **Preview setup** below.

## Status

Ready for Nick to configure on a Vercel **Preview**, so Nino can create his login and connect his live Square store on first use. Not pushed or deployed. Verified locally against a real Redis server and a mock of Square's OAuth API (`npm run test:e2e`). It has **not** been connected to a real Square account; that can only happen when Nick has set up the Square app and Nino approves access on the Preview site.

## Preview setup (Nick)

The Vercel project `niko` currently has **no environment variables**, and the team's Redis integration is **not connected to it**. Nothing below costs money unless a paid plan is chosen.

### 1. Put the code on a Preview branch (not production)

Pushing `claude/tender-thompson-wb8jwv` deploys production. Push the same commits to a separate branch instead:

```bash
git push origin claude/tender-thompson-wb8jwv:admin-preview
```

Vercel builds it as a Preview. Its stable branch URL follows Vercel's pattern and should be:

`https://niko-git-admin-preview-nickhsousa96-8307s-projects.vercel.app`

Confirm the exact host on the deployment page in Vercel (Domains). Use that one host everywhere below.

### 2. Connect durable storage

Vercel → project `niko` → **Storage** → connect a Redis database (Redis or Upstash, free plan) to the **Preview** environment. Vercel adds `REDIS_URL`. Without it the admin stays locked ("Durable storage is not connected").

### 3. Create the Square application (Production credentials)

At developer.squareup.com → create an application → set the mode to **Production** → **OAuth**:

- Copy the **Production Application ID** and **Production Application Secret**.
- Add this **Redirect URL**, exactly (Square requires an exact match and HTTPS):

  `https://<preview host from step 1>/api/admin/auth/square/callback`

### 4. Add the Preview environment variables

Vercel → project `niko` → Settings → Environment Variables → scope **Preview** (or only the `admin-preview` branch):

| Variable | Value |
| --- | --- |
| `REDIS_URL` | Added by step 2. |
| `NUXT_SESSION_SECRET` | 32+ random characters: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NUXT_ADMIN_SETUP_CODE` | 12+ random characters: `node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))"` |
| `NUXT_SQUARE_APP_ID` | Production Application ID from step 3 |
| `NUXT_SQUARE_APP_SECRET` | Production Application Secret from step 3 |
| `NUXT_SQUARE_ENV` | `production` |
| `NUXT_SQUARE_REDIRECT_URL` | `https://<preview host>/api/admin/auth/square/callback` (same as step 3) |

Do **not** set `NUXT_ADMIN_DEMO` on this Preview. Then redeploy the Preview so it picks up the variables.

### 5. Check it before sending Nino the link

Open `https://<preview host>/admin/login`. Until Nino's account exists, the page shows **Setup check (for Nick)**: every line should be ✓, and the Redirect URL it prints must be the one registered on the Square app. It lists setting names only, never values, and disappears once Nino's account exists.

### 6. Let Nino reach the Preview

Preview URLs are behind Vercel Authentication. Send Nino a **Share** link for the Preview (Vercel → the deployment → Share) and check it opens the branch host from step 1. The admin redirects any other host to that one, because Square only returns to the registered URL.

### 7. Send Nino two things, separately

The Preview link, and the setup code. Nothing else.

## What Nino does at first sign-in

1. Open the Preview link, then `/admin`.
2. Enter the setup code, then choose his own email and password (12+ characters). Nobody else sees them.
3. Go to **Square → Connect Square**. Square's own page opens; he signs in there and approves access. His Square password never touches this site.
4. He lands back on the Square page with "Square connected" and his store's name. From then on he can sign in with email + password or with **Sign in with Square**.

## Sandbox testing (optional, kept separate)

Sandbox is for Nick to rehearse with Square's test accounts. Keep it away from Nino's Preview, because whoever completes setup first on a site becomes its owner:

- Run locally (`npm run dev`) with the app's **Sandbox** credentials, `NUXT_SQUARE_ENV=sandbox`, a local or separate Redis, and the redirect URL `http://localhost:3000/api/admin/auth/square/callback` registered under the app's **Sandbox** OAuth settings; or use a second Preview branch connected to a **different** Redis database.
- Sandbox and Production use different credentials and hosts. A Sandbox application ID with `NUXT_SQUARE_ENV=production` is refused. A merchant linked in Sandbox is never treated as linked in Production, so a rehearsal can't block Nino's real store.

## How to run it locally

```bash
npm install
NUXT_ADMIN_DEMO=1 npm run dev          # demo: in-memory SAMPLE data, password demo-nino
NUXT_SESSION_SECRET=<32+ chars> NUXT_ADMIN_SETUP_CODE=<12+ chars> npm run dev   # real flow, local disk
npm test                               # unit tests
npm run build && npm run test:e2e      # end-to-end; needs redis-server on PATH, uses fake credentials only
```

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
| On Vercel with Redis but no `NUXT_SESSION_SECRET` | Redis | Admin locked: the cookie and token key must come from the environment on Vercel. |
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

- **Connect from the admin.** Square → Connect Square sends Nino to Square's own sign-in and approval page (`connect.squareup.com/oauth2/authorize` in Production, `connect.squareupsandbox.com/oauth2/authorize` in Sandbox) with the app ID, the scopes below, a random state kept in his sealed session cookie, and the registered Redirect URL. His Square password never touches this site.
- **Callback.** Square returns to `/api/admin/auth/square/callback`. The server checks the state, exchanges the one-time code using the app secret, reads his business name, owner email and main location, and stores the access and refresh tokens sealed with AES-256-GCM under a key derived from `NUXT_SESSION_SECRET`. That key lives only in Vercel's environment, never in Redis. No token reaches the browser. Tokens refresh automatically within a week of expiry.
- **Binding.** The first merchant he authorizes in the configured environment is bound to his owner account. Connecting a different merchant is refused until he disconnects; tokens from a refused attempt are revoked at Square immediately. **Sign in with Square** then accepts only that merchant.
- **Disconnect** revokes the app's access at Square, deletes the stored tokens and unlinks the merchant. Email + password keep working; cards keep their Square item ids.
- **Scopes:** `MERCHANT_PROFILE_READ`, `EMPLOYEES_READ` (owner email), `ITEMS_READ`, `ITEMS_WRITE`, `INVENTORY_READ`, `INVENTORY_WRITE`.
- **Admin address.** The admin lives on the host of `NUXT_SQUARE_REDIRECT_URL`; `/admin` on any other host redirects there. Production uses `https://admin.ninoscollectibles.com/api/admin/auth/square/callback`, so the admin is `admin.ninoscollectibles.com`, whose root opens the admin. The same URL must be the Redirect URL in the Square app (OAuth, Production).
- **Environment.** `NUXT_SQUARE_ENV` must be `production` or `sandbox`; there is no default. Connections and merchant links are tagged with their environment. The test-only host overrides (`NUXT_SQUARE_API_ORIGIN`, `NUXT_SQUARE_AUTHORIZE_URL`) are ignored on Vercel.
- **Sync** (preview, per-field conflicts, confirm before apply, no deletes, no duplicates) runs only on that OAuth connection through the official Catalog and Inventory APIs.
- **Demo mode** uses a labelled SAMPLE Square account and catalog and makes no network calls to Square.
- **Homepage feed.** Once Square is connected, the homepage "From the feed" section (`#feed`, linked from the hero) lists Nino's Square items, newest first, through `/api/feed`. Shown: named, unarchived items sold at the connected location that aren't marked sold out and are in stock (or don't track stock). Name, description, price, stock count and the first item image come straight from Square; an item with no price shows "Ask". Square ids and tokens never leave the server. One Square read is shared by all visitors for 5 minutes (stored as `public:feed`). If Square errors, the last good read is shown for up to a day. With no connection, or nothing in stock, the section shows the Instagram posts as before; with stock, the latest five Instagram posts sit below it.
- Tracked items with no in-stock count at the connected location now read as quantity 0 (previously "unknown"), in sync previews as well.

## Instagram

- The Instagram posts are a manual import of public posts (`app/data/media.ts`, imported 2026-10-10). The admin shows exactly that: source, import date, "live sync: not set up". No password is requested, no cookies are stored, nothing claims to be current.
- Feature/hide controls act on the imported posts and update the homepage.
- A live feed needs the Instagram Graph API on a Meta app Nino approves, with the token kept in server env. Not built.

## Needs Nino's approval or credentials

1. Nick: the Preview setup above (Redis, three secrets, Square Production app with the exact Redirect URL).
2. Nino: his own email and password at first setup, and approving access on Square's page. Nobody else needs either.
3. Public copy, featured cards and events: entered by Nino, nothing pre-filled.
4. Whether the admin goes live on the production domain at all (that needs the same variables scoped to Production, with the production host in the Redirect URL).

## Verification performed

What the checks prove, and what they can't:

- `npm test` (34 unit tests): password hashing; input validation; setup-code rules; Square access rules including per-environment binding; documented Production and Sandbox hosts; required `NUXT_SQUARE_ENV`; Sandbox-ID-on-Production refusal; Redirect URL rules on Vercel; test overrides ignored on Vercel; token sealing and tamper detection; storage selection; fail-closed configuration; demo ignored on production.
- `npm run test:e2e` (93 checks, real Redis with append-only persistence, mock Square): locked states; setup with missing, wrong, right and reused codes; owner-only sign-in; forged cookies and cross-site posts; Connect Square, Sign in with Square, wrong-merchant refusal with immediate revoke, disconnect, reconnect; survival of session, owner, cards, photo bytes, settings and the sealed Square connection across an app restart and an app + Redis restart; password change signing out other sessions; shared rate limits; Sandbox-to-Production switch binding Nino's real store; canonical-host redirects; a simulated Vercel Preview where every setup-check line is ✓, the authorize redirect goes to `connect.squareup.com` with the app ID, scopes, state and registered callback (not to the test override), and no value is exposed; demo mode ignored on production and isolated from Redis and Square.
- `NITRO_PRESET=vercel npm run build`: the Vercel function bundle includes ioredis and none of the test files.
- Playwright at 390 px: setup check, setup with wrong then right code, Connect/Disconnect Square, both sign-in methods, Settings owner panel, no overflow or hydration warnings; demo-mode admin regression and the public homepage audit still pass.
- **Not proven:** Square's real authorize and token endpoints, Square's acceptance of the registered Redirect URL, Vercel's Redis and Share-link behaviour. Those are verified only when Nino connects on the configured Preview.
