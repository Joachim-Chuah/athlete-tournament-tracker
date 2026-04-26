import { cn } from "@/lib/utils";

type Variant = "profit" | "loss" | "neutral" | "warning";

const variants: Record<Variant, string> = {
  profit: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  loss: "bg-red-500/15 text-red-400 border border-red-500/30",
  neutral: "bg-zinc-700/50 text-zinc-300 border border-zinc-700",
  warning: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variants[variant], className)}
      {...props}
    />
  );
}
