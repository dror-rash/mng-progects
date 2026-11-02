/** A stored coordinate ("32.800000", numeric(9, 6)) without trailing zeros ("32.8"); "" for none. */
export function formatCoordinate(value: string | null | undefined): string {
  return value === null || value === undefined ? "" : String(Number(value));
}
