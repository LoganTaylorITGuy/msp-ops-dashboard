// Real-browser check: full axe run (including color contrast, which jsdom can't do)
// in light and dark mode at desktop and phone widths, plus README screenshots.
// Usage: npm run build && node scripts/browser-check.mjs
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { preview } from 'vite'
import { chromium } from 'playwright'

const require = createRequire(import.meta.url)
const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8')

const server = await preview({ preview: { port: 4179, strictPort: true } })
const url = 'http://localhost:4179/'
const browser = await chromium.launch()
let failed = false

for (const theme of ['light', 'dark']) {
  for (const [label, viewport] of [
    ['desktop', { width: 1280, height: 900 }],
    ['phone', { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport, colorScheme: theme })
    await page.goto(url)
    await page.waitForSelector('h1')

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    if (overflow > 0) {
      failed = true
      console.log(`✗ ${theme}/${label}: page scrolls horizontally by ${overflow}px`)
    }

    await page.addScriptTag({ content: axeSource })
    const violations = await page.evaluate(async () => (await window.axe.run()).violations)
    if (violations.length) failed = true
    console.log(
      `${violations.length ? '✗' : '✓'} ${theme}/${label}: ${violations.length} axe violation(s)` +
        violations.map((v) => `\n    - ${v.id}: ${v.nodes.length} node(s) · ${v.nodes[0]?.target}`).join(''),
    )

    if (label === 'desktop') {
      await page.screenshot({ path: `docs/screenshot-${theme}.png`, fullPage: true })
      // Hover state for the README: tooltip on the line chart.
      const box = await page.locator('[aria-roledescription="chart"] svg').boundingBox()
      await page.mouse.move(box.x + box.width * 0.55, box.y + box.height / 2)
      await page.screenshot({
        path: `docs/tooltip-${theme}.png`,
        clip: { x: box.x - 20, y: box.y - 70, width: box.width + 40, height: box.height + 90 },
      })
    } else {
      await page.screenshot({ path: `docs/phone-${theme}.png`, fullPage: true })
    }
    await page.close()
  }
}

await browser.close()
server.httpServer.close()
process.exit(failed ? 1 : 0)
