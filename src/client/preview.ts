import * as path from "node:path";

import {
  expandIncludes,
  type IncludeLoader,
} from "plantuml-render/browser";
import * as vscode from "vscode";

const loader: IncludeLoader = {
  async read(file: string): Promise<string | null> {
    try {
      const data = await vscode.workspace.fs.readFile(vscode.Uri.file(file));
      return Buffer.from(data).toString("utf8");
    } catch {
      return null;
    }
  },
  resolve(base: string, relative: string): string {
    return path.resolve(base, relative);
  },
  dirname(file: string): string {
    return path.dirname(file);
  },
};

let panel: vscode.WebviewPanel | undefined;

export function registerPreview(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("plantuml.showPreview", () =>
      showPreview(context),
    ),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (panel && event.document === activePlantumlDocument()) {
        postSource(event.document);
      }
    }),
    vscode.window.onDidChangeActiveTextEditor(() => {
      const doc = activePlantumlDocument();
      if (panel && doc) postSource(doc);
    }),
  );
}

function activePlantumlDocument(): vscode.TextDocument | undefined {
  const doc = vscode.window.activeTextEditor?.document;
  return doc?.languageId === "plantuml" ? doc : undefined;
}

function showPreview(context: vscode.ExtensionContext): void {
  const doc = activePlantumlDocument();
  if (!doc) {
    void vscode.window.showInformationMessage(
      "PlantUML: open a .puml file to preview it.",
    );
    return;
  }
  if (panel) {
    panel.reveal(vscode.ViewColumn.Beside, true);
    postSource(doc);
    return;
  }
  panel = vscode.window.createWebviewPanel(
    "plantumlPreview",
    "PlantUML Preview",
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, "media"),
      ],
      retainContextWhenHidden: true,
    },
  );
  panel.onDidDispose(() => {
    panel = undefined;
  });
  panel.webview.onDidReceiveMessage((msg: { type: string }) => {
    if (msg.type === "ready") {
      const current = activePlantumlDocument();
      if (current) postSource(current);
    }
  });
  panel.webview.html = html(context, panel.webview);
}

function postSource(doc: vscode.TextDocument): void {
  void (async () => {
    const expanded = await expandIncludes(
      doc.getText(),
      path.dirname(doc.uri.fsPath),
      loader,
    );
    await panel?.webview.postMessage({ type: "source", text: expanded });
  })();
}

function html(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
): string {
  const media = (file: string) =>
    webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, "media", file),
    );
  const nonce = Buffer.from(
    String(Date.now()) + String(Math.random()),
  ).toString("base64");
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' 'wasm-unsafe-eval'`,
    "style-src 'unsafe-inline'",
    `connect-src ${webview.cspSource}`,
    "img-src data:",
  ].join("; ");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<style>
  body { margin: 0; background: var(--vscode-editor-background); overflow: hidden; }
  .error { color: var(--vscode-errorForeground); white-space: pre-wrap; }
  #toolbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 10;
    display: flex; gap: 14px; align-items: center; padding: 6px 10px;
    background: var(--vscode-editorWidget-background);
    border-bottom: 1px solid var(--vscode-editorWidget-border, transparent);
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family); font-size: 12px;
    user-select: none;
  }
  #toolbar label { display: flex; gap: 4px; align-items: center; cursor: pointer; }
  #toolbar button {
    background: var(--vscode-button-secondaryBackground, transparent);
    color: var(--vscode-button-secondaryForeground, inherit);
    border: 1px solid var(--vscode-editorWidget-border, currentColor);
    border-radius: 3px; padding: 2px 8px; cursor: pointer; font-size: 11px;
  }
  #stage {
    position: absolute; inset: 32px 0 0 0; overflow: hidden;
    cursor: grab; touch-action: none;
  }
  #root { position: absolute; transform-origin: 0 0; padding: 8px; }
  #root svg { display: block; }
  .pr-box, .pr-note, .pr-container { cursor: move; }
  /* Map the editor theme onto the engine's theming contract so strokes,
     text and fills stay visible on light AND dark editor backgrounds. */
  #root {
    --pr-stroke: var(--vscode-editor-foreground);
    --pr-text: var(--vscode-editor-foreground);
    --pr-box-fill: var(--vscode-editorWidget-background);
    --pr-note-fill: var(--vscode-editorWidget-background);
    --pr-container-fill: transparent;
    --pr-font: var(--vscode-editor-font-family, ui-monospace, monospace);
  }
</style>
</head>
<body>
<div id="toolbar">
  <label><input type="checkbox" id="f-members" checked> members</label>
  <label><input type="checkbox" id="f-namespaces" checked> namespaces</label>
  <label><input type="checkbox" id="f-notes" checked> notes</label>
  <button id="reset-layout">reset layout</button>
  <button id="reset-view">reset view</button>
</div>
<div id="stage"><div id="root">Loading grammar…</div></div>
<script nonce="${nonce}">
  window.__PREVIEW__ = {
    treeSitterWasm: "${media("tree-sitter.wasm")}",
    grammarWasm: "${media("tree-sitter-plantuml.wasm")}",
  };
</script>
<script nonce="${nonce}" src="${media("preview.js")}"></script>
</body>
</html>`;
}
