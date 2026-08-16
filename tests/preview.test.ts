import { join } from "node:path";

import { build } from "esbuild";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(__dirname, "..");
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
