import type { ComponentType } from "react";
import { AdcLab } from "@/labs/adc";
import { CapacitorLab } from "@/labs/capacitor";
import { CpuLab } from "@/labs/cpu";
import { DacLab } from "@/labs/dac";
import { DcMotorLab } from "@/labs/dc-motor";
import { DiodeLab } from "@/labs/diode";
import { EpromLab } from "@/labs/eprom";
import { GpuLab } from "@/labs/gpu";
import { InductorLab } from "@/labs/inductor";
import { IrLab } from "@/labs/ir";
import { LdrLab } from "@/labs/ldr";
import { LedLab } from "@/labs/led";
import { LogicGatesLab } from "@/labs/logic-gates";
import { MicrocontrollerLab } from "@/labs/microcontroller";
import { MosfetLab } from "@/labs/mosfet";
import { PirLab } from "@/labs/pir";
import { PnpLab } from "@/labs/pnp";
import { PotentiometerLab } from "@/labs/potentiometer";
import { PsramLab } from "@/labs/psram";
import { RamLab } from "@/labs/ram";
import { RelayLab } from "@/labs/relay";
import { ResistorLab } from "@/labs/resistor";
import { RomLab } from "@/labs/rom";
import { SignalGeneratorLab } from "@/labs/signal-generator";
import { Timer555Lab } from "@/labs/timer-555";
import { TransformerLab } from "@/labs/transformer";
import { TransistorLab } from "@/labs/transistor";
import { UltrasonicLab } from "@/labs/ultrasonic";
import { UartLab } from "@/labs/uart";
import { I2cLab } from "@/labs/i2c";
import { SpiLab } from "@/labs/spi";
import { CanLab } from "@/labs/can";
import { LinLab } from "@/labs/lin";
import { OneWireLab } from "@/labs/one-wire";
import { Rs485Lab } from "@/labs/rs485";
import { PerceptronLab } from "@/labs/perceptron";
import { NeuralNetLab } from "@/labs/neural-net";
import { AttentionLab } from "@/labs/attention";

export const LAB_COMPONENTS: Record<string, ComponentType> = {
  resistor: ResistorLab,
  capacitor: CapacitorLab,
  inductor: InductorLab,
  potentiometer: PotentiometerLab,
  transformer: TransformerLab,
  diode: DiodeLab,
  led: LedLab,
  transistor: TransistorLab,
  pnp: PnpLab,
  mosfet: MosfetLab,
  "logic-gates": LogicGatesLab,
  "timer-555": Timer555Lab,
  microcontroller: MicrocontrollerLab,
  "signal-generator": SignalGeneratorLab,
  adc: AdcLab,
  dac: DacLab,
  uart: UartLab,
  i2c: I2cLab,
  spi: SpiLab,
  can: CanLab,
  lin: LinLab,
  "one-wire": OneWireLab,
  rs485: Rs485Lab,
  "dc-motor": DcMotorLab,
  relay: RelayLab,
  ldr: LdrLab,
  ir: IrLab,
  pir: PirLab,
  ultrasonic: UltrasonicLab,
  ram: RamLab,
  rom: RomLab,
  eprom: EpromLab,
  psram: PsramLab,
  cpu: CpuLab,
  gpu: GpuLab,
  perceptron: PerceptronLab,
  "neural-net": NeuralNetLab,
  attention: AttentionLab,
};
