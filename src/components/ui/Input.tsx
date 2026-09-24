import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted transition-[border-color,box-shadow] duration-200 focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted transition-[border-color,box-shadow] duration-200 focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-md border border-border bg-surface px-3.5 text-sm text-foreground transition-[border-color,box-shadow] duration-200 focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({ label, htmlFor, children, hint, className }: { label: string; htmlFor?: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("block", className)}>
      <span className="mb-1.5 block text-caption font-medium text-foreground-secondary">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-caption text-muted">{hint}</span>}
    </label>
  );
}
