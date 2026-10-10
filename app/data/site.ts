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

// Section links are rooted at "/" so they also work from /scan.
export const navLinks = [
  { href: '/#feed', label: 'Feed' },
  { href: '/#shows', label: 'Shows' },
  { href: '/#live', label: 'Live & updates' },
  { href: '/#about', label: 'About' },
  { href: '/scan', label: 'Scan a card' },
] as const
