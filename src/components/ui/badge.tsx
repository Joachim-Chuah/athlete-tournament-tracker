import { cn } from "@/lib/utils";

type Variant = "profit" | "loss" | "neutral" | "warning";

const variants: Record<Variant, string> = {
  profit: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.15)]",
  loss: "bg-red-500/10 text-red-400 border border-red-500/25",
  neutral: "bg-zinc-800/60 text-zinc-400 border border-zinc-700/60",
  warning: "bg-amber-500/10 text-amber-400 border border-amber-500/25",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
