import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
const variants = cva("btn", {
  variants: { variant: { default: "", outline: "outline" } },
});
export function Button({
  asChild = false,
  variant,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof variants> & { asChild?: boolean }) {
  const C = asChild ? Slot : "button";
  return <C className={variants({ variant, className })} {...props} />;
}
