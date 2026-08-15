/**
 * Pure helpers for building the language-client wiring; kept free of the
 * vscode API so they are unit-testable outside the editor host.
 */

export interface LspConfig {
  enabled: boolean;
  path: string;
}

export const DEFAULT_LSP_COMMAND = "plantuml-lsp";

export function resolveServerCommand(configuredPath: string | undefined): string {
  const trimmed = (configuredPath ?? "").trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_LSP_COMMAND;
}

export function documentSelector(): { scheme: string; language: string }[] {
  return [{ scheme: "file", language: "plantuml" }];
}
