/**
 * Main content column for the dashboard overview and design-token category pages.
 * Full width of the scroll area up to a max, with a padding ladder for small viewports
 * (no percentage width, so the column is not artificially narrow on phones).
 * Base padding is 32px so narrow viewports never use less than that.
 */
export const dashboardMainContentClassName =
  "mx-auto w-full min-w-0 max-w-[960px] px-8 py-8 md:px-16 md:py-16";

/**
 * Use on the element that wraps a wide `<table>` or matrix. Horizontal scroll is
 * **intentional** here (narrow viewports); the document body should not scroll sideways.
 */
export const tokenTableScrollRegionClassName =
  "min-w-0 overflow-x-auto [-webkit-overflow-scrolling:touch]";
