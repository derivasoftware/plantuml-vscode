/**
 * Stub of the webview's two external collaborators, `web-tree-sitter` (wasm)
 * and `plantuml-render/browser` (the layout engine). Mock both with this
 * module. The projections tag the IR so tests can read which ones ran, in
 * which order. Load it through `vi.hoisted` so that `vi.resetModules()` does not
 * fork it, and restore the defaults with `vi.resetAllMocks()`.
 */
import { vi } from "vitest";

export interface FakeIr {
  from: unknown;
  applied: string[];
}

const projection = (name: string) =>
  vi.fn((ir: FakeIr) => ({ ...ir, applied: [...ir.applied, name] }));

export const init = vi.fn(
  async (_options: { locateFile: () => string }): Promise<void> => undefined,
);
export const parse = vi.fn((text: string): unknown => ({ rootNode: { text } }));
export const setLanguage = vi.fn();

export class Parser {
  static init = init;
  parse = parse;
  setLanguage = setLanguage;
}

export const Language = {
  load: vi.fn(async (path: string) => ({ grammar: path })),
};

export const treeToIr = vi.fn(
  (node: unknown): FakeIr => ({ from: node, applied: [] }),
);
export const stripSections = projection("stripSections");
export const flattenContainers = projection("flattenContainers");
export const hideNotes = projection("hideNotes");
export const renderSvg = vi.fn(
  async (ir: FakeIr, _options: { positions: unknown }): Promise<string> =>
    `<svg data-from="${(ir.from as { text: string }).text}"></svg>`,
);
