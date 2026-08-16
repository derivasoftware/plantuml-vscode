/**
 * Webview side of the self-contained preview: parse with the wasm
 * grammar (web-tree-sitter), map and draw with plantuml-render's
 * browser entry. No Java, no server, no native binaries.
 */

import { renderSvg, treeToIr, type CstNode } from "plantuml-render/browser";
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

function show(html: string): void {
  const root = document.getElementById("root");
  if (root) root.innerHTML = html;
}

async function init(): Promise<void> {
  const cfg = window.__PREVIEW__;
  await Parser.init({
    locateFile: () => cfg.treeSitterWasm,
  });
  const language = await Language.load(cfg.grammarWasm);
  const parser = new Parser();
  parser.setLanguage(language);

  window.addEventListener("message", (event) => {
    const msg = event.data as { type: string; text?: string };
    if (msg.type !== "source" || typeof msg.text !== "string") return;
    try {
      const tree = parser.parse(msg.text);
      if (!tree) throw new Error("parser returned no tree");
      const svg = renderSvg(treeToIr(tree.rootNode as unknown as CstNode));
      show(svg);
    } catch (err) {
      show(`<pre class="error">${String(err)}</pre>`);
    }
  });

  vscode.postMessage({ type: "ready" });
}

void init();
