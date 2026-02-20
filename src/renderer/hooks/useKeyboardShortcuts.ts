import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvas.store';

interface Options {
  onSave?: () => void;
  onDelete?: () => void;
}

export function useKeyboardShortcuts({ onSave, onDelete }: Options = {}) {
  const { selectedIds, removeElement, setSelectedIds, undo, redo, pushHistory } = useCanvasStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      // Don't trigger shortcuts when typing in inputs
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          selectedIds.forEach((id) => removeElement(id));
          setSelectedIds([]);
          pushHistory();
          onDelete?.();
        }
      }

      if (e.key === 'Escape') {
        setSelectedIds([]);
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, removeElement, setSelectedIds, undo, redo, pushHistory, onSave, onDelete]);
}
