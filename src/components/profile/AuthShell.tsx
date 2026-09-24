import Image from "next/image";
import { Logo } from "@/components/layout/Logo";

export function AuthShell({ title, description, image, children }: { title: string; description: string; image: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <Image src={image} alt="" fill sizes="50vw" className="object-cover" priority />
        <div className="absolute inset-0 vignette" />
        <p className="absolute bottom-10 start-10 max-w-md font-display text-h1 text-white text-balance">Patterns that tell the story of a space.</p>
      </div>
      <div className="flex items-center justify-center px-6 pb-16 pt-[calc(var(--header-h)+3rem)]">
        <div className="w-full max-w-sm">
          <Logo className="h-9 w-9 text-foreground" />
          <h1 className="mt-6 font-display text-h1">{title}</h1>
          <p className="mt-2 text-body-sm text-foreground-secondary">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
