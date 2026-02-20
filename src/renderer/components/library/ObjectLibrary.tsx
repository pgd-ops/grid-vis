import React, { useState } from 'react';
import { PRESETS, PRESET_CATEGORIES } from './PresetObjects';
import { PresetLibraryItem, CustomLibraryItem } from './LibraryItem';
import { useLibraryStore } from '../../store/library.store';
import CustomObjectCreator from './CustomObjectCreator';

type Category = typeof PRESET_CATEGORIES[number] | 'Custom';

const ALL_CATEGORIES: Category[] = [...PRESET_CATEGORIES, 'Custom'];

export default function ObjectLibrary() {
  const [activeCategory, setActiveCategory] = useState<Category>('Desks');
  const [showCreator, setShowCreator] = useState(false);
  const { customObjects, removeCustomObject } = useLibraryStore();

  async function handleDeleteCustom(id: number) {
    if (!confirm('Delete this custom object?')) return;
    await window.api.deleteCustomObject(id);
    removeCustomObject(id);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Library</h2>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200">
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto py-1">
        {activeCategory === 'Custom' ? (
          <>
            <button
              onClick={() => setShowCreator(true)}
              className="w-full text-left px-3 py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
            >
              + Create Custom Object…
            </button>
            {customObjects.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400">No custom objects yet</p>
            )}
            {customObjects.map((obj) => (
              <CustomLibraryItem
                key={obj.id}
                custom={obj}
                onDelete={handleDeleteCustom}
              />
            ))}
          </>
        ) : (
          PRESETS.filter((p) => p.category === activeCategory).map((preset) => (
            <PresetLibraryItem key={preset.id} preset={preset} />
          ))
        )}
      </div>

      {showCreator && (
        <CustomObjectCreator onClose={() => setShowCreator(false)} />
      )}
    </div>
  );
}
