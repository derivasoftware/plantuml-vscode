import { join } from "node:path";

import { build } from "esbuild";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
let bundle = "";

// Build the webview exactly as `npm run bundle` does (unminified, so
// identifiers survive) and assert on the result: proves the pipeline
// and the interaction wiring are present in what actually ships.
beforeAll(async () => {
  const result = await build({
    entryPoints: [join(root, "src/webview/preview.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    external: ["fs", "path", "module"],
    write: false,
  });
  bundle = result.outputFiles[0].text;
}, 30000);

describe("webview pipeline", () => {
  it("bundles the wasm parser and the render engine", () => {
    expect(bundle).toContain("treeToIr");
    expect(bundle).toContain("renderSvg");
    expect(bundle).toContain("grammarWasm");
  });

  it("never reaches for eval — CSP allows wasm only", () => {
    expect(bundle).not.toMatch(/[^.\w]eval\s*\(\s*["'`]/);
  });

  it("themes the drawing from the editor's theme, live", () => {
    // VS Code states its theme as a body class; the renderer reads the
    // root's data-theme, so the webview translates and keeps watching
    expect(bundle).toContain("vscode-dark");
    expect(bundle).toContain("vscode-high-contrast");
    expect(bundle).toContain("dataset.theme");
    expect(bundle).toContain("MutationObserver");
  });

  it("lets only the latest render write the stage", () => {
    // layout is asynchronous and a drag fires renders faster than they
    // finish: an older result must never overwrite a newer one
    expect(bundle).toMatch(/await renderSvg\(/);
    expect(bundle).toContain("renderGeneration");
  });
});

describe("interactive preview", () => {
  it("wires the three detail filters to IR projections", () => {
    for (const id of ["f-members", "f-namespaces", "f-notes"]) {
      expect(bundle).toContain(id);
    }
    for (const fn of ["stripSections", "flattenContainers", "hideNotes"]) {
      expect(bundle).toContain(fn);
    }
  });

  it("drags boxes, notes and containers via position overrides", () => {
    for (const cls of ["pr-box", "pr-note", "pr-container"]) {
      expect(bundle).toContain(cls);
    }
    expect(bundle).toContain("positions");
  });

  it("offers layout and view resets", () => {
    expect(bundle).toContain("reset-layout");
    expect(bundle).toContain("reset-view");
  });
});

describe("one engine", () => {
  it("renders with the bundled engine only, no jar path ships", () => {
    expect(bundle).not.toContain("plantuml.jar");
    expect(bundle).not.toContain("jar-svg");
  });

  it("never pulls node builtins into the webview", () => {
    expect(bundle).not.toContain("child_process");
  });
});
