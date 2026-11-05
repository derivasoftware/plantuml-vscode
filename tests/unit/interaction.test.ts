// @covers webview.interaction.draggableGroup
// @covers webview.interaction.onPointerDown
// @covers webview.interaction.onPointerMove
// @covers webview.interaction.onPointerUp
// @covers webview.interaction.onWheel
// @covers webview.interaction.queueRender
// @covers webview.interaction.wireToolbar
// @covers webview.interaction.wireInteraction
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  FakeElement,
  FakeSvgGroup,
  flush,
  installDom,
  type FakeDom,
} from "../stubs/dom";

// loaded once, so that it stays the same instance across vi.resetModules()
const engine = await vi.hoisted(() => import("../stubs/webviewEngine"));
vi.mock("web-tree-sitter", () => engine);
vi.mock("plantuml-render/browser", () => engine);

let dom: FakeDom;
let render: typeof import("../../src/webview/render");
let interaction: typeof import("../../src/webview/interaction");

function pointer(target: unknown, clientX: number, clientY: number, pointerId = 1) {
  return { target, clientX, clientY, pointerId } as never as PointerEvent;
}

function move(clientX: number, clientY: number) {
  return pointer(null, clientX, clientY);
}

function group(id: string, cls = "pr-box") {
  const g = new FakeSvgGroup([cls]);
  g.id = id;
  return g;
}

function wheel(deltaY: number, clientX = 0, clientY = 0) {
  return {
    deltaY,
    clientX,
    clientY,
    preventDefault: vi.fn(),
  } as never as WheelEvent & { preventDefault: ReturnType<typeof vi.fn> };
}

async function drawable() {
  await render.loadParser({ treeSitterWasm: "t", grammarWasm: "g" });
  render.setSource("A");
}

beforeEach(async () => {
  dom = installDom();
  // the gesture state and the shared view live in module state
  vi.resetModules();
  vi.resetAllMocks();
  render = await import("../../src/webview/render");
  interaction = await import("../../src/webview/interaction");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("draggableGroup", () => {
  it.each(["pr-box", "pr-note", "pr-container"])(
    "accepts an svg group of class %s",
    (cls) => {
      const g = group("e", cls);
      expect(interaction.draggableGroup(g as never)).toBe(g);
    },
  );

  it("walks up from a shape to its nearest draggable group", () => {
    const g = group("e");
    const inner = new FakeSvgGroup(["decoration"], g);
    const rect = new FakeElement("rect", [], inner);
    expect(interaction.draggableGroup(rect as never)).toBe(g);
  });

  it("is null for a null target", () => {
    expect(interaction.draggableGroup(null)).toBeNull();
  });

  it("is null when no ancestor is draggable", () => {
    const stage = new FakeElement("div");
    const rect = new FakeElement("rect", [], new FakeSvgGroup(["edge"], stage));
    expect(interaction.draggableGroup(rect as never)).toBeNull();
  });

  it("rejects a non-svg element carrying a draggable class", () => {
    const div = new FakeElement("div", ["pr-box"]);
    expect(interaction.draggableGroup(div as never)).toBeNull();
  });

  it("stops the walk at the svg element", () => {
    const outer = group("outer");
    const svg = new FakeElement("svg", [], outer);
    const rect = new FakeElement("rect", [], svg);
    expect(interaction.draggableGroup(rect as never)).toBeNull();
    expect(interaction.draggableGroup(svg as never)).toBeNull();
  });
});

describe("onPointerDown and onPointerMove", () => {
  it("captures the pointer on the stage for both gestures", () => {
    interaction.onPointerDown(pointer(group("e"), 0, 0, 7));
    interaction.onPointerUp();
    interaction.onPointerDown(pointer(dom.stage, 0, 0, 8));
    expect(dom.stage.setPointerCapture.mock.calls).toEqual([[7], [8]]);
  });

  it("drags an entity by the pointer's delta", () => {
    interaction.onPointerDown(pointer(group("e1"), 100, 100));
    interaction.onPointerMove(move(130, 90));
    expect(render.positions).toEqual({ e1: { dx: 30, dy: -10 } });
    expect(render.view).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it("measures each move from the gesture's start, not the last move", () => {
    interaction.onPointerDown(pointer(group("e1"), 100, 100));
    interaction.onPointerMove(move(110, 100));
    interaction.onPointerMove(move(120, 100));
    expect(render.positions["e1"]).toEqual({ dx: 20, dy: 0 });
  });

  it("continues from the offset an earlier drag left", () => {
    render.positions["e1"] = { dx: 5, dy: -5 };
    interaction.onPointerDown(pointer(group("e1"), 0, 0));
    interaction.onPointerMove(move(10, 10));
    expect(render.positions["e1"]).toEqual({ dx: 15, dy: 5 });
  });

  it("converts the delta to diagram units at the current zoom, rounded", () => {
    render.view.scale = 2;
    interaction.onPointerDown(pointer(group("e1"), 100, 100));
    interaction.onPointerMove(move(131, 90));
    expect(render.positions["e1"]).toEqual({ dx: 16, dy: -5 });
  });

  it("re-renders a drag on the next frame, not on the move", async () => {
    await drawable();
    interaction.onPointerDown(pointer(group("e1"), 0, 0));
    interaction.onPointerMove(move(5, 5));
    await flush();
    expect(engine.renderSvg).not.toHaveBeenCalled();
    dom.runFrames();
    await flush();
    expect(engine.renderSvg).toHaveBeenCalledOnce();
    expect(dom.root.innerHTML).toBe('<svg data-from="A"></svg>');
  });

  it("pans from the view's position when the press misses every entity", () => {
    render.view.x = 10;
    render.view.y = 20;
    interaction.onPointerDown(pointer(dom.stage, 100, 100));
    interaction.onPointerMove(move(105, 97));
    expect(render.view).toEqual({ x: 15, y: 17, scale: 1 });
    expect(dom.root.style.transform).toBe("translate(15px, 17px) scale(1)");
  });

  it("pans without touching positions or queuing a render", () => {
    interaction.onPointerDown(pointer(dom.stage, 0, 0));
    interaction.onPointerMove(move(5, 5));
    expect(render.positions).toEqual({});
    expect(dom.frames).toHaveLength(0);
  });

  it("does not scale a pan by the zoom", () => {
    render.view.scale = 2;
    interaction.onPointerDown(pointer(dom.stage, 0, 0));
    interaction.onPointerMove(move(10, 10));
    expect(render.view.x).toBe(10);
    expect(render.view.y).toBe(10);
  });

  it("ignores moves with no gesture under way", () => {
    interaction.onPointerMove(move(50, 50));
    expect(render.positions).toEqual({});
    expect(render.view).toEqual({ x: 0, y: 0, scale: 1 });
    expect(dom.root.style.transform).toBeUndefined();
    expect(dom.frames).toHaveLength(0);
  });
});

describe("onPointerUp", () => {
  it("ends a drag", () => {
    interaction.onPointerDown(pointer(group("e1"), 0, 0));
    interaction.onPointerMove(move(5, 0));
    interaction.onPointerUp();
    interaction.onPointerMove(move(50, 0));
    expect(render.positions["e1"]).toEqual({ dx: 5, dy: 0 });
  });

  it("ends a pan", () => {
    interaction.onPointerDown(pointer(dom.stage, 0, 0));
    interaction.onPointerMove(move(5, 0));
    interaction.onPointerUp();
    interaction.onPointerMove(move(50, 0));
    expect(render.view.x).toBe(5);
  });
});

describe("queueRender", () => {
  it("renders nothing until the frame runs", async () => {
    await drawable();
    interaction.queueRender();
    await flush();
    expect(dom.frames).toHaveLength(1);
    expect(engine.renderSvg).not.toHaveBeenCalled();
  });

  it("folds the requests of one frame into a single render", async () => {
    await drawable();
    interaction.queueRender();
    interaction.queueRender();
    interaction.queueRender();
    expect(dom.frames).toHaveLength(1);
    dom.runFrames();
    await flush();
    expect(engine.renderSvg).toHaveBeenCalledOnce();
  });

  it("schedules again once the frame has run", async () => {
    await drawable();
    interaction.queueRender();
    dom.runFrames();
    await flush();
    interaction.queueRender();
    expect(dom.frames).toHaveLength(1);
    dom.runFrames();
    await flush();
    expect(engine.renderSvg).toHaveBeenCalledTimes(2);
  });
});

describe("onWheel", () => {
  it("keeps the page from scrolling", () => {
    const ev = wheel(-1);
    interaction.onWheel(ev);
    expect(ev.preventDefault).toHaveBeenCalledOnce();
  });

  it("zooms in on a negative delta, around the cursor within the stage", () => {
    dom.stage.rect = { left: 10, top: 20 };
    interaction.onWheel(wheel(-100, 110, 70));
    expect(render.view.scale).toBeCloseTo(1.1);
    expect(render.view.x).toBeCloseTo(-10);
    expect(render.view.y).toBeCloseTo(-5);
    expect(dom.root.style.transform).toBe(
      `translate(${render.view.x}px, ${render.view.y}px) scale(${render.view.scale})`,
    );
  });

  it("zooms out on a positive delta", () => {
    interaction.onWheel(wheel(100, 100, 0));
    expect(render.view.scale).toBeCloseTo(1 / 1.1);
    expect(render.view.x).toBeCloseTo(100 - 100 / 1.1);
    expect(render.view.y).toBeCloseTo(0);
  });

  it("keeps the diagram point under the cursor fixed", () => {
    render.view.x = 30;
    render.view.y = -40;
    render.view.scale = 1.5;
    const under = () => ({
      x: (200 - render.view.x) / render.view.scale,
      y: (100 - render.view.y) / render.view.scale,
    });
    const before = under();
    interaction.onWheel(wheel(-1, 200, 100));
    expect(under().x).toBeCloseTo(before.x);
    expect(under().y).toBeCloseTo(before.y);
  });

  it("clamps the zoom at 4", () => {
    render.view.scale = 3.9;
    interaction.onWheel(wheel(-1));
    expect(render.view.scale).toBe(4);
  });

  it("clamps the zoom at 0.2", () => {
    render.view.scale = 0.21;
    interaction.onWheel(wheel(1));
    expect(render.view.scale).toBe(0.2);
  });

  it("does not shift the view at a zoom limit", () => {
    render.view.x = 7;
    render.view.y = 9;
    render.view.scale = 4;
    interaction.onWheel(wheel(-1, 300, 300));
    expect(render.view).toEqual({ x: 7, y: 9, scale: 4 });
  });
});

describe("wireToolbar", () => {
  it.each([
    ["f-members", "members", "stripSections"],
    ["f-namespaces", "namespaces", "flattenContainers"],
    ["f-notes", "notes", "hideNotes"],
  ] as const)("%s drives the %s filter and re-renders", async (id, key, projection) => {
    await drawable();
    interaction.wireToolbar();
    const box = dom.byId[id];

    box.checked = false;
    box.fire("change");
    await flush();
    expect(render.filters[key]).toBe(false);
    expect(engine[projection]).toHaveBeenCalledOnce();
    expect(engine.renderSvg).toHaveBeenCalledOnce();

    box.checked = true;
    box.fire("change");
    await flush();
    expect(render.filters[key]).toBe(true);
    expect(engine[projection]).toHaveBeenCalledOnce();
    expect(engine.renderSvg).toHaveBeenCalledTimes(2);
  });

  it("reset-layout forgets every drag offset and re-renders", async () => {
    await drawable();
    interaction.wireToolbar();
    render.positions["a"] = { dx: 1, dy: 1 };
    render.positions["b"] = { dx: 2, dy: 2 };
    dom.byId["reset-layout"].fire("click");
    await flush();
    expect(render.positions).toEqual({});
    expect(engine.renderSvg).toHaveBeenCalledOnce();
  });

  it("reset-view restores the identity view without re-rendering", async () => {
    await drawable();
    interaction.wireToolbar();
    render.view.x = 40;
    render.view.y = 50;
    render.view.scale = 3;
    render.positions["a"] = { dx: 1, dy: 1 };
    dom.byId["reset-view"].fire("click");
    await flush();
    expect(render.view).toEqual({ x: 0, y: 0, scale: 1 });
    expect(dom.root.style.transform).toBe("translate(0px, 0px) scale(1)");
    expect(render.positions).toEqual({ a: { dx: 1, dy: 1 } });
    expect(engine.renderSvg).not.toHaveBeenCalled();
  });
});

describe("wireInteraction", () => {
  it("binds the gesture handlers to the stage", () => {
    interaction.wireInteraction();
    const { listeners } = dom.stage;
    expect(listeners["pointerdown"][0].handler).toBe(interaction.onPointerDown);
    expect(listeners["pointermove"][0].handler).toBe(interaction.onPointerMove);
    expect(listeners["pointerup"][0].handler).toBe(interaction.onPointerUp);
    expect(listeners["wheel"][0].handler).toBe(interaction.onWheel);
  });

  it("registers the wheel listener as non-passive, so it can prevent scrolling", () => {
    interaction.wireInteraction();
    expect(dom.stage.listeners["wheel"][0].options).toEqual({ passive: false });
  });

  it("wires the toolbar too", () => {
    interaction.wireInteraction();
    render.view.x = 9;
    dom.byId["reset-view"].fire("click");
    expect(render.view.x).toBe(0);
  });
});
