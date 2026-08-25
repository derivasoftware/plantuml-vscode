/**
 * Activation behaviour: the preview registers always, the language
 * client only when enabled, and a server that fails to start degrades
 * to a warning instead of breaking activation.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as stub from "./stubs/vscode";

vi.mock("vscode", () => import("./stubs/vscode"));
vi.mock("plantuml-render/browser", () => ({
  expandIncludes: vi.fn(async (text: string) => text),
}));

const started: string[] = [];
const stopped: string[] = [];
let failStart = false;

vi.mock("vscode-languageclient/node", () => ({
  LanguageClient: class {
    constructor(
      _id: string,
      _name: string,
      public serverOptions: { command: string },
    ) {}
    async start() {
      if (failStart) throw new Error("spawn ENOENT");
      started.push(this.serverOptions.command);
    }
    async stop() {
      stopped.push(this.serverOptions.command);
    }
  },
}));

import { activate, deactivate } from "../src/client/extension";

function context() {
  return { subscriptions: [] as unknown[], extensionUri: "ext:" } as never;
}

beforeEach(async () => {
  await deactivate();
  stub.reset();
  started.length = 0;
  stopped.length = 0;
  failStart = false;
});

describe("activation", () => {
  it("skips the language client when lsp.enabled is false", async () => {
    stub.state.config["plantuml.lsp.enabled"] = false;
    await activate(context());
    expect(stub.state.commands["plantuml.showPreview"]).toBeDefined();
    expect(started).toHaveLength(0);
  });

  it("starts the client with the configured server path", async () => {
    stub.state.config["plantuml.lsp.path"] = "/venv/bin/plantuml-lsp";
    await activate(context());
    expect(started).toEqual(["/venv/bin/plantuml-lsp"]);
  });

  it("degrades to a warning when the server cannot start", async () => {
    failStart = true;
    await activate(context());
    expect(stub.state.warningMessages[0]).toContain("could not start");
    expect(stub.state.warningMessages[0]).toContain("pip install plantuml-lsp");
    await deactivate();
    expect(stopped).toHaveLength(0);
  });

  it("stops the running client on deactivate", async () => {
    await activate(context());
    expect(started).toHaveLength(1);
    await deactivate();
    expect(stopped).toEqual(started);
  });
});
