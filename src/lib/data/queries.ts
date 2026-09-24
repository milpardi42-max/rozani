import "server-only";
import { getContent } from "./store";
import type { SiteContent } from "../types";

export type {
  Enriched,
  EnrichedPattern,
  EnrichedProduct,
  EnrichedPortfolio,
  EnrichedEducation,
} from "./enrich";
export {
  artistOf,
  categoryOf,
  patternById,
  productById,
  portfolioById,
  enrichPattern,
  enrichProduct,
  enrichPortfolio,
  enrichEducation,
  artistStats,
} from "./enrich";

export async function getSite(): Promise<SiteContent> {
  return getContent();
}
