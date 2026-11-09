/**
 * Chart colors. Both sets were checked with a colorblind-safety validator (CVD ΔE >= 8,
 * normal-vision ΔE >= 15) in light and dark mode; dark mode uses its own steps rather
 * than an automatic inversion. Hues follow the entity, never its rank.
 */
export type ResolvedTheme = 'light' | 'dark'

export const CLIENT_COLORS: Record<ResolvedTheme, Record<1 | 2 | 3, string>> = {
  light: { 1: '#2a78d6', 2: '#eb6834', 3: '#1baf7a' },
  dark: { 1: '#3987e5', 2: '#d95926', 3: '#199e70' },
}

export type BucketKey = 'client' | 'internal' | 'profdev'

export const BUCKET_COLORS: Record<ResolvedTheme, Record<BucketKey, string>> = {
  light: { client: '#6250d6', internal: '#e87ba4', profdev: '#008300' },
  dark: { client: '#9085e9', internal: '#d55181', profdev: '#008300' },
}

/** Reserved for state. Always paired with an icon and a text label, never color alone. */
export const STATUS_COLORS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const

export type StatusKey = keyof typeof STATUS_COLORS

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** White or near-black, whichever reads better on this fill. */
export function inkOn(fill: string): string {
  return contrastRatio('#ffffff', fill) >= contrastRatio('#0b0b0b', fill) ? '#ffffff' : '#0b0b0b'
}
