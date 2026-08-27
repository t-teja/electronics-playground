import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onCheckedChange,
  className,
  id,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      className={cn(
        "peer inline-flex h-7 w-11 shrink-0 items-center rounded-full bg-border transition-[background-color] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg data-[state=checked]:bg-electron",
        className,
      )}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 translate-x-1 rounded-full bg-accent transition-transform duration-150 ease-out data-[state=checked]:translate-x-5 data-[state=checked]:bg-accent-fg" />
    </SwitchPrimitive.Root>
  );
}
