import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/cn";

export function Slider({
  className,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  id,
  valuetext,
  valueNow,
  valueMin,
  valueMax,
  "aria-label": ariaLabel,
}: {
  className?: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  id?: string;
  valuetext?: string;
  valueNow?: number;
  valueMin?: number;
  valueMax?: number;
  "aria-label"?: string;
}) {
  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex h-11 w-full touch-none items-center select-none data-[disabled]:opacity-40",
        className,
      )}
      value={[value]}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={(v) => onValueChange(v[0] ?? min)}
      aria-label={ariaLabel}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-border">
        <SliderPrimitive.Range className="absolute h-full bg-electron" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        id={id}
        className="block size-4 rounded-full bg-accent shadow-[var(--ep-thumb-ring)] outline-none transition-[scale] duration-150 ease-out hover:scale-110 focus-visible:scale-110"
        aria-label={ariaLabel}
        aria-valuetext={valuetext}
        aria-valuenow={valueNow ?? value}
        aria-valuemin={valueMin ?? min}
        aria-valuemax={valueMax ?? max}
      />
    </SliderPrimitive.Root>
  );
}
