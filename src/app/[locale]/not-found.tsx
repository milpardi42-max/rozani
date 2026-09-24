import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[70vh] flex-col items-center justify-center pt-[calc(var(--announce-h,0px)+var(--header-h))] text-center">
      <p className="text-label text-accent">404</p>
      <h1 className="mt-4 font-display text-display">Nothing here.</h1>
      <p className="mt-4 max-w-md text-body text-foreground-secondary">The page you are looking for does not exist or has moved. / صفحه‌ای که دنبالش هستید وجود ندارد.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/fa" className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background">خانه</Link>
        <Link href="/en" className="rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:border-foreground">Home</Link>
      </div>
    </div>
  );
}
