import React from 'react';
import { useLibraryStore } from '../../store/library.store';
import type { PresetDefinition } from './PresetObjects';
import type { CustomObjectDef } from '../../store/library.store';

interface PresetItemProps {
  preset: PresetDefinition;
}

export function PresetLibraryItem({ preset }: PresetItemProps) {
  const { setDragItem } = useLibraryStore();

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-blue-50 group select-none"
      onMouseDown={() => setDragItem({ type: 'preset', preset })}
    >
      {/* Simple colored thumbnail */}
      <div
        className="w-8 h-6 rounded flex-shrink-0 border border-gray-200"
        style={{ backgroundColor: (preset.shape as { color?: string }).color ?? '#3b82f6', opacity: 0.5 }}
      />
      <span className="text-xs text-gray-700 truncate">{preset.label}</span>
    </div>
  );
}

interface CustomItemProps {
  custom: CustomObjectDef;
  onDelete: (id: number) => void;
}

export function CustomLibraryItem({ custom, onDelete }: CustomItemProps) {
  const { setDragItem } = useLibraryStore();

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-blue-50 group select-none"
      onMouseDown={() => setDragItem({ type: 'custom', custom })}
    >
      {custom.thumbnail ? (
        <img
          src={custom.thumbnail}
          alt={custom.name}
          className="w-8 h-6 rounded flex-shrink-0 object-contain border border-gray-200"
          style={{ backgroundColor: '#f9fafb' }}
        />
      ) : (
        <div className="w-8 h-6 rounded flex-shrink-0 border border-gray-200 bg-gray-100 flex items-center justify-center">
          <span className="text-gray-400 text-xs">?</span>
        </div>
      )}
      <span className="text-xs text-gray-700 truncate flex-1">{custom.name}</span>
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onDelete(custom.id); }}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs transition-all"
      >
        ×
      </button>
    </div>
  );
}
