"use client";

/**
 * Backward-compatible re-export.
 * Catalog pages now use FilterSidebar; this file keeps old imports working.
 */
export { FilterSidebar as FilterBar, type FilterOption, type FilterGroup } from "./FilterSidebar";
