import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none select-none transition-[scale,background-color,color,opacity,box-shadow] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96]",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-fg hover:bg-accent/90",
        secondary:
          "bg-raised text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
        outline:
          "bg-transparent text-fg shadow-[var(--shadow-border)] hover:bg-raised hover:shadow-[var(--shadow-border-hover)]",
        ghost: "bg-transparent text-muted hover:bg-raised hover:text-fg",
        electron: "bg-electron text-accent-fg hover:bg-electron/90",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 rounded-sm px-3 text-xs",
        lg: "h-12 px-5",
        icon: "size-11",
        "icon-sm": "size-9 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
