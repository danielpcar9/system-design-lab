import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "border-border text-muted bg-elevated",
        rails: "border-magenta/30 text-magenta bg-magenta-dim",
        fastapi: "border-cobalt/30 text-cobalt bg-cobalt-dim",
        paper: "border-transparent text-accent-fg bg-accent",
        agentic: "border-violet/30 text-violet bg-violet-dim",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
