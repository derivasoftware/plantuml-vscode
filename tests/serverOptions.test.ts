import { describe, expect, it } from "vitest";

import {
  DEFAULT_LSP_COMMAND,
  documentSelector,
  resolveServerCommand,
} from "../src/client/serverOptions";

describe("resolveServerCommand", () => {
  it("falls back to the default command", () => {
    expect(resolveServerCommand(undefined)).toBe(DEFAULT_LSP_COMMAND);
    expect(resolveServerCommand("")).toBe(DEFAULT_LSP_COMMAND);
    expect(resolveServerCommand("   ")).toBe(DEFAULT_LSP_COMMAND);
  });

  it("honours a configured path", () => {
    expect(resolveServerCommand("/opt/venv/bin/plantuml-lsp")).toBe(
      "/opt/venv/bin/plantuml-lsp",
    );
  });
});

describe("documentSelector", () => {
  it("targets file-scheme plantuml documents", () => {
    expect(documentSelector()).toEqual([
      { scheme: "file", language: "plantuml" },
    ]);
  });
});
