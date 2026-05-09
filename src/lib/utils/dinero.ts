import { CHF } from '@dinero.js/currencies';
import {
  Dinero,
  add,
  dinero,
  down,
  halfEven,
  maximum,
  minimum,
  multiply,
  subtract,
  toDecimal,
  transformScale,
  trimScale
} from 'dinero.js';

export type DineroChf = Dinero<number>;

export const dineroAddMany = (...addends: Dinero<number>[]): DineroChf => addends.reduce(add, dineroChf(0));

export const dineroSubtractMany = (initial: Dinero<number>, ...addends: Dinero<number>[]): DineroChf => addends.reduce(subtract, initial);

export const transformNumber = ({ value }: { value: string; currency: { code: string } }): number => {
  return Number(value);
};

export const dineroRound = (input: Dinero<number>, scale = 0): DineroChf =>
  transformScale(input, scale, halfEven) as DineroChf;

export const dineroRound100Down = (input: Dinero<number>): DineroChf =>
  transformScale(transformScale(input, -2, down), 0, down) as DineroChf;

export const dineroRoundMin0 = (input: Dinero<number>, scale = 0): DineroChf =>
  transformScale(dineroMax(input, dineroChf(0)), scale, halfEven) as DineroChf;

export const dineroChf = (amount: number, scale?: number): DineroChf => {
  const scaleResult = scale ?? CHF.exponent;
  const factor = 10 ** scaleResult;
  const amountResult = Math.round(amount * factor);

  return dinero({ amount: amountResult, currency: CHF, scale: scaleResult });
};

export const dineroScaledPercent = (value: number, precision: number) => {
  const factor = 10 ** precision;
  const amount = Math.round(value * factor);

  // +2 to make it a factor -> / 100
  return { amount, scale: precision + 2 };
};

export const dineroScaledFactor = (value: number, precision: number) => {
  const factor = 10 ** precision;
  const amount = Math.round(value * factor);

  return { amount, scale: precision };
};

export const multiplyDineroPercent = (
  input: Dinero<number>,
  percent: number,
  precision: number
): DineroChf => {
  return trimScale(multiply(input, dineroScaledPercent(percent, precision))) as DineroChf;
};

export const multiplyDineroFactor = (input: Dinero<number>, factor: number, precision: number): DineroChf => {
  return trimScale(multiply(input, dineroScaledFactor(factor, precision))) as DineroChf;
};

export const dineroToNumber = (input: Dinero<number>) => toDecimal(input, transformNumber);

export const dineroMin = (...dineros: Dinero<number>[]): DineroChf => {
  return minimum(dineros as [Dinero<number>, ...Dinero<number>[]]) as DineroChf;
};

export const dineroMax = (...dineros: Dinero<number>[]): DineroChf => {
  return maximum(dineros as [Dinero<number>, ...Dinero<number>[]]) as DineroChf;
};
