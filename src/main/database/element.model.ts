import { getDb } from './connection';

export interface RoomElementRow {
  id: number;
  project_id: number;
  type: string;
  subtype: string | null;
  label: string | null;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  rotation: number;
  scale_x: number;
  scale_y: number;
  x1: number | null;
  y1: number | null;
  x2: number | null;
  y2: number | null;
  swing_angle: number | null;
  swing_dir: string | null;
  path_data: string | null;
  display_unit: string | null;
  z_index: number;
  created_at: string;
  updated_at: string;
}

export interface ElementUpsertInput {
  id?: number;
  project_id: number;
  type: string;
  subtype?: string | null;
  label?: string | null;
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  rotation?: number;
  scale_x?: number;
  scale_y?: number;
  x1?: number | null;
  y1?: number | null;
  x2?: number | null;
  y2?: number | null;
  swing_angle?: number | null;
  swing_dir?: string | null;
  path_data?: string | null;
  display_unit?: string | null;
  z_index?: number;
}

export function getElementsForProject(projectId: number): RoomElementRow[] {
  return getDb()
    .prepare('SELECT * FROM room_elements WHERE project_id = ? ORDER BY z_index ASC, id ASC')
    .all(projectId) as RoomElementRow[];
}

export function upsertElements(elements: ElementUpsertInput[]): RoomElementRow[] {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO room_elements
      (id, project_id, type, subtype, label, x, y, width, height, rotation, scale_x, scale_y,
       x1, y1, x2, y2, swing_angle, swing_dir, path_data, display_unit, z_index, updated_at)
    VALUES
      (@id, @project_id, @type, @subtype, @label, @x, @y, @width, @height, @rotation, @scale_x, @scale_y,
       @x1, @y1, @x2, @y2, @swing_angle, @swing_dir, @path_data, @display_unit, @z_index, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      subtype = excluded.subtype,
      label = excluded.label,
      x = excluded.x,
      y = excluded.y,
      width = excluded.width,
      height = excluded.height,
      rotation = excluded.rotation,
      scale_x = excluded.scale_x,
      scale_y = excluded.scale_y,
      x1 = excluded.x1,
      y1 = excluded.y1,
      x2 = excluded.x2,
      y2 = excluded.y2,
      swing_angle = excluded.swing_angle,
      swing_dir = excluded.swing_dir,
      path_data = excluded.path_data,
      display_unit = excluded.display_unit,
      z_index = excluded.z_index,
      updated_at = datetime('now')
  `);

  const insertReturn = db.prepare(`
    INSERT INTO room_elements
      (project_id, type, subtype, label, x, y, width, height, rotation, scale_x, scale_y,
       x1, y1, x2, y2, swing_angle, swing_dir, path_data, display_unit, z_index)
    VALUES
      (@project_id, @type, @subtype, @label, @x, @y, @width, @height, @rotation, @scale_x, @scale_y,
       @x1, @y1, @x2, @y2, @swing_angle, @swing_dir, @path_data, @display_unit, @z_index)
  `);

  const results: RoomElementRow[] = [];
  const txn = db.transaction(() => {
    for (const el of elements) {
      const row = {
        id: el.id ?? null,
        project_id: el.project_id,
        type: el.type,
        subtype: el.subtype ?? null,
        label: el.label ?? null,
        x: el.x,
        y: el.y,
        width: el.width ?? null,
        height: el.height ?? null,
        rotation: el.rotation ?? 0,
        scale_x: el.scale_x ?? 1,
        scale_y: el.scale_y ?? 1,
        x1: el.x1 ?? null,
        y1: el.y1 ?? null,
        x2: el.x2 ?? null,
        y2: el.y2 ?? null,
        swing_angle: el.swing_angle ?? null,
        swing_dir: el.swing_dir ?? null,
        path_data: el.path_data ?? null,
        display_unit: el.display_unit ?? null,
        z_index: el.z_index ?? 0,
      };

      if (el.id) {
        upsert.run(row);
        results.push(
          db.prepare('SELECT * FROM room_elements WHERE id = ?').get(el.id) as RoomElementRow
        );
      } else {
        const res = insertReturn.run(row);
        results.push(
          db.prepare('SELECT * FROM room_elements WHERE id = ?').get(res.lastInsertRowid) as RoomElementRow
        );
      }
    }
  });
  txn();
  return results;
}

export function deleteElement(id: number): void {
  getDb().prepare('DELETE FROM room_elements WHERE id = ?').run(id);
}

export function deleteElementsForProject(projectId: number): void {
  getDb().prepare('DELETE FROM room_elements WHERE project_id = ?').run(projectId);
}
