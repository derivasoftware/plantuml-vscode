// @covers client.extension.activate
// @covers client.extension.deactivate
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as stub from "../stubs/vscode";

const lsp = vi.hoisted(() => ({
  clients: [] as {
    id: string;
    name: string;
    serverOptions: unknown;
    clientOptions: unknown;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }[],
  startError: undefined as Error | undefined,
}));

vi.mock("vscode", () => import("../stubs/vscode"));
vi.mock("vscode-languageclient/node", () => ({
  LanguageClient: class {
    start = vi.fn(async () => {
      if (lsp.startError) throw lsp.startError;
    });
    stop = vi.fn(async () => undefined);
    constructor(
      public id: string,
      public name: string,
      public serverOptions: unknown,
      public clientOptions: unknown,
    ) {
      lsp.clients.push(this);
    }
  },
}));

import { activate, deactivate } from "../../src/client/extension";

function makeContext() {
  return {
    subscriptions: [] as { dispose(): unknown }[],
    extensionUri: "ext:",
  };
}

beforeEach(async () => {
  await deactivate();
  stub.reset();
  lsp.clients.length = 0;
  lsp.startError = undefined;
});

describe("activate", () => {
  it("registers the preview and starts no client when lsp.enabled is false", async () => {
    stub.state.config["plantuml.lsp.enabled"] = false;
    const context = makeContext();
    await activate(context as never);
    expect(stub.state.commands["plantuml.showPreview"]).toBeTypeOf("function");
    expect(lsp.clients).toHaveLength(0);
    // command + two editor listeners, and no client disposable
    expect(context.subscriptions).toHaveLength(3);
  });

  it("builds and starts the client from the configuration", async () => {
    stub.state.config["plantuml.lsp.path"] = "  /venv/bin/plantuml-lsp ";
    await activate(makeContext() as never);
    expect(lsp.clients).toHaveLength(1);
    const [client] = lsp.clients;
    expect(client.id).toBe("plantuml-lsp");
    expect(client.name).toBe("PlantUML Language Server");
    expect(client.serverOptions).toEqual({
      command: "/venv/bin/plantuml-lsp",
      args: [],
    });
    expect(client.clientOptions).toEqual({
      documentSelector: [{ scheme: "file", language: "plantuml" }],
    });
    expect(client.start).toHaveBeenCalledOnce();
    expect(stub.state.warningMessages).toEqual([]);
  });

  it("uses the default command and treats an unset lsp.enabled as true", async () => {
    await activate(makeContext() as never);
    expect(lsp.clients[0].serverOptions).toEqual({
      command: "plantuml-lsp",
      args: [],
    });
  });

  it("registers the preview even when a client starts", async () => {
    await activate(makeContext() as never);
    expect(stub.state.commands["plantuml.showPreview"]).toBeTypeOf("function");
  });

  it("names the command in a warning and resolves when the server cannot start", async () => {
    stub.state.config["plantuml.lsp.path"] = "missing-lsp";
    lsp.startError = new Error("spawn ENOENT");
    await expect(activate(makeContext() as never)).resolves.toBeUndefined();
    expect(stub.state.warningMessages).toEqual([
      "PlantUML: could not start 'missing-lsp'. " +
        "Install the server with: pip install plantuml-lsp " +
        "or point plantuml.lsp.path at it.",
    ]);
  });

  it("forgets a client that failed to start, so nothing stops it later", async () => {
    lsp.startError = new Error("spawn ENOENT");
    await activate(makeContext() as never);
    await deactivate();
    expect(lsp.clients[0].stop).not.toHaveBeenCalled();
  });

  it("pushes a disposable that stops the running client", async () => {
    const context = makeContext();
    await activate(context as never);
    expect(context.subscriptions).toHaveLength(4);
    context.subscriptions[3].dispose();
    await new Promise((resolve) => setImmediate(resolve));
    expect(lsp.clients[0].stop).toHaveBeenCalledOnce();
  });
});

describe("deactivate", () => {
  it("is a no-op before any client exists", async () => {
    await expect(deactivate()).resolves.toBeUndefined();
    expect(lsp.clients).toHaveLength(0);
  });

  it("stops the client once, however many times it is called", async () => {
    await activate(makeContext() as never);
    await deactivate();
    await deactivate();
    expect(lsp.clients[0].stop).toHaveBeenCalledOnce();
  });

  it("lets a later activation run a new client", async () => {
    await activate(makeContext() as never);
    await deactivate();
    await activate(makeContext() as never);
    expect(lsp.clients).toHaveLength(2);
    await deactivate();
    expect(lsp.clients[0].stop).toHaveBeenCalledOnce();
    expect(lsp.clients[1].stop).toHaveBeenCalledOnce();
  });
});
