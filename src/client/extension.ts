import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node";

import { registerPreview } from "./preview";
import { documentSelector, resolveServerCommand } from "./serverOptions";

let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  registerPreview(context);
  const config = vscode.workspace.getConfiguration("plantuml");
  if (!config.get<boolean>("lsp.enabled", true)) {
    return;
  }
  const command = resolveServerCommand(config.get<string>("lsp.path"));
  const serverOptions: ServerOptions = { command, args: [] };
  const clientOptions: LanguageClientOptions = {
    documentSelector: documentSelector(),
  };
  client = new LanguageClient(
    "plantuml-lsp",
    "PlantUML Language Server",
    serverOptions,
    clientOptions,
  );
  try {
    await client.start();
  } catch {
    void vscode.window.showWarningMessage(
      `PlantUML: could not start '${command}'. ` +
        "Install the server with: pip install plantuml-lsp " +
        "or point plantuml.lsp.path at it.",
    );
    client = undefined;
  }
  context.subscriptions.push({ dispose: () => void deactivate() });
}

export async function deactivate(): Promise<void> {
  if (client) {
    await client.stop();
    client = undefined;
  }
}
