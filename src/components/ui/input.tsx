import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground",
        "focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10",
        "transition-all duration-150 text-sm",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2", className)} {...props} />
  );
}

export function FieldGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground",
        "focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10",
        "transition-all duration-150 text-sm appearance-none",
        className
      )}
      {...props}
    />
  );
}
