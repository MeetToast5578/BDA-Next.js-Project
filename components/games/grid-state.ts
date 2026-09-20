/**
 * What the game grid shows for a given number of revealed cards. Kept apart from the component so
 * the expand/collapse rules are testable without a DOM.
 */
export function gridViewState({
  visible,
  loaded,
  baseCount,
  hasNextPage,
}: {
  /** Cards currently revealed. */
  visible: number
  /** Cards already fetched, revealed or not. */
  loaded: number
  /** Cards the list opened with, and what "Az göstər" returns it to. */
  baseCount: number
  /** Whether the API has a further page after the ones already fetched. */
  hasNextPage: boolean
}) {
  return {
    /** "Daha çox": there are more cards to reveal, already fetched or still on the server. */
    canShowMore: visible < loaded || hasNextPage,
    /** "Az göstər": the visitor has expanded past the opening size. */
    expanded: visible > baseCount,
    /** Whether "Daha çox" has to call the API, or can just reveal cards it already holds. */
    needsFetch: visible >= loaded,
  }
}
