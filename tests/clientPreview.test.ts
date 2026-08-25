/**
 * Behaviour tests for the preview controller: panel lifecycle, the
 * webview message protocol, the debounced-and-aborted jar renders and
 * the engine override. `vscode`, the include expander and the jar
 * renderer are stubbed; disposing any live panel between tests clears
 * the module's top-level state.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as stub from "./stubs/vscode";

vi.mock("vscode", () => import("./stubs/vscode"));
vi.mock("plantuml-render/browser", () => ({
  expandIncludes: vi.fn(async (text: string) => `expanded:${text}`),
}));
vi.mock("../src/client/jarRenderer", () => ({
  renderWithJar: vi.fn(async () => ({ svg: "<svg>jar</svg>", error: "" })),
}));

import { renderWithJar } from "../src/client/jarRenderer";
import * as preview from "../src/client/preview";

const context = {
  subscriptions: [] as unknown[],
  extensionUri: "ext:",
} as never;

function doc(text = "@startuml\nA -> B\n@enduml", language = "plantuml") {
  return {
    languageId: language,
    getText: () => text,
    uri: { fsPath: "/ws/diagram.puml" },
  };
}

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
}

beforeEach(() => {
  // disposing any live panel clears the module's top-level state
  stub.state.panels.forEach((panel) => panel.dispose());
  stub.reset();
  vi.clearAllMocks();
  vi.mocked(renderWithJar).mockResolvedValue({ svg: "<svg>jar</svg>", error: "" });
  preview.registerPreview(context);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("panel lifecycle", () => {
  it("asks for a .puml file when none is active", () => {
    stub.state.activeDocument = doc("x", "markdown");
    stub.state.commands["plantuml.showPreview"]();
    expect(stub.state.panels).toHaveLength(0);
    expect(stub.state.infoMessages[0]).toContain("open a .puml file");
  });

  it("creates one panel and reveals it on the second invocation", () => {
    stub.state.activeDocument = doc();
    stub.state.commands["plantuml.showPreview"]();
    stub.state.commands["plantuml.showPreview"]();
    expect(stub.state.panels).toHaveLength(1);
    expect(stub.state.panels[0].reveal).toHaveBeenCalled();
  });

  it("serves nonce-locked CSP html carrying both wasm uris", () => {
    stub.state.activeDocument = doc();
    stub.state.commands["plantuml.showPreview"]();
    const html = stub.state.panels[0].webview.html;
    expect(html).toContain("default-src 'none'");
    expect(html).toMatch(/script-src 'nonce-[^']+' 'wasm-unsafe-eval'/);
    expect(html).toContain("tree-sitter-plantuml.wasm");
    expect(html).toContain("preview.js");
  });
});

describe("message protocol", () => {
  it("answers the webview's ready with the expanded source", async () => {
    stub.state.activeDocument = doc("@startuml\nclass A\n@enduml");
    stub.state.commands["plantuml.showPreview"]();
    const panel = stub.state.panels[0];
    panel.webview.receive({ type: "ready" });
    await flush();
    expect(panel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "source",
        text: "expanded:@startuml\nclass A\n@enduml",
        engine: "native",
      }),
    );
  });

  it("re-posts on active-document edits and ignores other documents", async () => {
    stub.state.activeDocument = doc();
    stub.state.commands["plantuml.showPreview"]();
    const panel = stub.state.panels[0];
    stub.state.onDidChangeTextDocument.forEach((cb) =>
      cb({ document: stub.state.activeDocument }),
    );
    await flush();
    const after = panel.webview.postMessage.mock.calls.length;
    stub.state.onDidChangeTextDocument.forEach((cb) => cb({ document: doc() }));
    await flush();
    expect(after).toBeGreaterThan(0);
    expect(panel.webview.postMessage.mock.calls.length).toBe(after);
  });

  it("re-posts when the render configuration changes", async () => {
    stub.state.activeDocument = doc();
    stub.state.commands["plantuml.showPreview"]();
    const panel = stub.state.panels[0];
    panel.webview.receive({ type: "ready" });
    await flush();
    const before = panel.webview.postMessage.mock.calls.length;
    stub.state.onDidChangeConfiguration.forEach((cb) =>
      cb({ affectsConfiguration: (s: string) => s === "plantuml.render" }),
    );
    await flush();
    expect(panel.webview.postMessage.mock.calls.length).toBeGreaterThan(before);
  });
});

describe("engine override and jar debounce", () => {
  it("switching to plantuml.jar schedules one debounced render", async () => {
    vi.useFakeTimers();
    stub.state.activeDocument = doc();
    stub.state.commands["plantuml.showPreview"]();
    const panel = stub.state.panels[0];
    panel.webview.receive({ type: "engine", engine: "plantuml" });
    panel.webview.receive({ type: "engine", engine: "plantuml" });
    expect(renderWithJar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(350);
    expect(renderWithJar).toHaveBeenCalledTimes(1);
    await vi.runAllTicks();
    vi.useRealTimers();
    await flush();
    expect(panel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "jar-svg", svg: "<svg>jar</svg>" }),
    );
  });

  it("a newer request aborts the in-flight jar render", async () => {
    vi.useFakeTimers();
    stub.state.activeDocument = doc();
    stub.state.commands["plantuml.showPreview"]();
    const panel = stub.state.panels[0];
    const signals: AbortSignal[] = [];
    vi.mocked(renderWithJar).mockImplementation(
      async (_t, _d, _o, signal) => {
        signals.push(signal as AbortSignal);
        return { svg: "<svg>jar</svg>", error: "" };
      },
    );
    panel.webview.receive({ type: "engine", engine: "plantuml" });
    await vi.advanceTimersByTimeAsync(350);
    stub.state.onDidChangeTextDocument.forEach((cb) =>
      cb({ document: stub.state.activeDocument }),
    );
    await vi.advanceTimersByTimeAsync(350);
    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
    vi.useRealTimers();
  });

  it("disposing the panel clears the engine override", async () => {
    stub.state.activeDocument = doc();
    stub.state.commands["plantuml.showPreview"]();
    const first = stub.state.panels[0];
    first.webview.receive({ type: "engine", engine: "plantuml" });
    first.dispose();
    stub.state.commands["plantuml.showPreview"]();
    const second = stub.state.panels[1];
    second.webview.receive({ type: "ready" });
    await flush();
    expect(second.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ engine: "native" }),
    );
  });
});
