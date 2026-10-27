/**
 * Behaviour tests for the preview controller: panel lifecycle, the
 * webview message protocol. `vscode` and the include expander are
 * stubbed; disposing any live panel between tests clears the module's
 * top-level state.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as stub from "../stubs/vscode";

vi.mock("vscode", () => import("../stubs/vscode"));
vi.mock("plantuml-render/preprocess", () => ({
  expandIncludes: vi.fn(async (text: string) => `expanded:${text}`),
}));
import * as preview from "../../src/client/preview";

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
  preview.registerPreview(context);
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
});

describe("host bundle", () => {
  it("carries include expansion and no layout engine", async () => {
    const { build } = await import("esbuild");
    const { join } = await import("node:path");
    const result = await build({
      entryPoints: [join(__dirname, "..", "..", "src/client/extension.ts")],
      bundle: true,
      format: "cjs",
      platform: "node",
      external: ["vscode"],
      write: false,
    });
    const bundle = result.outputFiles[0].text;
    expect(bundle).toContain("expandIncludes");
    expect(bundle).not.toContain("org.eclipse.elk");
    expect(bundle).not.toContain("renderSvg");
  }, 30000);
});
