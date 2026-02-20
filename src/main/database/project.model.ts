import { getDb } from './connection';

export interface Project {
  id: number;
  name: string;
  width_cm: number;
  height_cm: number;
  grid_size: number;
  thumbnail?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectInput {
  name: string;
  width_cm?: number;
  height_cm?: number;
  grid_size?: number;
  default_unit?: string | null;
  thumbnail?: string | null;
}

export function getAllProjects(): Project[] {
  return getDb().prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as Project[];
}

export function getProject(id: number): Project | undefined {
  return getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;
}

export function createProject(input: ProjectInput): Project {
  const db = getDb();
  const result = db.prepare(
    `INSERT INTO projects (name, width_cm, height_cm, grid_size, default_unit)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    input.name,
    input.width_cm ?? 500,
    input.height_cm ?? 400,
    input.grid_size ?? 20,
    input.default_unit ?? null,
  );
  return getProject(result.lastInsertRowid as number)!;
}

export function updateProject(id: number, updates: Partial<ProjectInput>): Project {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.width_cm !== undefined) { fields.push('width_cm = ?'); values.push(updates.width_cm); }
  if (updates.height_cm !== undefined) { fields.push('height_cm = ?'); values.push(updates.height_cm); }
  if (updates.grid_size !== undefined) { fields.push('grid_size = ?'); values.push(updates.grid_size); }
  if (updates.default_unit !== undefined) { fields.push('default_unit = ?'); values.push(updates.default_unit ?? null); }
  if (updates.thumbnail !== undefined) { fields.push('thumbnail = ?'); values.push(updates.thumbnail ?? null); }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getProject(id)!;
}

export function deleteProject(id: number): void {
  getDb().prepare('DELETE FROM projects WHERE id = ?').run(id);
}

export function duplicateProject(id: number): Project {
  const db = getDb();
  const src = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project & { default_unit?: string | null };
  const result = db.prepare(
    `INSERT INTO projects (name, width_cm, height_cm, grid_size, default_unit)
     VALUES (?, ?, ?, ?, ?)`
  ).run(`${src.name} (Copy)`, src.width_cm, src.height_cm, src.grid_size, src.default_unit ?? null);

  const newId = result.lastInsertRowid as number;

  const elements = db.prepare('SELECT * FROM room_elements WHERE project_id = ?').all(id) as Array<Record<string, unknown>>;
  const insertEl = db.prepare(`
    INSERT INTO room_elements
      (project_id, type, subtype, label, x, y, width, height, rotation, scale_x, scale_y,
       x1, y1, x2, y2, swing_angle, swing_dir, path_data, display_unit, z_index)
    VALUES
      (@project_id, @type, @subtype, @label, @x, @y, @width, @height, @rotation, @scale_x, @scale_y,
       @x1, @y1, @x2, @y2, @swing_angle, @swing_dir, @path_data, @display_unit, @z_index)
  `);
  const txn = db.transaction(() => {
    for (const el of elements) {
      insertEl.run({ ...el, project_id: newId });
    }
  });
  txn();

  return getProject(newId)!;
}
