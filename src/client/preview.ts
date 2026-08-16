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
  body { margin: 0; padding: 8px; background: var(--vscode-editor-background); }
  .error { color: var(--vscode-errorForeground); white-space: pre-wrap; }
  svg { max-width: 100%; height: auto; }
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
<div id="root">Loading grammar…</div>
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
