import { getDb } from './connection';

export interface CustomObject {
  id: number;
  name: string;
  path_data: string;
  width_cm: number;
  height_cm: number;
  thumbnail: string | null;
  created_at: string;
}

export interface CustomObjectInput {
  name: string;
  path_data: string;
  width_cm: number;
  height_cm: number;
  thumbnail?: string | null;
}

export function getAllCustomObjects(): CustomObject[] {
  return getDb().prepare('SELECT * FROM custom_objects ORDER BY created_at DESC').all() as CustomObject[];
}

export function createCustomObject(input: CustomObjectInput): CustomObject {
  const db = getDb();
  const result = db.prepare(
    `INSERT INTO custom_objects (name, path_data, width_cm, height_cm, thumbnail)
     VALUES (?, ?, ?, ?, ?)`
  ).run(input.name, input.path_data, input.width_cm, input.height_cm, input.thumbnail ?? null);
  return db.prepare('SELECT * FROM custom_objects WHERE id = ?').get(result.lastInsertRowid) as CustomObject;
}

export function deleteCustomObject(id: number): void {
  getDb().prepare('DELETE FROM custom_objects WHERE id = ?').run(id);
}
