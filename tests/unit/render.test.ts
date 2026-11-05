// @covers webview.render.root
// @covers webview.render.stage
// @covers webview.render.loadParser
// @covers webview.render.setSource
// @covers webview.render.currentIr
// @covers webview.render.rerender
// @covers webview.render.applyView
// @covers webview.render.syncTheme
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { flush, installDom, type FakeDom } from "../stubs/dom";

// loaded once, so that it stays the same instance across vi.resetModules()
const engine = await vi.hoisted(() => import("../stubs/webviewEngine"));
vi.mock("web-tree-sitter", () => engine);
vi.mock("plantuml-render/browser", () => engine);

let dom: FakeDom;
let render: typeof import("../../src/webview/render");

const config = { treeSitterWasm: "ts.wasm", grammarWasm: "grammar.wasm" };

async function loadedWith(source: string) {
  await render.loadParser(config);
  render.setSource(source);
}

/** A renderSvg call the test settles by hand, to order overlapping renders. */
function deferredRender() {
  let resolve!: (svg: string) => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<string>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  engine.renderSvg.mockImplementationOnce(() => promise);
  return { resolve, reject };
}

beforeEach(async () => {
  dom = installDom();
  // parser, source and the render generation live in module state
  vi.resetModules();
  vi.resetAllMocks();
  render = await import("../../src/webview/render");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("root and stage", () => {
  it("look the elements up in the document", () => {
    expect(render.root()).toBe(dom.root);
    expect(render.stage()).toBe(dom.stage);
  });
});

describe("loadParser", () => {
  it("initialises tree-sitter with the configured runtime wasm", async () => {
    await render.loadParser(config);
    expect(engine.init).toHaveBeenCalledOnce();
    const { locateFile } = engine.init.mock.calls[0][0];
    expect(locateFile()).toBe("ts.wasm");
  });

  it("loads the configured grammar into the parser", async () => {
    await render.loadParser(config);
    expect(engine.Language.load).toHaveBeenCalledWith("grammar.wasm");
    expect(engine.setLanguage).toHaveBeenCalledWith({ grammar: "grammar.wasm" });
  });

  it("rejects and leaves no parser behind when the grammar fails to load", async () => {
    engine.Language.load.mockRejectedValueOnce(new Error("bad wasm"));
    await expect(render.loadParser(config)).rejects.toThrow("bad wasm");
    render.setSource("A");
    expect(render.currentIr()).toBeNull();
    expect(engine.parse).not.toHaveBeenCalled();
  });
});

describe("setSource and currentIr", () => {
  it("is null before the parser is loaded", () => {
    render.setSource("A");
    expect(render.currentIr()).toBeNull();
    expect(engine.parse).not.toHaveBeenCalled();
  });

  it("is null with no source, without parsing", async () => {
    await render.loadParser(config);
    expect(render.currentIr()).toBeNull();
    expect(engine.parse).not.toHaveBeenCalled();
  });

  it("is null when the parser yields no tree", async () => {
    await loadedWith("A");
    engine.parse.mockReturnValueOnce(null);
    expect(render.currentIr()).toBeNull();
    expect(engine.treeToIr).not.toHaveBeenCalled();
  });

  it("parses the latest source set", async () => {
    await loadedWith("first");
    render.setSource("second");
    expect(render.currentIr()).toEqual({
      from: { text: "second" },
      applied: [],
    });
    expect(engine.parse).toHaveBeenCalledWith("second");
  });

  it("applies no projection while every filter is on", async () => {
    await loadedWith("A");
    render.currentIr();
    expect(engine.stripSections).not.toHaveBeenCalled();
    expect(engine.flattenContainers).not.toHaveBeenCalled();
    expect(engine.hideNotes).not.toHaveBeenCalled();
  });

  it.each([
    ["members", "stripSections"],
    ["namespaces", "flattenContainers"],
    ["notes", "hideNotes"],
  ] as const)("switching off %s applies only %s", async (filter, projection) => {
    await loadedWith("A");
    render.filters[filter] = false;
    expect(render.currentIr()!.applied).toEqual([projection]);
  });

  it("chains the projections when every filter is off", async () => {
    await loadedWith("A");
    render.filters.members = false;
    render.filters.namespaces = false;
    render.filters.notes = false;
    expect(render.currentIr()!.applied).toEqual([
      "stripSections",
      "flattenContainers",
      "hideNotes",
    ]);
  });
});

describe("rerender", () => {
  it("leaves the stage alone while there is nothing to draw", async () => {
    dom.root.innerHTML = "Loading grammar…";
    await render.rerender();
    expect(engine.renderSvg).not.toHaveBeenCalled();
    expect(dom.root.innerHTML).toBe("Loading grammar…");
    expect(dom.root.style.transform).toBeUndefined();
  });

  it("writes the svg and applies the view", async () => {
    await loadedWith("A");
    render.view.x = 3;
    await render.rerender();
    expect(dom.root.innerHTML).toBe('<svg data-from="A"></svg>');
    expect(dom.root.style.transform).toBe("translate(3px, 0px) scale(1)");
  });

  it("hands the live drag offsets to the engine", async () => {
    await loadedWith("A");
    render.positions["e1"] = { dx: 4, dy: 5 };
    await render.rerender();
    const [, options] = engine.renderSvg.mock.calls[0];
    expect(options.positions).toBe(render.positions);
  });

  it("shows a render failure as an error block", async () => {
    await loadedWith("A");
    engine.renderSvg.mockRejectedValueOnce(new Error("layout failed"));
    await render.rerender();
    expect(dom.root.innerHTML).toBe(
      '<pre class="error">Error: layout failed</pre>',
    );
  });

  it("shows a failure to build the IR the same way", async () => {
    await loadedWith("A");
    engine.treeToIr.mockImplementationOnce(() => {
      throw new Error("bad tree");
    });
    await render.rerender();
    expect(dom.root.innerHTML).toBe('<pre class="error">Error: bad tree</pre>');
  });

  it("drops an older render that finishes after a newer one", async () => {
    await loadedWith("A");
    const older = deferredRender();
    const newer = deferredRender();
    const first = render.rerender();
    const second = render.rerender();
    newer.resolve("<svg>newer</svg>");
    await second;
    older.resolve("<svg>older</svg>");
    await first;
    expect(dom.root.innerHTML).toBe("<svg>newer</svg>");
  });

  it("drops an older render that finishes before a newer one", async () => {
    await loadedWith("A");
    const older = deferredRender();
    const newer = deferredRender();
    const first = render.rerender();
    const second = render.rerender();
    older.resolve("<svg>older</svg>");
    await first;
    expect(dom.root.innerHTML).toBe("");
    newer.resolve("<svg>newer</svg>");
    await second;
    expect(dom.root.innerHTML).toBe("<svg>newer</svg>");
  });

  it("drops the failure of an older render", async () => {
    await loadedWith("A");
    const older = deferredRender();
    const newer = deferredRender();
    const first = render.rerender();
    const second = render.rerender();
    newer.resolve("<svg>newer</svg>");
    await second;
    older.reject(new Error("too late"));
    await first;
    await flush();
    expect(dom.root.innerHTML).toBe("<svg>newer</svg>");
  });
});

describe("applyView", () => {
  it("writes the identity transform by default", () => {
    render.applyView();
    expect(dom.root.style.transform).toBe("translate(0px, 0px) scale(1)");
  });

  it("writes the current view as translate and scale", () => {
    render.view.x = -12.5;
    render.view.y = 40;
    render.view.scale = 1.5;
    render.applyView();
    expect(dom.root.style.transform).toBe("translate(-12.5px, 40px) scale(1.5)");
  });
});

describe("syncTheme", () => {
  it.each([
    [[], "light"],
    [["vscode-light"], "light"],
    [["vscode-dark"], "dark"],
    [["vscode-high-contrast"], "dark"],
  ] as [string[], string][])("maps body classes %j to %s", (classes, theme) => {
    dom.body.classList.set(...classes);
    render.syncTheme();
    expect(dom.html.dataset.theme).toBe(theme);
  });

  it("follows a live theme change", () => {
    dom.body.classList.set("vscode-dark");
    render.syncTheme();
    dom.body.classList.set("vscode-light");
    render.syncTheme();
    expect(dom.html.dataset.theme).toBe("light");
  });
});
