/**
 * Confirmed facts only. Everything on the page that a visitor could act on
 * routes to Instagram — the one contact channel confirmed from the profile.
 */
export const site = {
  name: "Nino's Collectibles",
  handle: '@ninoscollectibles',
  instagramUrl: 'https://www.instagram.com/ninoscollectibles/',
} as const

export const navLinks = [
  { href: '#cards', label: 'Cards' },
  { href: '#shows', label: 'Shows & Lives' },
  { href: '#about', label: 'About' },
  { href: '#contact', label: 'Contact' },
] as const
