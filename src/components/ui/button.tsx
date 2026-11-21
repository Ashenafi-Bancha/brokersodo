import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Brand kit buttons: 48px tall, 12px radius, 700 weight, yellow focus ring. */
export const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-btn border-2 border-transparent font-bold whitespace-nowrap transition-[background-color,color,transform,box-shadow] duration-150 select-none active:translate-y-px disabled:pointer-events-none disabled:bg-line disabled:text-navy-300 [&_svg]:size-[1.15em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary hover:bg-primary-hover",
        secondary: "bg-navy-900 text-white hover:bg-navy-700 dark:bg-white dark:text-navy-900 dark:hover:bg-navy-100",
        outline: "border-current bg-transparent text-fg hover:bg-bg-2",
        highlight: "bg-yellow-500 font-extrabold text-navy-900 hover:bg-yellow-400",
        call: "bg-red-500 text-white hover:bg-red-600",
        telegram: "bg-telegram text-white hover:brightness-110",
        whatsapp: "bg-whatsapp text-white hover:brightness-110",
        ghost: "bg-transparent text-fg hover:bg-bg-2",
        subtle: "bg-bg-2 text-fg hover:bg-line",
        destructive: "bg-error text-white hover:bg-red-700",
        link: "h-auto min-h-0 border-0 p-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-12 px-[22px] text-base",
        sm: "min-h-10 px-4 text-sm",
        xs: "min-h-8 rounded-sm px-2.5 text-xs",
        lg: "min-h-14 px-7 text-lg",
        icon: "size-12 p-0",
        "icon-sm": "size-10 p-0",
        "icon-xs": "size-8 rounded-sm p-0",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
