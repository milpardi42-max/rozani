import { MarketplaceCartProvider } from "@/components/marketplace/MarketplaceCart";

/**
 * Digital marketplace shell.
 *
 * Only this subtree gets the digital cart provider, so the existing physical
 * cart/checkout flow keeps its current behaviour untouched.
 */
export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <MarketplaceCartProvider>{children}</MarketplaceCartProvider>;
}
