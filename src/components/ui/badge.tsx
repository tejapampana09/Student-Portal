import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/utils/functions"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/20 text-primary hover:bg-primary/30 shadow-sm shadow-primary/10",
        secondary:
          "border-white/20 dark:border-white/10 bg-white/20 dark:bg-white/5 text-foreground hover:bg-white/30",
        destructive:
          "border-red-500/30 bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 shadow-sm shadow-red-500/10",
        outline: "border-white/25 dark:border-white/15 text-foreground bg-transparent",
        glass: "border-white/30 dark:border-white/15 bg-white/20 dark:bg-white/10 text-foreground shadow-sm",
        "glass-success": "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/15",
        "glass-warning": "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm shadow-amber-500/15",
        "glass-info": "border-cyan-500/30 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 shadow-sm shadow-cyan-500/15",
        "glass-purple": "border-purple-500/30 bg-purple-500/15 text-purple-600 dark:text-purple-400 shadow-sm shadow-purple-500/15",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
