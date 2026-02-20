export interface PresetShape {
  type: 'rect';
  color?: string;
}

export interface PresetPathShape {
  type: 'path';
  data: string;
  color?: string;
}

export interface PresetDefinition {
  id: string;
  category: string;
  label: string;
  defaultWidth: number;   // cm
  defaultHeight: number;  // cm
  shape: PresetShape | PresetPathShape;
  color?: string;
}

export const PRESET_CATEGORIES = [
  'Desks',
  'Seating',
  'Tables',
  'Storage',
  'AV',
  'Room',
] as const;

// All dimensions in cm, positions in a normalized box
export const PRESETS: PresetDefinition[] = [
  // Desks
  { id: 'desk-standard', category: 'Desks', label: 'Desk', defaultWidth: 120, defaultHeight: 60, shape: { type: 'rect', color: '#3b82f6' } },
  { id: 'desk-lshape', category: 'Desks', label: 'L-Desk', defaultWidth: 160, defaultHeight: 120,
    shape: {
      type: 'path',
      data: 'M 0 0 L 160 0 L 160 60 L 60 60 L 60 120 L 0 120 Z',
      color: '#3b82f6',
    },
  },
  { id: 'desk-standing', category: 'Desks', label: 'Standing Desk', defaultWidth: 120, defaultHeight: 70, shape: { type: 'rect', color: '#06b6d4' } },

  // Seating
  { id: 'chair-office', category: 'Seating', label: 'Office Chair', defaultWidth: 55, defaultHeight: 55, shape: { type: 'rect', color: '#8b5cf6' } },
  { id: 'chair-side', category: 'Seating', label: 'Side Chair', defaultWidth: 50, defaultHeight: 50, shape: { type: 'rect', color: '#7c3aed' } },
  { id: 'sofa-2', category: 'Seating', label: '2-Seat Sofa', defaultWidth: 140, defaultHeight: 80, shape: { type: 'rect', color: '#6d28d9' } },
  { id: 'sofa-3', category: 'Seating', label: '3-Seat Sofa', defaultWidth: 200, defaultHeight: 85, shape: { type: 'rect', color: '#5b21b6' } },

  // Tables
  { id: 'table-round', category: 'Tables', label: 'Round Table', defaultWidth: 80, defaultHeight: 80,
    shape: { type: 'rect', color: '#b45309' },
  },
  { id: 'table-rect', category: 'Tables', label: 'Rect Table', defaultWidth: 120, defaultHeight: 80, shape: { type: 'rect', color: '#92400e' } },
  { id: 'table-conference', category: 'Tables', label: 'Conf. Table', defaultWidth: 240, defaultHeight: 100, shape: { type: 'rect', color: '#78350f' } },

  // Storage
  { id: 'bookshelf', category: 'Storage', label: 'Bookshelf', defaultWidth: 90, defaultHeight: 30, shape: { type: 'rect', color: '#065f46' } },
  { id: 'filing-cabinet', category: 'Storage', label: 'Filing Cabinet', defaultWidth: 40, defaultHeight: 60, shape: { type: 'rect', color: '#047857' } },

  // AV
  { id: 'monitor', category: 'AV', label: 'Monitor', defaultWidth: 55, defaultHeight: 20, shape: { type: 'rect', color: '#374151' } },
  { id: 'tv', category: 'AV', label: 'TV', defaultWidth: 120, defaultHeight: 15, shape: { type: 'rect', color: '#1f2937' } },
  { id: 'printer', category: 'AV', label: 'Printer', defaultWidth: 50, defaultHeight: 45, shape: { type: 'rect', color: '#374151' } },

  // Room features
  { id: 'window', category: 'Room', label: 'Window', defaultWidth: 100, defaultHeight: 15, shape: { type: 'rect', color: '#0ea5e9' } },
  { id: 'column', category: 'Room', label: 'Column', defaultWidth: 25, defaultHeight: 25, shape: { type: 'rect', color: '#6b7280' } },
];
