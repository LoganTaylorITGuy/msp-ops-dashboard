import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'
import App from './App'
import { ThemeProvider } from './hooks/ThemeProvider'

function renderApp() {
  return render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  )
}

const tile = (label: string) => screen.getByText(label).parentElement!

describe('dashboard', () => {
  it('has no automatically detectable accessibility violations', async () => {
    const { container } = renderApp()
    // jsdom has no layout engine, so axe can't measure color contrast here;
    // contrast is covered by the palette tests and was checked in a real browser.
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
    expect(results.passes.length).toBeGreaterThan(15) // axe really ran its checks
  })

  it('also passes axe in dark mode and with every table view open', async () => {
    const user = userEvent.setup()
    const { container } = renderApp()
    await user.click(screen.getByLabelText('Dark'))
    for (const button of screen.getAllByRole('button', { name: 'Show table' })) await user.click(button)
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(results.violations.map((v) => v.id)).toEqual([])
  })

  it('leads with the SLA hero figure and stat tiles', () => {
    renderApp()
    expect(screen.getByRole('heading', { level: 1, name: 'MSP Operations Dashboard' })).toBeInTheDocument()
    expect(within(tile('First-response SLA met')).getByText(/%$/)).toBeInTheDocument()
    expect(within(tile('Tickets opened')).getByText(/vs previous 12 weeks/)).toBeInTheDocument()
  })

  it('re-scopes every number when the client filter changes', async () => {
    const user = userEvent.setup()
    renderApp()
    const before = within(tile('Tickets opened')).getAllByText(/^\d+$/)[0].textContent

    await user.selectOptions(screen.getByLabelText('Client'), 'northwind')

    const after = within(tile('Tickets opened')).getAllByText(/^\d+$/)[0].textContent
    expect(Number(after)).toBeLessThan(Number(before))
    expect(screen.getByText(/needs "All clients"/)).toBeInTheDocument()
    const tenantTable = screen.getByRole('table', { name: /tenant health/ })
    expect(within(tenantTable).getAllByRole('row')).toHaveLength(2) // header + Northwind
    expect(within(screen.getByRole('table', { name: /Open tickets/ })).queryByText('Contoso Dental')).toBeNull()
  })

  it('shows no comparison for the full 26-week range', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByLabelText('Last 26 weeks'))
    expect(within(tile('Tickets opened')).getByText('No earlier period to compare')).toBeInTheDocument()
  })

  it('swaps the line chart for a data table with one row per week', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByLabelText('Last 4 weeks'))
    const card = screen.getByRole('heading', { name: 'Tickets opened per week' }).closest('section')!
    const toggle = within(card).getByRole('button', { name: 'Show table' })
    await user.click(toggle)

    const table = within(card).getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(5) // header + 4 weeks
    expect(within(table).getByRole('columnheader', { name: 'Northwind Traders' })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Show chart' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('lets keyboard users read the line chart week by week', () => {
    renderApp()
    const chart = screen.getByRole('group', { name: /Tickets opened per week by client/ })
    act(() => chart.focus())
    const live = within(chart).getByText(/^Week of Nov 2, 2026:/)
    expect(live).toHaveAttribute('aria-live', 'polite')

    fireEvent.keyDown(chart, { key: 'ArrowLeft' })
    expect(within(chart).getByText(/^Week of Oct 26, 2026:/)).toBeInTheDocument()
    fireEvent.keyDown(chart, { key: 'Home' })
    expect(within(chart).getByText(/^Week of Aug 17, 2026:/)).toBeInTheDocument()
    fireEvent.keyDown(chart, { key: 'End' })
    expect(within(chart).getByText(/Contoso Dental \d+, Fabrikam Logistics \d+, Northwind Traders \d+$/)).toBeInTheDocument()

    act(() => chart.blur())
    expect(within(chart).queryByText(/^Week of/)).toBeNull()
  })

  it('gives every chart part an accessible name with its value', () => {
    renderApp()
    expect(screen.getByRole('listitem', { name: /^Client work: [\d.]+h, \d+%$/ })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: /^Northwind Traders: [\d.]+h, [\d.]+h billable$/ })).toBeInTheDocument()
  })

  it('pairs every status with an icon and a text label', () => {
    renderApp()
    const table = screen.getByRole('table', { name: /tenant health/ })
    expect(within(table).getByText('Healthy')).toBeInTheDocument()
    expect(within(table).getByText('Needs attention')).toBeInTheDocument()
    expect(within(table).getByText('At risk')).toBeInTheDocument()
  })

  it('remembers the chosen theme', async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp()
    await user.click(screen.getByLabelText('Dark'))
    expect(document.documentElement.dataset.theme).toBe('dark')
    unmount()
    renderApp()
    expect(screen.getByLabelText('Dark')).toBeChecked()
    await user.click(screen.getByLabelText('System'))
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('shows hover details on bars and segments', async () => {
    const user = userEvent.setup()
    renderApp()
    const bar = screen.getByRole('listitem', { name: /^Northwind Traders:/ })
    await user.hover(bar)
    expect(within(bar).getByText(/billable$/)).toBeInTheDocument()
    await user.unhover(bar)
    expect(within(bar).queryByText(/billable$/)).toBeNull()

    const segment = screen.getByRole('listitem', { name: /^Internal operations:/ })
    await user.hover(segment)
    expect(screen.getByText(/Internal operations · \d+%/)).toBeInTheDocument()
    await user.unhover(segment)
    expect(screen.queryByText(/Internal operations · \d+%/)).toBeNull()
  })
})
