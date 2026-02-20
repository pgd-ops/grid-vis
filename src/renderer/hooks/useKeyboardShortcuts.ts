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

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const { selectedIds: ids, elements, updateElement, pushHistory: push } = useCanvasStore.getState();
        if (ids.length === 0) return;
        e.preventDefault();
        const NUDGE_CM = 1;
        const dx = e.key === 'ArrowLeft' ? -NUDGE_CM : e.key === 'ArrowRight' ? NUDGE_CM : 0;
        const dy = e.key === 'ArrowUp'   ? -NUDGE_CM : e.key === 'ArrowDown'  ? NUDGE_CM : 0;
        ids.forEach(id => {
          const el = elements.find(el => el.id === id);
          if (!el) return;
          if (el.x1 != null && el.y1 != null && el.x2 != null && el.y2 != null) {
            updateElement(id, { x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy });
          } else {
            updateElement(id, { x: (el as any).x + dx, y: (el as any).y + dy });
          }
        });
        push();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, removeElement, setSelectedIds, undo, redo, pushHistory, onSave, onDelete]);
}
