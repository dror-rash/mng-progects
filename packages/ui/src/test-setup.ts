import "@testing-library/jest-dom/vitest";

// Radix popper (tooltips) measures its anchor with ResizeObserver, which jsdom lacks.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
