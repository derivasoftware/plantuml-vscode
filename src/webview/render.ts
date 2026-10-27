/**
 * The drawing: parse (wasm) → filter (IR) → render (engine), into the
 * stage, in the editor's theme. Holds the state the drawing reads —
 * drag offsets, detail filters, the view transform — which the
 * interaction writes.
 */

import {
  flattenContainers,
  hideNotes,
  renderSvg,
  stripSections,
  treeToIr,
  type CstNode,
  type RenderIr,
} from "plantuml-render/browser";
import { Language, Parser } from "web-tree-sitter";

export interface PreviewConfig {
  treeSitterWasm: string;
  grammarWasm: string;
}

export const positions: Record<string, { dx: number; dy: number }> = {};
export const filters = { members: true, namespaces: true, notes: true };
export const view = { x: 0, y: 0, scale: 1 };

let parser: Parser | undefined;
let source = "";

export const root = () => document.getElementById("root")!;
export const stage = () => document.getElementById("stage")!;

export async function loadParser(cfg: PreviewConfig): Promise<void> {
  await Parser.init({ locateFile: () => cfg.treeSitterWasm });
  const language = await Language.load(cfg.grammarWasm);
  parser = new Parser();
  parser.setLanguage(language);
}

export function setSource(text: string): void {
  source = text;
}

function currentIr(): RenderIr | null {
  if (!parser || !source) return null;
  const tree = parser.parse(source);
  if (!tree) return null;
  let ir = treeToIr(tree.rootNode as unknown as CstNode);
  if (!filters.members) ir = stripSections(ir);
  if (!filters.namespaces) ir = flattenContainers(ir);
  if (!filters.notes) ir = hideNotes(ir);
  return ir;
}

// Layout is asynchronous; a drag fires renders faster than they finish, so
// only the latest one may write the stage.
let renderGeneration = 0;

export async function rerender(): Promise<void> {
  const generation = ++renderGeneration;
  try {
    const ir = currentIr();
    if (!ir) return;
    const svg = await renderSvg(ir, { positions });
    if (generation !== renderGeneration) return;
    root().innerHTML = svg;
    applyView();
  } catch (err) {
    if (generation !== renderGeneration) return;
    root().innerHTML = `<pre class="error">${String(err)}</pre>`;
  }
}

export function applyView(): void {
  root().style.transform =
    `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
}

// The renderer themes itself from the root's data-theme; VS Code states its
// theme as a body class instead, and changes it live.
export function syncTheme(): void {
  const body = document.body.classList;
  const dark = body.contains("vscode-dark") || body.contains("vscode-high-contrast");
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}
