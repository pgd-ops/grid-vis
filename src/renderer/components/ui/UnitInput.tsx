import React, { useState, useEffect } from 'react';
import { cmToUnit, unitToCm, ALL_UNITS, UNIT_LABELS, type DisplayUnit } from '../../utils/units';

const PRECISION: Record<DisplayUnit, number> = { cm: 1, m: 3, in: 2, ft: 2 };
const STEP: Record<DisplayUnit, number> = { cm: 1, m: 0.01, in: 0.25, ft: 0.1 };

interface UnitInputProps {
  valueCm: number;
  onChange: (newCm: number) => void;
  unit: DisplayUnit;
  onUnitChange: (unit: DisplayUnit) => void;
  label?: string;
  readOnly?: boolean;
  step?: number;
  className?: string;
}

export default function UnitInput({
  valueCm,
  onChange,
  unit,
  onUnitChange,
  label,
  readOnly = false,
  step,
  className = '',
}: UnitInputProps) {
  const [localStr, setLocalStr] = useState(() =>
    cmToUnit(valueCm, unit).toFixed(PRECISION[unit])
  );

  // Sync when external valueCm or unit changes (but not while user is editing)
  useEffect(() => {
    setLocalStr(cmToUnit(valueCm, unit).toFixed(PRECISION[unit]));
  }, [valueCm, unit]);

  function commit() {
    const parsed = parseFloat(localStr);
    if (!isNaN(parsed)) {
      onChange(unitToCm(parsed, unit));
    } else {
      // Reset display to current value
      setLocalStr(cmToUnit(valueCm, unit).toFixed(PRECISION[unit]));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      commit();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setLocalStr(cmToUnit(valueCm, unit).toFixed(PRECISION[unit]));
      (e.target as HTMLInputElement).blur();
    }
  }

  return (
    <div className={`flex ${className}`}>
      {label && (
        <span className="block text-xs text-gray-500 mb-1 w-full">{label}</span>
      )}
      <input
        type="number"
        value={localStr}
        readOnly={readOnly}
        step={step ?? STEP[unit]}
        onChange={(e) => setLocalStr(e.target.value)}
        onBlur={readOnly ? undefined : commit}
        onKeyDown={readOnly ? undefined : handleKeyDown}
        className="flex-1 min-w-0 bg-white border border-gray-200 border-r-0 rounded-l px-2 py-1 text-sm text-gray-900 focus:outline-none focus:border-blue-500 disabled:opacity-60"
      />
      <select
        value={unit}
        onChange={(e) => onUnitChange(e.target.value as DisplayUnit)}
        className="bg-white border border-gray-200 rounded-r px-1 py-1 text-xs text-gray-700 focus:outline-none focus:border-blue-500 cursor-pointer"
      >
        {ALL_UNITS.map((u) => (
          <option key={u} value={u}>{UNIT_LABELS[u]}</option>
        ))}
      </select>
    </div>
  );
}
