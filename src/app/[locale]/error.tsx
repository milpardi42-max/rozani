"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center pt-[calc(var(--announce-h,0px)+var(--header-h))] text-center">
      <p className="text-label text-error">Error</p>
      <h1 className="mt-4 font-display text-h1">Something went wrong.</h1>
      <button onClick={reset} className="mt-8 rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background">Try again</button>
    </div>
  );
}
