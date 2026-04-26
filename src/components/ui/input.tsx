import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-zinc-700/60 bg-zinc-900/60 px-4 py-2.5 text-white placeholder:text-zinc-600",
        "focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30",
        "transition-all duration-150 text-sm backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2", className)} {...props} />
  );
}

export function FieldGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-zinc-700/60 bg-zinc-900/60 px-4 py-2.5 text-white",
        "focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30",
        "transition-all duration-150 text-sm appearance-none backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}
