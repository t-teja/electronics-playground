import type { ComponentType } from "react";
import { CapacitorLab } from "@/labs/capacitor";
import { DcMotorLab } from "@/labs/dc-motor";
import { DiodeLab } from "@/labs/diode";
import { InductorLab } from "@/labs/inductor";
import { LedLab } from "@/labs/led";
import { LogicGatesLab } from "@/labs/logic-gates";
import { MicrocontrollerLab } from "@/labs/microcontroller";
import { MosfetLab } from "@/labs/mosfet";
import { PotentiometerLab } from "@/labs/potentiometer";
import { RelayLab } from "@/labs/relay";
import { ResistorLab } from "@/labs/resistor";
import { SignalGeneratorLab } from "@/labs/signal-generator";
import { Timer555Lab } from "@/labs/timer-555";
import { TransformerLab } from "@/labs/transformer";
import { TransistorLab } from "@/labs/transistor";

export const LAB_COMPONENTS: Record<string, ComponentType> = {
  resistor: ResistorLab,
  capacitor: CapacitorLab,
  inductor: InductorLab,
  potentiometer: PotentiometerLab,
  transformer: TransformerLab,
  diode: DiodeLab,
  led: LedLab,
  transistor: TransistorLab,
  mosfet: MosfetLab,
  "logic-gates": LogicGatesLab,
  "timer-555": Timer555Lab,
  microcontroller: MicrocontrollerLab,
  "signal-generator": SignalGeneratorLab,
  "dc-motor": DcMotorLab,
  relay: RelayLab,
};
