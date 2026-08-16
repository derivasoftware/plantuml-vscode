/**
 * POC interactive preview: parse (wasm) → filter (IR) → render (engine),
 * with read-only interaction on top — drag entities (positions survive
 * live re-renders thanks to stable ids), toggle detail filters, pan/zoom.
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

interface PreviewConfig {
  treeSitterWasm: string;
  grammarWasm: string;
}

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };
declare global {
  interface Window {
    __PREVIEW__: PreviewConfig;
  }
}

const vscode = acquireVsCodeApi();

// ── State ────────────────────────────────────────────────────────────────────

let parser: Parser | undefined;
let source = "";
const positions: Record<string, { dx: number; dy: number }> = {};
const filters = { members: true, namespaces: true, notes: true };
const view = { x: 0, y: 0, scale: 1 };

const root = () => document.getElementById("root")!;
const stage = () => document.getElementById("stage")!;

// ── Render pipeline ──────────────────────────────────────────────────────────

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

function rerender(): void {
  try {
    const ir = currentIr();
    if (!ir) return;
    root().innerHTML = renderSvg(ir, { positions });
    applyView();
  } catch (err) {
    root().innerHTML = `<pre class="error">${String(err)}</pre>`;
  }
}

function applyView(): void {
  root().style.transform =
    `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
}

// ── Interaction: drag entities ───────────────────────────────────────────────

interface Drag {
  id: string;
  startX: number;
  startY: number;
  baseDx: number;
  baseDy: number;
}
let drag: Drag | null = null;
let panning: { startX: number; startY: number; baseX: number; baseY: number } | null =
  null;

function draggableGroup(target: EventTarget | null): SVGGElement | null {
  let el = target as Element | null;
  while (el && el.tagName !== "svg") {
    if (
      el instanceof SVGGElement &&
      (el.classList.contains("pr-box") || el.classList.contains("pr-note"))
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

function onPointerDown(ev: PointerEvent): void {
  const group = draggableGroup(ev.target);
  if (group) {
    const base = positions[group.id] ?? { dx: 0, dy: 0 };
    drag = {
      id: group.id,
      startX: ev.clientX,
      startY: ev.clientY,
      baseDx: base.dx,
      baseDy: base.dy,
    };
  } else {
    panning = {
      startX: ev.clientX,
      startY: ev.clientY,
      baseX: view.x,
      baseY: view.y,
    };
  }
  stage().setPointerCapture(ev.pointerId);
}

let renderQueued = false;
function queueRender(): void {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    rerender();
  });
}

function onPointerMove(ev: PointerEvent): void {
  if (drag) {
    positions[drag.id] = {
      dx: drag.baseDx + Math.round((ev.clientX - drag.startX) / view.scale),
      dy: drag.baseDy + Math.round((ev.clientY - drag.startY) / view.scale),
    };
    queueRender();
  } else if (panning) {
    view.x = panning.baseX + (ev.clientX - panning.startX);
    view.y = panning.baseY + (ev.clientY - panning.startY);
    applyView();
  }
}

function onPointerUp(): void {
  drag = null;
  panning = null;
}

function onWheel(ev: WheelEvent): void {
  ev.preventDefault();
  const factor = ev.deltaY < 0 ? 1.1 : 1 / 1.1;
  const next = Math.min(4, Math.max(0.2, view.scale * factor));
  // zoom around the cursor
  const rect = stage().getBoundingClientRect();
  const cx = ev.clientX - rect.left;
  const cy = ev.clientY - rect.top;
  view.x = cx - ((cx - view.x) * next) / view.scale;
  view.y = cy - ((cy - view.y) * next) / view.scale;
  view.scale = next;
  applyView();
}

// ── Toolbar ──────────────────────────────────────────────────────────────────

function wireToolbar(): void {
  const bind = (id: string, key: keyof typeof filters) => {
    const box = document.getElementById(id) as HTMLInputElement;
    box.addEventListener("change", () => {
      filters[key] = box.checked;
      rerender();
    });
  };
  bind("f-members", "members");
  bind("f-namespaces", "namespaces");
  bind("f-notes", "notes");
  document.getElementById("reset-layout")!.addEventListener("click", () => {
    for (const key of Object.keys(positions)) delete positions[key];
    rerender();
  });
  document.getElementById("reset-view")!.addEventListener("click", () => {
    view.x = 0;
    view.y = 0;
    view.scale = 1;
    applyView();
  });
}

// ── Boot ─────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  const cfg = window.__PREVIEW__;
  await Parser.init({ locateFile: () => cfg.treeSitterWasm });
  const language = await Language.load(cfg.grammarWasm);
  parser = new Parser();
  parser.setLanguage(language);

  const s = stage();
  s.addEventListener("pointerdown", onPointerDown);
  s.addEventListener("pointermove", onPointerMove);
  s.addEventListener("pointerup", onPointerUp);
  s.addEventListener("wheel", onWheel, { passive: false });
  wireToolbar();

  window.addEventListener("message", (event) => {
    const msg = event.data as { type: string; text?: string };
    if (msg.type !== "source" || typeof msg.text !== "string") return;
    source = msg.text;
    rerender();
  });

  vscode.postMessage({ type: "ready" });
}

void init();
