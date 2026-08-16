import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

describe("language contribution", () => {
  it("registers the plantuml language with all four extensions", () => {
    const lang = manifest.contributes.languages[0];
    expect(lang.id).toBe("plantuml");
    expect(lang.extensions).toEqual([".puml", ".plantuml", ".iuml", ".wsd"]);
  });

  it("wires the TextMate grammar to the language", () => {
    const grammar = manifest.contributes.grammars[0];
    expect(grammar.language).toBe("plantuml");
    expect(grammar.scopeName).toBe("source.plantuml");
    const tm = JSON.parse(
      readFileSync(join(root, grammar.path), "utf8"),
    );
    expect(tm.scopeName).toBe("source.plantuml");
    expect(Object.keys(tm.repository).length).toBeGreaterThan(8);
  });

  it("exposes the lsp path and enabled settings", () => {
    const props = manifest.contributes.configuration.properties;
    expect(props["plantuml.lsp.path"].default).toBe("plantuml-lsp");
    expect(props["plantuml.lsp.enabled"].default).toBe(true);
  });
});

describe("preview contribution", () => {
  it("contributes the preview command and editor-title menu", () => {
    const commands = manifest.contributes.commands;
    expect(commands[0].command).toBe("plantuml.showPreview");
    const menu = manifest.contributes.menus["editor/title"][0];
    expect(menu.command).toBe("plantuml.showPreview");
    expect(menu.when).toContain("plantuml");
  });
});
