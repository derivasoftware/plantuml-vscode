/**
 * Webview entry: loads the grammar, wires the interaction, follows the
 * editor's theme and draws every source the host posts.
 */

import { wireInteraction } from "./interaction";
import { loadParser, rerender, setSource, syncTheme, type PreviewConfig } from "./render";

declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };
declare global {
  interface Window {
    __PREVIEW__: PreviewConfig;
  }
}

const vscode = acquireVsCodeApi();

async function init(): Promise<void> {
  syncTheme();
  new MutationObserver(syncTheme).observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
  await loadParser(window.__PREVIEW__);
  wireInteraction();

  window.addEventListener("message", (event) => {
    const msg = event.data as { type: string; text?: string };
    if (msg.type === "source" && typeof msg.text === "string") {
      setSource(msg.text);
      void rerender();
    }
  });

  vscode.postMessage({ type: "ready" });
}

void init();
