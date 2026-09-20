import { describe, expect, it } from 'vitest'

import { gridViewState } from '@/components/games/grid-state'

const STEP = 3

/** Walks the homepage grid the way a visitor does, so the button rules are checked in sequence. */
function walk(totalOnServer: number) {
  const baseCount = Math.min(STEP, totalOnServer)
  let visible = baseCount
  let loaded = baseCount
  let fetches = 0

  const state = () =>
    gridViewState({ visible, loaded, baseCount, hasNextPage: loaded < totalOnServer })

  return {
    state,
    get visible() {
      return visible
    },
    get fetches() {
      return fetches
    },
    showMore() {
      if (state().needsFetch) {
        loaded = Math.min(loaded + STEP, totalOnServer)
        fetches += 1
        visible = loaded
      } else {
        visible = Math.min(visible + STEP, loaded)
      }
      return this
    },
    showLess() {
      visible = baseCount
      return this
    },
  }
}

describe('gridViewState', () => {
  it('opens on three cards with only "Daha çox"', () => {
    const grid = walk(11)
    expect(grid.visible).toBe(3)
    expect(grid.state()).toMatchObject({ canShowMore: true, expanded: false })
  })

  it('reveals three more per press and keeps the button until everything is shown', () => {
    const grid = walk(11)

    grid.showMore()
    expect(grid.visible).toBe(6)
    expect(grid.state()).toMatchObject({ canShowMore: true, expanded: true })

    grid.showMore()
    expect(grid.visible).toBe(9)
    expect(grid.state().canShowMore).toBe(true)

    grid.showMore()
    expect(grid.visible).toBe(11)
    // Nothing left on the server, so only "Az göstər" remains.
    expect(grid.state()).toMatchObject({ canShowMore: false, expanded: true })
  })

  it('collapses back to three and offers "Daha çox" again', () => {
    const grid = walk(11).showMore().showMore().showLess()

    expect(grid.visible).toBe(3)
    expect(grid.state()).toMatchObject({ canShowMore: true, expanded: false })
  })

  it('re-expands from cache without fetching again', () => {
    const grid = walk(11).showMore().showMore()
    const fetchesAfterExpanding = grid.fetches

    grid.showLess().showMore().showMore()

    expect(grid.visible).toBe(9)
    expect(grid.fetches).toBe(fetchesAfterExpanding)
  })

  it('shows no buttons at all when everything fits on the first page', () => {
    const grid = walk(2)
    expect(grid.visible).toBe(2)
    expect(grid.state()).toMatchObject({ canShowMore: false, expanded: false })
  })

  it('treats an exactly-full first page as having more, then settles', () => {
    const grid = walk(6)
    expect(grid.state().canShowMore).toBe(true)

    grid.showMore()
    expect(grid.visible).toBe(6)
    expect(grid.state()).toMatchObject({ canShowMore: false, expanded: true })
  })
})
