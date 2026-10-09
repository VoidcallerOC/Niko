/**
 * Photo slots for the homepage.
 *
 * Every image is meant to come from @ninoscollectibles' own posts. Until a real
 * file is supplied, `src` stays `null` and the page renders a clearly labeled
 * placeholder describing the photo that belongs there.
 *
 * To fill a slot: drop the file in `public/media/` and set `src`, e.g.
 * `src: '/media/hero-vendor-table.jpg'`, then update `alt` to describe the
 * actual photo.
 */
export interface MediaItem {
  src: string | null
  /** Alt text for the real photo. Rewrite it to match the image you add. */
  alt: string
  /** What the placeholder asks for. Shown only while `src` is null. */
  label: string
}

const slot = (label: string, alt: string): MediaItem => ({ src: null, alt, label })

export const media = {
  logo: slot(
    'NC / Nino’s logo (black, red & white) from the Instagram profile',
    "Nino's Collectibles logo",
  ),
  hero: slot(
    'Nino behind the vendor table with cards',
    'Nino at a card show vendor table with trading cards on display',
  ),
  pokemon: slot(
    'A Pokémon card or deal photo from the feed',
    'Pokémon trading cards from a Nino’s Collectibles post',
  ),
  onePiece: slot(
    'A One Piece card photo from the feed',
    'One Piece trading cards from a Nino’s Collectibles post',
  ),
  feed: [
    slot('Card deal post', 'A card deal posted by Nino’s Collectibles'),
    slot('Pack opening', 'A pack opening on the Nino’s Collectibles feed'),
    slot('Fresh pull close-up', 'A close-up of a pulled trading card'),
    slot('Cards on the table', 'Trading cards laid out on a vendor table'),
  ],
  vendorEvent: slot(
    'Vendor table at a card event',
    'Nino’s Collectibles vendor table at a card event',
  ),
  livestream: slot(
    'Whatnot show screenshot or setup',
    'Nino’s Collectibles live show setup',
  ),
  about: [
    slot('Nino at the table, mid-deal', 'Nino talking cards with a customer at a vendor table'),
    slot('Collecting shot — binder, slabs or a favorite card', 'Part of Nino’s card collection'),
  ],
} satisfies Record<string, MediaItem | MediaItem[]>
