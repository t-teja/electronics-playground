import { useEffect, useMemo, useRef, useState } from "react";
import { Control, LinearControl, Meter, Segmented } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { clamp, formatHz, formatVolt } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import {
  clearSim,
  graphPaper,
  Ink,
  label,
  lamp,
  scope,
  withFrame,
} from "@/lib/sim/draw";

const SHAPES = ["sine", "triangle", "square", "sawtooth", "pwm"] as const;
type Shape = (typeof SHAPES)[number];

function sample(shape: Shape, phase: number, duty: number) {
  const t = ((phase % 1) + 1) % 1;
  if (shape === "sine") return 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
  if (shape === "triangle") return t < 0.5 ? t * 2 : 2 - t * 2;
  if (shape === "sawtooth") return t;
  if (shape === "square") return t < duty ? 1 : 0;
  return t < duty ? 1 : 0;
}

function usesDuty(shape: Shape) {
  return shape === "square" || shape === "pwm";
}

export function SignalGeneratorLab() {
  const lab = LAB_BY_SLUG["signal-generator"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [shape, setShape] = useState<Shape>("square");
  const [freq, setFreq] = useState(4);
  const [amp, setAmp] = useState(5);
  const [duty, setDuty] = useState(0.4);

  const wave = useRef<number[]>([]);
  const pwm = useRef<number[]>([]);
  const params = useRef({ shape, freq, amp, duty });
  params.current = { shape, freq, amp, duty };

  const avg = usesDuty(shape) ? amp * duty : amp * 0.5;
  const pwmCarrier = Math.max(24, freq * 8);

  const insight = useMemo(() => {
    if (shape === "pwm") {
      return `PWM is a fast square. Duty ${Math.round(duty * 100)}% means the pulse is high that fraction of each period. Average voltage is ${formatVolt(avg)}. A motor winding or an RC filter cannot follow the edges, so it feels that DC. Chargers and LED dimmers work this way instead of burning the rest in a resistor.`;
    }
    if (shape === "square") {
      return `Square wave. Duty cycle is on-time / period. At ${Math.round(duty * 100)}% the average is V \u00d7 D = ${formatVolt(avg)}. Stretch the high part and the lamp gets brighter without changing amplitude.`;
    }
    if (shape === "sine") {
      return `Sine. Defined by frequency and amplitude. There is no on time. Duty cycle does not apply; that knob is for pulses. This is the shape AC mains and audio tones want.`;
    }
    if (shape === "triangle") {
      return `Triangle. Linear rise, linear fall. Frequency sets how often it folds; amplitude sets the peak. Used as a modulator and as a cheap stand-in for a sine.`;
    }
    return `Sawtooth. Ramps one way, snaps back. Oscilloscopes and subtractive synths are built on this edge. Duty still does not enter the picture.`;
  }, [shape, duty, avg]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="Shape" value={shape} />
          <Meter label="Frequency" value={formatHz(freq)} />
          <Meter label="Average" value={formatVolt(avg)} />
        </>
      }
      controls={
        <>
          <Control label="Waveform">
            <Segmented
              value={shape}
              onChange={setShape}
              options={SHAPES.map((s) => ({
                id: s,
                label: s === "pwm" ? "PWM" : s[0]!.toUpperCase() + s.slice(1),
              }))}
            />
          </Control>
          <LinearControl
            label="Frequency"
            value={freq}
            display={formatHz(freq)}
            min={0.5}
            max={12}
            step={0.1}
            onChange={setFreq}
            hint={shape === "pwm" ? "The PWM carrier runs several times faster than this." : "How often the shape repeats."}
          />
          <LinearControl
            label="Amplitude"
            value={amp}
            display={formatVolt(amp)}
            min={1}
            max={12}
            step={0.1}
            onChange={setAmp}
          />
          <LinearControl
            label="Duty cycle"
            value={duty}
            display={`${Math.round(duty * 100)}%`}
            min={0.08}
            max={0.92}
            step={0.01}
            onChange={setDuty}
            disabled={!usesDuty(shape)}
            hint={
              usesDuty(shape)
                ? "On-time / period. Average = amplitude \u00d7 duty."
                : "Duty is a pulse-width idea. Sine, triangle, and saw are set by frequency and amplitude."
            }
          />
        </>
      }
      insight={<p>{insight}</p>}
      canvas={
        <SimCanvas
          onFrame={(ctx, size, t, dt) => {
            const p = params.current;
            const pwmF = p.shape === "pwm" ? pwmCarrier : p.freq;
            const v = sample(p.shape, t * p.freq, p.duty);
            const pulse = sample("pwm", t * pwmF, p.duty);
            wave.current.push(v);
            pwm.current.push(p.shape === "pwm" || p.shape === "square" ? pulse : v);
            if (wave.current.length > 180) wave.current.shift();
            if (pwm.current.length > 180) pwm.current.shift();
            const shown = p.shape === "pwm" ? pulse : v;
            const vout = shown * p.amp;
            const bright = clamp(vout / 12, 0, 1);

            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              scope(
                ctx,
                40,
                36,
                480,
                150,
                wave.current,
                Ink.electron,
                p.shape === "pwm" ? `envelope  ${formatHz(p.freq)}` : `${p.shape}  ${formatHz(p.freq)}`,
              );
              scope(
                ctx,
                40,
                210,
                480,
                120,
                pwm.current,
                Ink.pin,
                p.shape === "pwm"
                  ? `carrier  ${formatHz(pwmF)}`
                  : p.shape === "square"
                    ? "pulses  (duty)"
                    : "same wave",
              );

              lamp(ctx, 660, 160, bright);
              label(ctx, "filtered load", 660, 214, { size: 11 });
              label(ctx, `${formatVolt(vout)} instant`, 660, 88, { mono: true, size: 12 });
              label(ctx, `avg ${formatVolt(p.shape === "pwm" || p.shape === "square" ? p.amp * p.duty : p.amp * 0.5)}`, 660, 108, {
                mono: true,
                size: 12,
                color: Ink.electron,
              });

              if (usesDuty(p.shape)) {
                const barW = 220;
                const barX = 560;
                const barY = 280;
                ctx.fillStyle = Ink.body;
                ctx.fillRect(barX, barY, barW, 16);
                ctx.fillStyle = Ink.electron;
                ctx.fillRect(barX, barY, barW * p.duty, 16);
                label(ctx, `duty ${Math.round(p.duty * 100)}%   Vavg = V \u00d7 D`, barX + barW / 2, barY + 36, {
                  size: 12,
                  color: Ink.text,
                });
              } else {
                label(ctx, "duty does not apply to this shape", 670, 292, { size: 12, color: Ink.muted });
              }

              label(ctx, "Vavg = V \u00d7 D   on pulses; analog shapes ignore D", 400, 392, {
                mono: true,
                size: 12,
                color: Ink.text,
              });
            });
            void dt;
          }}
        />
      }
    />
  );
}
