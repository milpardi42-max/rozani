"use client";

import { AlertTriangle, CheckCircle2, Inbox } from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function CardSkeleton({ ratio = "aspect-[4/5]" }: { ratio?: string }) {
  return (
    <div className="space-y-3">
      <Skeleton className={cn("w-full rounded-lg", ratio)} />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function GridSkeleton({ count = 8, ratio }: { count?: number; ratio?: string }) {
  return (
    <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4" aria-busy>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} ratio={ratio} />
      ))}
    </div>
  );
}

export function EmptyState({ title, description, action, className }: { title?: string; description?: string; action?: React.ReactNode; className?: string }) {
  const { dict } = useLocale();
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-16 text-center", className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background-secondary text-muted">
        <Inbox className="h-5 w-5" />
      </div>
      <p className="font-medium text-foreground">{title ?? dict.common.empty}</p>
      <p className="mt-1 max-w-sm text-body-sm text-foreground-secondary">{description ?? dict.common.emptyDesc}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { dict } = useLocale();
  return (
    <div role="alert" className="flex flex-col items-center justify-center rounded-lg border border-error/20 bg-error/5 px-6 py-14 text-center">
      <AlertTriangle className="mb-3 h-6 w-6 text-error" />
      <p className="font-medium text-foreground">{message ?? dict.common.error}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          {dict.common.retry}
        </Button>
      )}
    </div>
  );
}

export function SuccessState({ message }: { message?: string }) {
  const { dict } = useLocale();
  return (
    <div role="status" className="flex items-center gap-3 rounded-md border border-success/20 bg-success/5 px-4 py-3 text-sm text-success anim-scale-fade">
      <CheckCircle2 className="h-4 w-4" />
      {message ?? dict.common.success}
    </div>
  );
}
