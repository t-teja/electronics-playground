import { useEffect, useMemo, useRef, useState } from "react";
import { Control, Meter, Segmented, ToggleControl } from "@/components/control";
import { LabShell } from "@/components/lab-shell";
import { SimCanvas } from "@/components/sim-canvas";
import { LAB_BY_SLUG } from "@/lib/catalog";
import { useProgress } from "@/lib/progress";
import { bitLed, clearSim, graphPaper, Ink, label, logicShape, wire, withFrame } from "@/lib/sim/draw";
import { ElectronFlow, type Pt } from "@/lib/sim/flow";

const GATES = ["NOT", "AND", "OR", "NAND", "NOR", "XOR", "XNOR"] as const;
type Gate = (typeof GATES)[number];

function evalGate(g: Gate, a: boolean, b: boolean) {
  switch (g) {
    case "NOT":
      return !a;
    case "AND":
      return a && b;
    case "OR":
      return a || b;
    case "NAND":
      return !(a && b);
    case "NOR":
      return !(a || b);
    case "XOR":
      return a !== b;
    case "XNOR":
      return a === b;
  }
}

const TABLE: Record<Gate, [number, number, number][]> = {
  NOT: [
    [0, 0, 1],
    [1, 0, 0],
  ],
  AND: [
    [0, 0, 0],
    [0, 1, 0],
    [1, 0, 0],
    [1, 1, 1],
  ],
  OR: [
    [0, 0, 0],
    [0, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
  ],
  NAND: [
    [0, 0, 1],
    [0, 1, 1],
    [1, 0, 1],
    [1, 1, 0],
  ],
  NOR: [
    [0, 0, 1],
    [0, 1, 0],
    [1, 0, 0],
    [1, 1, 0],
  ],
  XOR: [
    [0, 0, 0],
    [0, 1, 1],
    [1, 0, 1],
    [1, 1, 0],
  ],
  XNOR: [
    [0, 0, 1],
    [0, 1, 0],
    [1, 0, 0],
    [1, 1, 1],
  ],
};

export function LogicGatesLab() {
  const lab = LAB_BY_SLUG["logic-gates"]!;
  const mark = useProgress((s) => s.mark);
  useEffect(() => mark(lab.slug), [lab.slug, mark]);

  const [gate, setGate] = useState<Gate>("AND");
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const y = evalGate(gate, a, gate === "NOT" ? false : b);
  const flow = useRef(new ElectronFlow());
  const params = useRef({ gate, a, b, y });
  params.current = { gate, a, b, y };

  const insight = useMemo(() => {
    const names: Record<Gate, string> = {
      NOT: "NOT inverts. High in, low out — the only unary gate you need.",
      AND: "AND is true only when every input is true. Both switches must be closed.",
      OR: "OR is true if any input is true. Inclusive: 1 OR 1 is still 1.",
      NAND: "NAND is AND with an inverted output. It is functionally complete — you can build any circuit from NAND alone.",
      NOR: "NOR is OR with an inverted output. Also functionally complete, and the heart of an SR latch.",
      XOR: "XOR is true when the inputs disagree. Addition without carry; parity; toggling.",
      XNOR: "XNOR is true when the inputs agree — an equality test in one gate.",
    };
    return `${names[gate]} Right now A=${a ? 1 : 0}${gate === "NOT" ? "" : ` B=${b ? 1 : 0}`} so Y=${y ? 1 : 0}.`;
  }, [gate, a, b, y]);

  return (
    <LabShell
      lab={lab}
      meters={
        <>
          <Meter label="A" value={a ? "1" : "0"} />
          <Meter label="B" value={gate === "NOT" ? "\u2014" : b ? "1" : "0"} />
          <Meter label="Y" value={y ? "1" : "0"} />
        </>
      }
      controls={
        <>
          <Control label="Gate">
            <Segmented value={gate} onChange={setGate} options={GATES.map((g) => ({ id: g, label: g }))} />
          </Control>
          <ToggleControl label="Input A" checked={a} on="1" off="0" onCheckedChange={setA} />
          {gate !== "NOT" ? (
            <ToggleControl label="Input B" checked={b} on="1" off="0" onCheckedChange={setB} />
          ) : null}
        </>
      }
      insight={
        <>
          <p>{insight}</p>
          <table className="mt-1 w-full max-w-xs font-mono text-xs tabular-nums">
            <thead className="text-subtle">
              <tr>
                <th className="py-1 text-left font-medium">A</th>
                {gate !== "NOT" ? <th className="text-left font-medium">B</th> : null}
                <th className="text-left font-medium">Y</th>
              </tr>
            </thead>
            <tbody>
              {TABLE[gate].map((row) => {
                const hit = row[0] === (a ? 1 : 0) && (gate === "NOT" || row[1] === (b ? 1 : 0));
                return (
                  <tr key={row.join()} className={hit ? "text-electron" : "text-muted"}>
                    <td className="py-0.5">{row[0]}</td>
                    {gate !== "NOT" ? <td>{row[1]}</td> : null}
                    <td>{row[2]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      }
      canvas={
        <SimCanvas
          onFrame={(ctx, size, _t, dt) => {
            const p = params.current;
            clearSim(ctx, size.w, size.h);
            graphPaper(ctx, size.w, size.h);
            withFrame(ctx, size.w, size.h, 800, 420, () => {
              logicShape(ctx, p.gate, 400, 200);
              label(ctx, p.gate, 400, 140, { size: 14, color: Ink.text });

              const aY = p.gate === "NOT" ? 200 : 188;
              const bY = 212;
              const inX = p.gate === "AND" || p.gate === "NAND" ? 376 : 372;
              bitLed(ctx, 140, aY, p.a);
              label(ctx, "A", 140, aY + 30, { size: 12 });
              wire(ctx, [
                { x: 154, y: aY },
                { x: inX, y: aY },
              ]);

              if (p.gate !== "NOT") {
                bitLed(ctx, 140, bY, p.b);
                label(ctx, "B", 140, bY + 30, { size: 12 });
                wire(ctx, [
                  { x: 154, y: bY },
                  { x: inX, y: bY },
                ]);
              }

              bitLed(ctx, 640, 200, p.y);
              label(ctx, "Y", 640, 230, { size: 12 });
              wire(ctx, [
                { x: 430, y: 200 },
                { x: 626, y: 200 },
              ]);

              if (p.y) {
                const out: Pt[] = [
                  { x: 430, y: 200 },
                  { x: 626, y: 200 },
                ];
                flow.current.setPath(out, false);
                flow.current.set(10, 90);
                flow.current.step(dt);
                flow.current.draw(ctx);
              } else {
                flow.current.set(0, 0);
              }

              label(ctx, `${p.gate}  \u00b7  Y = ${p.y ? "HIGH" : "LOW"}`, 400, 360, {
                mono: true,
                size: 14,
                color: Ink.text,
              });
            });
          }}
        />
      }
    />
  );
}
