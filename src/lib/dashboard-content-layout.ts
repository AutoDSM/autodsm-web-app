/**
 * Main content column for the dashboard overview and design-token category pages.
 * Full width of the scroll area up to a max, with a padding ladder for small viewports
 * (no percentage width, so the column is not artificially narrow on phones).
 */
export const dashboardMainContentClassName =
  "mx-auto w-full min-w-0 max-w-[1000px] px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-10";

/**
 * Use on the element that wraps a wide `<table>` or matrix. Horizontal scroll is
 * **intentional** here (narrow viewports); the document body should not scroll sideways.
 */
export const tokenTableScrollRegionClassName =
  "min-w-0 overflow-x-auto [-webkit-overflow-scrolling:touch]";
