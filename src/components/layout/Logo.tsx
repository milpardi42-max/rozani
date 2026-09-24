"use client";

/**
 * Rosie Ateliyer — Brand Wordmark
 *
 * Pure HTML/CSS — uses the page's actual loaded fonts (Instrument Serif + Inter).
 * Renders correctly at any size via className (h-* on the wrapper scales via em).
 *
 * `currentColor` on ROSIE → adapts to transparent (white) vs solid (dark) header.
 * `var(--accent)`  on ATELIYER + rule → always the brand's warm bronze/gold.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        lineHeight: 1,
        userSelect: "none",
        gap: 0,
      }}
    >
      {/* Primary wordmark — Instrument Serif, uppercase, tracked */}
      <span
        style={{
          fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif",
          fontSize: "1.22em",
          fontWeight: 400,
          letterSpacing: "0.17em",
          textTransform: "uppercase",
          color: "currentColor",
          lineHeight: 1,
          display: "block",
        }}
      >
        Rosie
      </span>

      {/* Hairline rule */}
      <span
        style={{
          display: "block",
          height: "0.06em",
          background: "var(--accent)",
          opacity: 0.55,
          margin: "0.18em 0 0.15em",
          borderRadius: 0,
        }}
      />

      {/* Sub-mark — Inter, extra spaced, accent colour */}
      <span
        style={{
          fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
          fontSize: "0.46em",
          fontWeight: 500,
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: "var(--accent)",
          lineHeight: 1,
          display: "block",
        }}
      >
        Ateliyer
      </span>
    </span>
  );
}
