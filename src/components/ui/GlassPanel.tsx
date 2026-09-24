import { cn } from "@/lib/utils";

export function GlassPanel({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("glass rounded-lg shadow-soft", className)} {...rest}>
      {children}
    </div>
  );
}
