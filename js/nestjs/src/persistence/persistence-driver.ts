export const PERSISTENCE_DRIVERS = ['memory', 'file', 'sqlite', 'typeorm'] as const;
export type PersistenceDriver = (typeof PERSISTENCE_DRIVERS)[number];

export interface PersistenceOptions {
  driver: PersistenceDriver;
  /** path file JSON (driver=file) */
  filePath?: string;
  /** path file database, default ':memory:' (driver=sqlite/typeorm) */
  database?: string;
}

export function parseDriver(value: string | undefined): PersistenceDriver {
  const v = (value ?? 'memory') as PersistenceDriver;
  if (!PERSISTENCE_DRIVERS.includes(v)) {
    throw new Error(`PERSISTENCE harus salah satu dari ${PERSISTENCE_DRIVERS.join('|')}, dapat "${value}"`);
  }
  return v;
}
