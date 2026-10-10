# Nino's Collectibles — owner admin (preview build)

Private, owner-only area at `/admin`. Built on the existing Nuxt 4 / Nitro / Tailwind site. Nothing here is deployed; this document records what was built, what was reused, and what is still needed from Nino.

## Status

Preview build, verified locally in demo mode (desktop 1440 and phone 390/320). Not published. Not connected to any real Square or Instagram account. Nino's real inventory, prices, sales, schedule and account settings were not entered anywhere; the only data in the preview is labelled SAMPLE.

## How to run it

```bash
npm install
NUXT_ADMIN_DEMO=1 npm run dev        # demo mode, password: demo-nino
# or, with a real owner password:
node scripts/admin-password.mjs      # prints NUXT_ADMIN_PASSWORD_HASH=...
NUXT_ADMIN_PASSWORD_HASH=... NUXT_SESSION_SECRET=<32+ random chars> npm run dev
```

Open `/admin`. Without a session you are redirected to `/admin/login` by the server. Variables are listed in `.env.example`.

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

- **First run, no pre-set password.** With no owner account yet, `/admin/login` shows "Create owner account": Nino enters his email and a password of his choosing (stored only as an scrypt hash, nobody else ever sees it) and is signed in. Alternatively he taps Sign in with Square and that Square account becomes the owner. Either way the first person through claims the account, so on a public URL set `NUXT_ADMIN_SETUP_CODE` and hand Nino the code; setup then requires it. Afterwards sign-in asks for the owner email and password, and Settings → Owner sign-in lets him change the password or link his Square account (a Square account links to a password owner only when its owner email matches, or when he is already signed in).
- **Session secret** comes from `NUXT_SESSION_SECRET`, or is generated on first start and kept in the admin store, so nothing has to be configured before the first sign-in.

- **Sign in with Square** (`server/utils/admin/squareAuth.ts`, routes under `server/api/admin/auth/square/`): official Square OAuth. The start route stores a random state in the sealed session cookie and redirects to Square; the callback checks the state, exchanges the code for tokens using the app secret (server only), reads the merchant (business name), the owner's email (Team Members API, `EMPLOYEES_READ`) and the main location, seals the tokens with AES-256-GCM under `NUXT_SESSION_SECRET`, stores them in the admin store, and signs the owner in. **The first Square account to complete this becomes the owner**: its merchant id and email are stored as the admin login. Later sign-ins must match that merchant id, and the email too when both sides know it. Anyone else gets "not the owner account". Needs `NUXT_SQUARE_APP_ID` and `NUXT_SQUARE_APP_SECRET`, and the callback URL registered in the Square developer dashboard.
- **Password sign-in** (`server/utils/admin/auth.ts`) remains as an alternative: the password is compared against an scrypt hash from `NUXT_ADMIN_PASSWORD_HASH`; the hash never reaches the browser.
- The session is an h3 sealed cookie: HTTP-only, SameSite=Lax, Secure outside dev, 12-hour lifetime, encrypted with `NUXT_SESSION_SECRET`.
- `server/middleware/admin-guard.ts` runs before every request: `/api/admin/*` without a session returns 401 (auth endpoints excepted); `/admin/*` pages redirect to `/admin/login` before any HTML renders. `app/middleware/admin.ts` repeats the check for in-app navigation by asking the server. All admin responses are `Cache-Control: no-store` and `X-Robots-Tag: noindex`.
- Mutations must be same-origin (Origin / Sec-Fetch-Site check); JSON only; 5 failed sign-ins per IP per 15 minutes.
- Bulk changes require `confirm: true` from the client after a dialog that states the count. Deletes are soft (Trash + Restore). Every overwrite keeps the previous version (10 per record), restorable from the card page.
- No admin data is bundled client-side; the public API returns listed cards and published events only (no notes, drafts, Square ids).

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

- Access comes from the OAuth grant made at sign-in (tokens sealed in the store, refreshed automatically within a week of expiry, revoked on Disconnect). A personal access token in `NUXT_SQUARE_ACCESS_TOKEN` still works as a self-hosted fallback. The location used for inventory counts is the merchant's main active location, read at connect time.
- Optional. Without a connection the Square page explains how to connect and everything else works.
- With a token: Preview lists (1) Square items not yet linked here, importable as drafts; (2) field-by-field differences on linked cards with both values shown; (3) listed cards that could be pushed. Apply performs only what was ticked and confirmed, matches by stored Square id (never by name guesses), upserts in place with idempotency keys, and never deletes on either side.
- In demo mode a labelled SAMPLE catalog stands in so the flow can be previewed; no real account is contacted.
- Needs from Nino before enabling: a Square developer access token for his account (sandbox first), the location id, and approval of what pushes mean for his Square Online storefront.

## Instagram

- The site feed is a manual import of public posts (`app/data/media.ts`, imported 2026-10-10). The admin shows exactly that: source, import date, "live sync: not set up". No password is requested, no cookies are stored, nothing claims to be current.
- Feature/hide controls act on the imported posts and update the homepage.
- A live feed needs the Instagram Graph API on a Meta app Nino approves, with the token kept in server env. Not built.

## Needs Nino's approval or credentials

1. Nothing for sign-in itself: Nino creates the owner account on his first visit. Recommended: `NUXT_ADMIN_SETUP_CODE` (give him the code) and `NUXT_SESSION_SECRET` on Vercel so sessions survive cold starts.
2. Durable storage before real inventory: the preview uses the filesystem (`server/plugins/admin-storage.ts`). Vercel's function filesystem does not persist between deployments or instances. Swap the driver for Vercel Blob/KV, Redis or S3 (one file change) and add its credentials.
3. A Square application (app id + secret, callback URL registered) so Nino can sign in and connect with his own Square login. Sandbox first.
4. Instagram Graph API app approval (optional).
5. Public copy, featured cards and events: entered by Nino, nothing pre-filled.
6. Whether the admin should go live on the production domain at all; it is currently unpublished.

## Verification performed

- `npm run typecheck`, `npm run build`, `npm test` (OnTreasure parser, password hashing, validators).
- Server checks with curl in demo mode: 401 on unauthenticated API, 302 on unauthenticated pages, 403 on cross-origin POST, 429 after 5 failed sign-ins, HTTP-only session cookie, listing without a price rejected, bulk without confirm rejected, trash/restore, upload type sniffing (text file rejected), Square preview/apply with no duplicate on re-apply, public `/api/site` carrying only listed/published data.
- Playwright on 390×844 (touch) and 1440×900: redirect to login, wrong-password message, sign-in, quantity tap with feedback, mark sold, bulk hide with confirmation, dashboard, new card save, scan → draft with uploaded photo, event pre-fill from OnTreasure, Instagram hide/show, Square preview with conflicts, settings, sign-out re-protects. No horizontal overflow at 320/390; interactive targets ≥ 44 px.
