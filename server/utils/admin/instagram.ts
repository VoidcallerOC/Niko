import { feed } from '../../../app/data/media'

/**
 * Instagram status, told straight: the site's feed is a manual import of
 * public posts (see app/data/media.ts). There is no API connection and no
 * scheduled sync, so there is no "last sync" to report beyond the import
 * date. Adding a live feed needs Nino's approval of the Instagram Graph API
 * app (Meta business verification) and a server-side token.
 */
export const INSTAGRAM_IMPORT = {
  source: 'manual' as const,
  importedAt: '2026-10-10',
  liveSync: false,
  posts: feed.map((p) => ({ id: p.id, src: `${p.base}-${p.widths[0]}.webp`, alt: p.alt, postUrl: p.postUrl, postDate: p.postDate, caption: p.caption })),
}
