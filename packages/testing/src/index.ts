/** Shared test data builders. Add one builder per domain object. */
export function build<T extends object>(defaults: T) {
  return (overrides: Partial<T> = {}): T => ({ ...defaults, ...overrides });
}
