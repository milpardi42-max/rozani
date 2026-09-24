"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem" }}>
        <div>
          <p style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.5 }}>Error</p>
          <h1 style={{ margin: "1rem 0", fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong.</h1>
          <button onClick={reset} style={{ marginTop: "1.5rem", padding: "0.625rem 1.25rem", borderRadius: "0.375rem", border: "none", background: "#1f2328", color: "#fff", fontSize: "0.875rem", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
