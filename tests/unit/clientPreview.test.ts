// @covers client.preview.registerPreview
// @covers client.preview.activePlantumlDocument
// @covers client.preview.showPreview
// @covers client.preview.postSource
// @covers client.preview.html
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as stub from "../stubs/vscode";

const expandIncludes = vi.hoisted(() =>
  vi.fn(async (text: string, _base: string, _loader: unknown) => `expanded:${text}`),
);

vi.mock("vscode", () => import("../stubs/vscode"));
vi.mock("plantuml-render/preprocess", () => ({ expandIncludes }));

import {
  activePlantumlDocument,
  html,
  postSource,
  registerPreview,
  showPreview,
} from "../../src/client/preview";

const context = { subscriptions: [] as unknown[], extensionUri: "ext:" };

function doc(text = "@startuml", language = "plantuml", fsPath = "/ws/sub/a.puml") {
  return { languageId: language, getText: () => text, uri: { fsPath } };
}

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
}

function openPanel() {
  stub.state.activeDocument = doc();
  showPreview(context as never);
  return stub.state.panels[0];
}

beforeEach(() => {
  // disposing any live panel clears the module's top-level state
  stub.state.panels.forEach((panel) => panel.dispose());
  stub.reset();
  vi.clearAllMocks();
  context.subscriptions = [];
});

describe("activePlantumlDocument", () => {
  it("is undefined without an active editor", () => {
    expect(activePlantumlDocument()).toBeUndefined();
  });

  it("is undefined when the active document is another language", () => {
    stub.state.activeDocument = doc("# hi", "markdown");
    expect(activePlantumlDocument()).toBeUndefined();
  });

  it("returns the active plantuml document itself", () => {
    const active = doc();
    stub.state.activeDocument = active;
    expect(activePlantumlDocument()).toBe(active);
  });
});

describe("showPreview", () => {
  it("asks for a .puml file and opens nothing when none is active", () => {
    showPreview(context as never);
    expect(stub.state.panels).toHaveLength(0);
    expect(stub.state.infoMessages).toEqual([
      "PlantUML: open a .puml file to preview it.",
    ]);
  });

  it("creates the panel beside the editor, scripted and confined to media", () => {
    const panel = openPanel();
    expect(stub.window.createWebviewPanel).toHaveBeenCalledWith(
      "plantumlPreview",
      "PlantUML Preview",
      { viewColumn: stub.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        localResourceRoots: ["ext:/media"],
        retainContextWhenHidden: true,
      },
    );
    expect(panel.webview.html).toContain('<div id="stage">');
  });

  it("posts nothing until the webview says it is ready", async () => {
    const panel = openPanel();
    await flush();
    expect(panel.webview.postMessage).not.toHaveBeenCalled();
    panel.webview.receive({ type: "ready" });
    await flush();
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      type: "source",
      text: "expanded:@startuml",
    });
  });

  it("ignores other webview messages", async () => {
    const panel = openPanel();
    panel.webview.receive({ type: "other" });
    await flush();
    expect(expandIncludes).not.toHaveBeenCalled();
  });

  it("posts nothing on ready if no plantuml document is active by then", async () => {
    const panel = openPanel();
    stub.state.activeDocument = doc("# hi", "markdown");
    panel.webview.receive({ type: "ready" });
    await flush();
    expect(panel.webview.postMessage).not.toHaveBeenCalled();
  });

  it("reveals the live panel and posts the source instead of opening another", async () => {
    const panel = openPanel();
    showPreview(context as never);
    await flush();
    expect(stub.state.panels).toHaveLength(1);
    expect(panel.reveal).toHaveBeenCalledWith(stub.ViewColumn.Beside, true);
    expect(panel.webview.postMessage).toHaveBeenCalledOnce();
  });

  it("opens a new panel after the previous one was disposed", () => {
    const first = openPanel();
    first.dispose();
    showPreview(context as never);
    expect(stub.state.panels).toHaveLength(2);
    expect(first.reveal).not.toHaveBeenCalled();
  });
});

describe("postSource", () => {
  it("expands from the document's directory and posts the result", async () => {
    const panel = openPanel();
    postSource(doc("@startuml\nA\n@enduml", "plantuml", "/repo/x/y.puml") as never);
    await flush();
    expect(expandIncludes).toHaveBeenCalledWith(
      "@startuml\nA\n@enduml",
      "/repo/x",
      expect.anything(),
    );
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      type: "source",
      text: "expanded:@startuml\nA\n@enduml",
    });
  });

  it("posts to nobody once the panel is gone", async () => {
    const panel = openPanel();
    panel.dispose();
    postSource(doc() as never);
    await flush();
    expect(expandIncludes).toHaveBeenCalledOnce();
    expect(panel.webview.postMessage).not.toHaveBeenCalled();
  });

  describe("the include loader it hands over", () => {
    async function loader() {
      postSource(doc() as never);
      await flush();
      return expandIncludes.mock.calls[0][2] as {
        read(file: string): Promise<string | null>;
        resolve(base: string, relative: string): string;
        dirname(file: string): string;
      };
    }

    it("reads a workspace file as utf-8 text", async () => {
      const read = vi
        .spyOn(stub.workspace.fs, "readFile")
        .mockResolvedValueOnce(Buffer.from("caña", "utf8") as never);
      const text = await (await loader()).read("/ws/inc.puml");
      expect(text).toBe("caña");
      expect(read).toHaveBeenCalledWith(
        expect.objectContaining({ fsPath: "/ws/inc.puml" }),
      );
      read.mockRestore();
    });

    it("reports an unreadable file as null", async () => {
      await expect((await loader()).read("/ws/missing.puml")).resolves.toBeNull();
    });

    it("resolves relative includes against the base and names directories", async () => {
      const l = await loader();
      expect(l.resolve("/ws/sub", "../inc.puml")).toBe("/ws/inc.puml");
      expect(l.dirname("/ws/sub/a.puml")).toBe("/ws/sub");
    });
  });
});

describe("html", () => {
  const webview = {
    cspSource: "csp-origin:",
    asWebviewUri: (uri: unknown) => `uri<${String(uri)}>`,
  };
  const page = () => html(context as never, webview as never);

  it("locks the CSP to the webview origin and allows wasm", () => {
    const csp = /Content-Security-Policy" content="([^"]+)"/.exec(page())![1];
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("connect-src csp-origin:");
    expect(csp).toContain("img-src data:");
    expect(csp).toContain("style-src 'unsafe-inline'");
    expect(csp).toMatch(/script-src 'nonce-[^']+' 'wasm-unsafe-eval'/);
  });

  it("stamps every script tag with the CSP's nonce", () => {
    const text = page();
    const nonce = /'nonce-([^']+)'/.exec(text)![1];
    const stamped = [...text.matchAll(/<script nonce="([^"]+)"/g)].map((m) => m[1]);
    expect(stamped).toEqual([nonce, nonce]);
    expect(text.match(/<script/g)).toHaveLength(2);
  });

  it("draws a new nonce per page", () => {
    const nonce = (text: string) => /'nonce-([^']+)'/.exec(text)![1];
    expect(nonce(page())).not.toBe(nonce(page()));
  });

  it("points the assets at webview uris under the extension's media", () => {
    const text = page();
    expect(text).toContain('treeSitterWasm: "uri<ext:/media/tree-sitter.wasm>"');
    expect(text).toContain('grammarWasm: "uri<ext:/media/tree-sitter-plantuml.wasm>"');
    expect(text).toContain('src="uri<ext:/media/preview.js>"');
  });

  it("carries the elements the webview script looks up", () => {
    const text = page();
    for (const id of [
      "f-members",
      "f-namespaces",
      "f-notes",
      "reset-layout",
      "reset-view",
      "stage",
      "root",
    ]) {
      expect(text).toContain(`id="${id}"`);
    }
  });
});

describe("registerPreview", () => {
  it("adds the command and both editor listeners to the context", () => {
    registerPreview(context as never);
    expect(context.subscriptions).toHaveLength(3);
    expect(stub.state.onDidChangeTextDocument).toHaveLength(1);
    expect(stub.state.onDidChangeActiveTextEditor).toHaveLength(1);
  });

  it("wires plantuml.showPreview to the preview", () => {
    registerPreview(context as never);
    stub.state.activeDocument = doc();
    stub.state.commands["plantuml.showPreview"]();
    expect(stub.state.panels).toHaveLength(1);
  });

  it("does nothing on editor events while no panel is open", async () => {
    registerPreview(context as never);
    const active = doc();
    stub.state.activeDocument = active;
    stub.state.onDidChangeTextDocument[0]({ document: active });
    stub.state.onDidChangeActiveTextEditor[0]();
    await flush();
    expect(expandIncludes).not.toHaveBeenCalled();
  });

  it("re-posts edits of the active document only", async () => {
    registerPreview(context as never);
    const panel = openPanel();
    const active = stub.state.activeDocument;
    stub.state.onDidChangeTextDocument[0]({ document: doc("other file") });
    await flush();
    expect(panel.webview.postMessage).not.toHaveBeenCalled();
    stub.state.onDidChangeTextDocument[0]({ document: active });
    await flush();
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      type: "source",
      text: "expanded:@startuml",
    });
  });

  it("follows the active editor to plantuml documents only", async () => {
    registerPreview(context as never);
    const panel = openPanel();
    stub.state.activeDocument = doc("# hi", "markdown");
    stub.state.onDidChangeActiveTextEditor[0]();
    await flush();
    expect(panel.webview.postMessage).not.toHaveBeenCalled();
    stub.state.activeDocument = doc("next");
    stub.state.onDidChangeActiveTextEditor[0]();
    await flush();
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      type: "source",
      text: "expanded:next",
    });
  });
});
