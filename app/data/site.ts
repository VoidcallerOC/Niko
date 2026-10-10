/**
 * Confirmed destinations only.
 * - Instagram is the primary contact path (profile: NINO, category "Buying and Selling").
 * - OnTreasure is Nino's vendor profile, which lists the shows he is vending.
 */
export const site = {
  name: "Nino's Collectibles",
  handle: '@ninoscollectibles',
  instagramUrl: 'https://www.instagram.com/ninoscollectibles/',
  onTreasureUrl: 'https://www.ontreasure.com/u/ninoscollectibles',
} as const

export const navLinks = [
  { href: '#feed', label: 'Feed' },
  { href: '#shows', label: 'Shows' },
  { href: '#live', label: 'Whatnot' },
  { href: '#about', label: 'About' },
] as const
