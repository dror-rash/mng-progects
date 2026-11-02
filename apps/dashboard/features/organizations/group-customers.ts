/**
 * Orders a list of customers so each sub-company comes right after its parent (task 053), keeping the
 * order of everything else. A sub-company whose parent isn't in the list (a filter left it out) stays in
 * its own place. `nested` marks the ones listed under their parent.
 */
export function groupCustomers<T extends { id: string; parentId: string | null }>(rows: T[]): (T & { nested: boolean })[] {
  const listed = new Set(rows.map((r) => r.id));
  const children = new Map<string, T[]>();
  for (const row of rows) {
    if (row.parentId && listed.has(row.parentId)) {
      children.set(row.parentId, [...(children.get(row.parentId) ?? []), row]);
    }
  }
  return rows
    .filter((row) => !(row.parentId && listed.has(row.parentId)))
    .flatMap((row) => [{ ...row, nested: false }, ...(children.get(row.id) ?? []).map((child) => ({ ...child, nested: true }))]);
}
