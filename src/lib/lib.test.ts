import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, formatLongDate, formatShortDate } from './dates'
import { formatCurrency, formatHours, formatMinutes, formatPct, formatSignedPct, niceTicks } from './format'
import { BUCKET_COLORS, CLIENT_COLORS, contrastRatio, inkOn } from './palette'

describe('dates', () => {
  it('does day arithmetic in UTC across month and DST boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-11-02', -7)).toBe('2026-10-26')
    expect(daysBetween('2026-10-30', '2026-11-08')).toBe(9)
    expect(formatShortDate('2026-11-02')).toBe('Nov 2')
    expect(formatLongDate('2026-11-08')).toBe('Nov 8, 2026')
  })
})

describe('format', () => {
  it('formats durations, money and percentages', () => {
    expect(formatMinutes(42)).toBe('42 min')
    expect(formatMinutes(150)).toBe('2.5 h')
    expect(formatHours(41.25)).toBe('41.3h')
    expect(formatCurrency(110)).toBe('$110')
    expect(formatPct(92.345, 1)).toBe('92.3%')
    expect(formatSignedPct(12.4)).toBe('+12%')
    expect(formatSignedPct(-3.6)).toBe('−4%')
    expect(formatSignedPct(0.2)).toBe('0%')
  })

  it('produces clean axis ticks', () => {
    expect(niceTicks(17)).toEqual([0, 5, 10, 15, 20])
    expect(niceTicks(9)).toEqual([0, 2.5, 5, 7.5, 10])
    expect(niceTicks(120)).toEqual([0, 50, 100, 150])
    expect(niceTicks(0)).toEqual([0, 1])
  })
})

describe('palette', () => {
  it('computes WCAG contrast ratios', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21)
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1)
  })

  it('picks a label ink that clears 4.5:1 on every bucket fill, in both themes', () => {
    for (const theme of ['light', 'dark'] as const) {
      for (const fill of Object.values(BUCKET_COLORS[theme])) {
        expect(contrastRatio(inkOn(fill), fill)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('keeps client marks at 3:1 against the dark surface', () => {
    for (const c of Object.values(CLIENT_COLORS.dark)) {
      expect(contrastRatio(c, '#1a1a19')).toBeGreaterThanOrEqual(3)
    }
  })
})
