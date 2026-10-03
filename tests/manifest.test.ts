import { readFileSync } from "node:fs";

import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");

const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

describe("preview contribution", () => {
  it("contributes the preview command and editor-title menu", () => {
    const commands = manifest.contributes.commands;
    expect(commands[0].command).toBe("plantuml.showPreview");
    const menu = manifest.contributes.menus["editor/title"][0];
    expect(menu.command).toBe("plantuml.showPreview");
    expect(menu.when).toContain("plantuml");
  });
});
