/**
 * Stateful stub of the `vscode` API surface the extension touches.
 * Each test resets it via `reset()`; captured panels, handlers and
 * messages let behaviour tests assert the real wiring.
 */
import { vi } from "vitest";

type Handler = (...args: unknown[]) => unknown;

export interface StubPanel {
  webview: {
    html: string;
    cspSource: string;
    postMessage: ReturnType<typeof vi.fn>;
    asWebviewUri: (uri: unknown) => string;
    onDidReceiveMessage: (cb: Handler) => { dispose(): void };
    receive: Handler;
  };
  reveal: ReturnType<typeof vi.fn>;
  onDidDispose: (cb: () => void) => { dispose(): void };
  dispose: () => void;
}

export const state = {
  config: {} as Record<string, unknown>,
  activeDocument: undefined as unknown,
  panels: [] as StubPanel[],
  commands: {} as Record<string, Handler>,
  onDidChangeTextDocument: [] as Handler[],
  onDidChangeActiveTextEditor: [] as Handler[],
  onDidChangeConfiguration: [] as Handler[],
  infoMessages: [] as string[],
  warningMessages: [] as string[],
  themeKind: 1,
};

export function reset(): void {
  state.config = {};
  state.activeDocument = undefined;
  state.panels = [];
  state.commands = {};
  state.onDidChangeTextDocument = [];
  state.onDidChangeActiveTextEditor = [];
  state.onDidChangeConfiguration = [];
  state.infoMessages = [];
  state.warningMessages = [];
  state.themeKind = 1;
}

function makePanel(): StubPanel {
  let onMessage: Handler = () => undefined;
  let onDispose: () => void = () => undefined;
  const panel: StubPanel = {
    webview: {
      html: "",
      cspSource: "vscode-resource:",
      postMessage: vi.fn(async () => true),
      asWebviewUri: (uri: unknown) => `webview:${String(uri)}`,
      onDidReceiveMessage: (cb: Handler) => {
        onMessage = cb;
        return { dispose() {} };
      },
      receive: (...args: unknown[]) => onMessage(...args),
    },
    reveal: vi.fn(),
    onDidDispose: (cb: () => void) => {
      onDispose = cb;
      return { dispose() {} };
    },
    dispose: () => onDispose(),
  };
  state.panels.push(panel);
  return panel;
}

export const workspace = {
  getConfiguration: (section: string) => ({
    get: <T>(key: string, fallback?: T): T =>
      (state.config[`${section}.${key}`] as T) ?? (fallback as T),
  }),
  fs: {
    readFile: async () => {
      throw new Error("no fs in stub");
    },
  },
  onDidChangeTextDocument: (cb: Handler) => {
    state.onDidChangeTextDocument.push(cb);
    return { dispose() {} };
  },
  onDidChangeConfiguration: (cb: Handler) => {
    state.onDidChangeConfiguration.push(cb);
    return { dispose() {} };
  },
};

export const window = {
  get activeTextEditor() {
    return state.activeDocument
      ? { document: state.activeDocument }
      : undefined;
  },
  createWebviewPanel: vi.fn(
    (_id: string, _title: string, _column: unknown, _opts: unknown) =>
      makePanel(),
  ),
  onDidChangeActiveTextEditor: (cb: Handler) => {
    state.onDidChangeActiveTextEditor.push(cb);
    return { dispose() {} };
  },
  showInformationMessage: vi.fn(async (msg: string) => {
    state.infoMessages.push(msg);
  }),
  showWarningMessage: vi.fn(async (msg: string) => {
    state.warningMessages.push(msg);
  }),
  get activeColorTheme() {
    return { kind: state.themeKind };
  },
};

export const commands = {
  registerCommand: (name: string, cb: Handler) => {
    state.commands[name] = cb;
    return { dispose() {} };
  },
};

export const Uri = {
  file: (p: string) => ({ fsPath: p, toString: () => `file://${p}` }),
  joinPath: (base: unknown, ...parts: string[]) =>
    `${String(base)}/${parts.join("/")}`,
};

export const ViewColumn = { Beside: -2 };
export const ColorThemeKind = { Light: 1, Dark: 2, HighContrast: 3 };
