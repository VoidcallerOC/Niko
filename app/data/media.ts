/**
 * Photos used on the homepage — every one comes from a public post on
 * https://www.instagram.com/ninoscollectibles/ (the logo is supplied artwork; see `logo`) and is stored locally in
 * `public/media/ig/` (no Instagram CDN links, which expire).
 *
 * `caption` is the post caption as published (dot spacers and hashtags removed);
 * `hashtags` keeps the tags. Pictured cards are from past posts — they are not
 * a statement of current stock.
 *
 * Images were resized to WebP and re-encoded without metadata. The hero photo is
 * cropped at the bottom so price labels on the table edge are not shown.
 */
export interface IgPhoto {
  id: string
  /** Base path without the `-{width}.webp` suffix. */
  base: string
  /** Available widths, smallest first. */
  widths: readonly number[]
  /** Intrinsic aspect ratio of the stored file (width / height). */
  ratio: number
  alt: string
  postUrl: string
  /** ISO date the post was published. */
  postDate: string
  caption: string
  hashtags: readonly string[]
  /** What the photo shows, in plain words. */
  description: string
  /** Short label for the game/franchise visible in the photo. */
  tag?: string
}

const ig = (name: string) => `/media/ig/${name}`

/**
 * Official logo artwork supplied by Nick on Oct 10, 2026 (transparent background,
 * 1254×1254 source). `emblem` is the NC mark + ring cropped from it for small sizes;
 * `full` includes the NINO'S / COLLECTIBLES wordmark.
 */
export const logo = {
  emblem: {
    src: '/media/brand/emblem-256.webp',
    srcset: '/media/brand/emblem-128.webp 128w, /media/brand/emblem-256.webp 256w',
    fallback: '/media/brand/emblem-256.png',
  },
  full: {
    src: '/media/brand/logo-full-640.webp',
    srcset:
      '/media/brand/logo-full-320.webp 320w, /media/brand/logo-full-640.webp 640w, /media/brand/logo-full-1200.webp 1200w',
    fallback: '/media/brand/logo-full-640.png',
  },
  alt: "Nino's Collectibles logo: a red N and white C inside a red brush ring",
  fullAlt: "Nino's Collectibles logo: red and white NC monogram in a red brush ring above the words Nino's Collectibles",
} as const

export const photos = {
  vendorSolo: {
    id: 'vendor-solo',
    base: ig('vendor-solo'),
    widths: [800, 1600],
    ratio: 1600 / 1280,
    alt: 'Nino smiling behind his vendor table at an indoor card show, with Pokémon and One Piece boxes and binders on the table',
    postUrl: 'https://www.instagram.com/p/DdcfHKAyX-V/',
    postDate: '2026-09-18',
    caption: 'First time vending alone. Wish me luck, tomorrow we have another one!',
    hashtags: ['vendor', 'pokemon', 'onepiece', 'luffy', 'pikachu'],
    description: 'Nino at his table at a card show in a gym-style hall.',
  },
  tableDeals: {
    id: 'table-deals',
    base: ig('table-deals'),
    widths: [800, 1600],
    ratio: 1600 / 1570,
    alt: "The Nino's Collectibles vendor table at a card show: a red tablecloth, a black Nino's Collectibles banner, card cases and sealed product, with a helper seated behind it",
    postUrl: 'https://www.instagram.com/p/DdscLfBympM/',
    postDate: '2026-09-24',
    caption: 'She’s making the deals today lol',
    hashtags: ['pokemon', 'onepieceanime', 'tcg', 'pokemart', 'trade'],
    description: "Vendor table with the Nino's Collectibles banner (Buy • Sell • Trade • Collect).",
  },
  lateNightDeals: {
    id: 'late-night-deals',
    base: ig('late-night-deals'),
    widths: [600, 1200],
    ratio: 1,
    alt: 'A hand fanning out four One Piece cards in top loaders, including Boa Hancock, Shanks and Monkey D. Luffy',
    postUrl: 'https://www.instagram.com/p/DdX4W5_yGsf/',
    postDate: '2026-09-16',
    caption: 'Late night deals!',
    hashtags: ['luffy', 'boahancock', 'shanks', 'mihawk', 'tcg'],
    description: 'One Piece cards in top loaders.',
    tag: 'One Piece',
  },
  nami: {
    id: 'onepiece-beauties-a',
    base: ig('onepiece-beauties-a'),
    widths: [600, 1200],
    ratio: 3 / 4,
    alt: 'A One Piece Nami card in a top loader on a red display stand',
    postUrl: 'https://www.instagram.com/p/DdCYLr_G5Ms/',
    postDate: '2026-09-08',
    caption: 'Why they so beautiful tho!',
    hashtags: ['nami', 'robin', 'tashigi', 'onepiece', 'tcg'],
    description: 'Nami card on a display stand (image 1 of the post).',
    tag: 'One Piece',
  },
  robin: {
    id: 'onepiece-beauties-b',
    base: ig('onepiece-beauties-b'),
    widths: [600, 1200],
    ratio: 3 / 4,
    alt: 'A foil One Piece Nico Robin card in a top loader on a red display stand',
    postUrl: 'https://www.instagram.com/p/DdCYLr_G5Ms/',
    postDate: '2026-09-08',
    caption: 'Why they so beautiful tho!',
    hashtags: ['nami', 'robin', 'tashigi', 'onepiece', 'tcg'],
    description: 'Robin card on a display stand (image 2 of the post).',
    tag: 'One Piece',
  },
  pokemon30th: {
    id: 'pokemon-30th-rip',
    base: ig('pokemon-30th-rip'),
    widths: [600, 1200],
    ratio: 3 / 4,
    alt: 'A hand holding a fan of sealed Pokémon 30th Celebration booster packs with Pikachu on the front',
    postUrl: 'https://www.instagram.com/p/DdaakcGyKKd/',
    postDate: '2026-09-17',
    caption: 'Did you guys get to rip?',
    hashtags: ['pokemon', '30thanniversary', 'pikachu', 'tcg', 'collection'],
    description: 'Pokémon 30th Celebration booster packs, ready to open.',
    tag: 'Pokémon',
  },
  kaido: {
    id: 'pull-kaido',
    base: ig('pull-kaido'),
    widths: [600, 1200],
    ratio: 1200 / 1473,
    alt: 'A hand holding a black-and-gold One Piece Kaido card pulled from a pack',
    postUrl: 'https://www.instagram.com/p/DdJaxviSehT/',
    postDate: '2026-09-11',
    caption: 'Wifey pulling heat last night!!!!',
    hashtags: ['kaido', 'luffy', 'tcg', 'chace', 'onepiece'],
    description: 'A Kaido card pulled from a pack.',
    tag: 'One Piece',
  },
  naruto: {
    id: 'yankees-naruto',
    base: ig('yankees-naruto'),
    widths: [600, 1200],
    ratio: 1,
    alt: 'Two hands holding Naruto and Sasuke cards with Yankees logos, inside Yankee Stadium',
    postUrl: 'https://www.instagram.com/p/DdCrzrxShYt/',
    postDate: '2026-09-08',
    caption: 'Out here at Yankees flexing!',
    hashtags: ['yankee', 'stadiums', 'naruto', 'tcg', 'ninja'],
    description: 'Naruto-themed cards at Yankee Stadium.',
    tag: 'Naruto',
  },
  whatnotLunch: {
    id: 'whatnot-lunch-a',
    base: ig('whatnot-lunch-a'),
    widths: [600, 1200],
    ratio: 3 / 4,
    alt: 'One Piece Luffy cards in sleeves lined up behind a Zoro figure on a desk',
    postUrl: 'https://www.instagram.com/p/DdHbcu6G0u-/',
    postDate: '2026-09-10',
    caption: 'All sold in 1hr in today’s Lunch show (whatnot). Thank you everyone that keeps supporting me',
    hashtags: ['luffy', 'tcg', 'whatnot', 'sold', 'onepiecefan'],
    description: 'Cards from a Whatnot lunch show post (image 1 of the post). Describes one past show, not a schedule.',
    tag: 'One Piece',
  },
  reelHeat: {
    id: 'reel-heat',
    base: ig('reel-heat'),
    widths: [360],
    ratio: 360 / 640,
    alt: 'Nino in a Yankees cap taking a selfie while holding up a One Piece booster pack',
    postUrl: 'https://www.instagram.com/reel/DeBHdV4yLvw/',
    postDate: '2026-10-02',
    caption: 'Nothing but heat let’s go baby!!!!',
    hashtags: ['onepiece', 'anime', 'tcg', 'collection', 'luffy'],
    description: 'Cover frame of the reel (only a 360×640 cover is served publicly).',
    tag: 'One Piece',
  },
} as const satisfies Record<string, IgPhoto>

/** Collector's feed order on the page. */
export const feed: readonly IgPhoto[] = [
  photos.lateNightDeals,
  photos.pokemon30th,
  photos.nami,
  photos.kaido,
  photos.robin,
  photos.naruto,
]
