import { cn } from "@/lib/utils";

type Variant = "profit" | "loss" | "neutral" | "warning";

const variants: Record<Variant, string> = {
  profit: "bg-profit-soft text-profit",
  loss: "bg-loss-soft text-loss",
  neutral: "bg-secondary text-muted-foreground border border-border",
  warning: "bg-warning/10 text-warning",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
