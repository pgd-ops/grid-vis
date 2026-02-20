export type DisplayUnit = 'cm' | 'm' | 'in' | 'ft';
export const ALL_UNITS: DisplayUnit[] = ['cm', 'm', 'in', 'ft'];
export const UNIT_LABELS: Record<DisplayUnit, string> = { cm: 'cm', m: 'm', in: 'in', ft: 'ft' };
const CM_PER_UNIT: Record<DisplayUnit, number> = { cm: 1, m: 100, in: 2.54, ft: 30.48 };

export function cmToUnit(valueCm: number, unit: DisplayUnit): number {
  return valueCm / CM_PER_UNIT[unit];
}
export function unitToCm(value: number, unit: DisplayUnit): number {
  return value * CM_PER_UNIT[unit];
}
export function formatUnit(valueCm: number, unit: DisplayUnit): string {
  const precision: Record<DisplayUnit, number> = { cm: 1, m: 3, in: 2, ft: 2 };
  return `${cmToUnit(valueCm, unit).toFixed(precision[unit])} ${UNIT_LABELS[unit]}`;
}
export const DEFAULT_UNIT: DisplayUnit = 'cm';
