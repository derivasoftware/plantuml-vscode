// @covers client.serverOptions.resolveServerCommand
// @covers client.serverOptions.documentSelector
import { describe, expect, it } from "vitest";

import {
  DEFAULT_LSP_COMMAND,
  documentSelector,
  resolveServerCommand,
} from "../../src/client/serverOptions";

describe("resolveServerCommand", () => {
  it.each([[undefined], [""], ["   "], ["\t\n"]])(
    "falls back to plantuml-lsp for the blank path %j",
    (configured) => {
      expect(resolveServerCommand(configured)).toBe("plantuml-lsp");
      expect(DEFAULT_LSP_COMMAND).toBe("plantuml-lsp");
    },
  );

  it("returns a configured path as given", () => {
    expect(resolveServerCommand("/opt/venv/bin/plantuml-lsp")).toBe(
      "/opt/venv/bin/plantuml-lsp",
    );
  });

  it("strips the whitespace around a configured path and keeps the inner one", () => {
    expect(resolveServerCommand("  /opt/my tools/lsp \n")).toBe(
      "/opt/my tools/lsp",
    );
  });
});

describe("documentSelector", () => {
  it("selects only plantuml documents on the file scheme", () => {
    expect(documentSelector()).toEqual([
      { scheme: "file", language: "plantuml" },
    ]);
  });

  it("returns a fresh selector on each call", () => {
    const first = documentSelector();
    first[0].language = "changed";
    expect(documentSelector()[0].language).toBe("plantuml");
  });
});
