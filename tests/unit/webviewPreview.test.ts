// @covers webview.preview.init
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { flush, installDom, type FakeDom } from "../stubs/dom";

// loaded once, so that it stays the same instance across vi.resetModules()
const engine = await vi.hoisted(() => import("../stubs/webviewEngine"));
vi.mock("web-tree-sitter", () => engine);
vi.mock("plantuml-render/browser", () => engine);

let dom: FakeDom;
let preview: typeof import("../../src/webview/preview");
let postMessage: ReturnType<typeof vi.fn>;
let acquire: ReturnType<typeof vi.fn>;

/**
 * The module calls init() on import. Let that first run settle, then wipe what
 * it recorded, so each test observes only the init() it calls itself.
 */
async function importAndClear() {
  preview = await import("../../src/webview/preview");
  await flush();
  dom.window.listeners = {};
  dom.stage.listeners = {};
  dom.observers.length = 0;
  dom.html.dataset = {};
  vi.clearAllMocks();
}

function deliver(data: unknown) {
  dom.window.fire("message", { data });
}

beforeEach(async () => {
  dom = installDom();
  postMessage = vi.fn();
  acquire = vi.fn(() => ({ postMessage }));
  vi.stubGlobal("acquireVsCodeApi", acquire);
  vi.resetModules();
  vi.resetAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("module entry", () => {
  it("acquires the host api once and runs on import", async () => {
    await import("../../src/webview/preview");
    await flush();
    expect(acquire).toHaveBeenCalledOnce();
    expect(postMessage).toHaveBeenCalledWith({ type: "ready" });
  });
});

describe("init", () => {
  beforeEach(importAndClear);

  it("loads the parser from the wasm paths the host page declared", async () => {
    dom.window.__PREVIEW__ = { treeSitterWasm: "a.wasm", grammarWasm: "b.wasm" };
    await preview.init();
    expect(engine.init.mock.calls[0][0].locateFile()).toBe("a.wasm");
    expect(engine.Language.load).toHaveBeenCalledWith("b.wasm");
  });

  it("applies the theme before anything loads", async () => {
    dom.body.classList.set("vscode-dark");
    engine.init.mockImplementationOnce(() => new Promise(() => undefined));
    void preview.init();
    await flush();
    expect(dom.html.dataset.theme).toBe("dark");
  });

  it("watches the body's class and re-syncs the theme when it changes", async () => {
    await preview.init();
    expect(dom.observers).toHaveLength(1);
    const [observer] = dom.observers;
    expect(observer.observe).toHaveBeenCalledWith(dom.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    dom.body.classList.set("vscode-dark");
    observer.callback();
    expect(dom.html.dataset.theme).toBe("dark");
  });

  it("announces ready and wires the stage only after the parser has loaded", async () => {
    let finishLoading!: () => void;
    engine.init.mockImplementationOnce(
      () => new Promise<void>((resolve) => (finishLoading = resolve)),
    );
    const running = preview.init();
    await flush();
    expect(postMessage).not.toHaveBeenCalled();
    expect(dom.stage.listeners).toEqual({});

    finishLoading();
    await running;
    expect(postMessage).toHaveBeenCalledOnce();
    expect(postMessage).toHaveBeenCalledWith({ type: "ready" });
    expect(Object.keys(dom.stage.listeners).sort()).toEqual([
      "pointerdown",
      "pointermove",
      "pointerup",
      "wheel",
    ]);
  });

  it("draws a source message from the host", async () => {
    await preview.init();
    deliver({ type: "source", text: "@startuml" });
    await flush();
    expect(engine.parse).toHaveBeenCalledWith("@startuml");
    expect(dom.root.innerHTML).toBe('<svg data-from="@startuml"></svg>');
  });

  it("draws the latest of several source messages", async () => {
    await preview.init();
    deliver({ type: "source", text: "one" });
    await flush();
    deliver({ type: "source", text: "two" });
    await flush();
    expect(dom.root.innerHTML).toBe('<svg data-from="two"></svg>');
  });

  it.each([
    ["another type", { type: "other", text: "x" }],
    ["a source without text", { type: "source" }],
    ["a source with non-string text", { type: "source", text: 42 }],
  ])("ignores %s", async (_label, data) => {
    await preview.init();
    dom.root.innerHTML = "before";
    deliver(data);
    await flush();
    expect(engine.parse).not.toHaveBeenCalled();
    expect(dom.root.innerHTML).toBe("before");
  });
});
