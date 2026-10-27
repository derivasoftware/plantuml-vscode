/**
 * Read-only interaction on the drawing — drag entities (positions survive
 * live re-renders thanks to stable ids), toggle detail filters, pan and
 * zoom, reset either. The source is never touched.
 */

import { applyView, filters, positions, rerender, stage, view } from "./render";

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
      (el.classList.contains("pr-box") ||
        el.classList.contains("pr-note") ||
        el.classList.contains("pr-container"))
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
    void rerender();
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

function wireToolbar(): void {
  const bind = (id: string, key: keyof typeof filters) => {
    const box = document.getElementById(id) as HTMLInputElement;
    box.addEventListener("change", () => {
      filters[key] = box.checked;
      void rerender();
    });
  };
  bind("f-members", "members");
  bind("f-namespaces", "namespaces");
  bind("f-notes", "notes");
  document.getElementById("reset-layout")!.addEventListener("click", () => {
    for (const key of Object.keys(positions)) delete positions[key];
    void rerender();
  });
  document.getElementById("reset-view")!.addEventListener("click", () => {
    view.x = 0;
    view.y = 0;
    view.scale = 1;
    applyView();
  });
}

export function wireInteraction(): void {
  const s = stage();
  s.addEventListener("pointerdown", onPointerDown);
  s.addEventListener("pointermove", onPointerMove);
  s.addEventListener("pointerup", onPointerUp);
  s.addEventListener("wheel", onWheel, { passive: false });
  wireToolbar();
}
