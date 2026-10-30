const byName = new Intl.Collator(undefined, { sensitivity: "base" });

/** The primary contact first (the person to reach), then the rest by name. Returns a new array. */
export function primaryFirst<T extends { id: string; name: string }>(contacts: T[], primaryContactId: string | null): T[] {
  return [...contacts].sort(
    (a, b) => Number(b.id === primaryContactId) - Number(a.id === primaryContactId) || byName.compare(a.name, b.name),
  );
}
