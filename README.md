# plantuml-vscode

VS Code extension for the
[deriva/plantuml](https://gitlab.semantiqa.dev/deriva/plantuml) toolchain —
the pack that brings the family into the editor.

## What you get

- **Self-contained live preview** (`PlantUML: Open Preview`, editor-title
  button): the tree-sitter grammar compiled to wasm plus the
  [plantuml-render](https://gitlab.semantiqa.dev/deriva/plantuml/plantuml-render)
  engine run inside the webview — deterministic SVG on every keystroke,
  **no Java, no server, no native binaries**. Renders the class-diagram
  subset; unsupported constructs simply don't draw. `!include` /
  `!includesub` aggregates expand before rendering.

- **Interactive, read-only**: drag entities, notes and whole namespaces
  (containers re-fit around their children; positions survive live
  re-renders thanks to stable ids), toggle members / namespaces / notes
  off with pure IR filters, pan the canvas and zoom around the cursor.
  Reset buttons restore layout and view; the source is never touched.

- **Two engines, one preview**: the toolbar switches between the
  bundled **native** engine (interactive, editor-themed, class subset)
  and the official **plantuml.jar** (full PlantUML fidelity, static —
  pan/zoom only). Configure `plantuml.render.jarPath` (+ optionally
  `plantuml.render.javaPath`) and pick a default with
  `plantuml.render.engine`. The jar runs with the document's directory
  as cwd so it resolves its own `!include`s, renders dark when the
  editor is dark, and is never bundled; if it fails, the preview falls
  back to the native render and says why. Nothing leaves the machine.

- **Language registration** for `.puml` / `.plantuml` / `.iuml` / `.wsd`
  with comment toggling (`'`, `/' '/`), bracket pairs and word rules.
- **Syntax highlighting** via a TextMate grammar mirroring the
  tree-sitter grammar's supported subset (VS Code does not consume
  tree-sitter grammars natively; Neovim/Helix/Zed use ours directly).
- **Language server**: spawns
  [plantuml-lsp](https://gitlab.semantiqa.dev/deriva/plantuml/plantuml-lsp)
  for live parse diagnostics, document symbols, go-to-definition across
  `!includesub` / `!include`, and formatting through
  [plantuml-fmt](https://gitlab.semantiqa.dev/deriva/plantuml/plantuml-fmt).

## Setup

1. Install the server: `pip install plantuml-lsp` (or point
   `plantuml.lsp.path` at a venv binary).
2. Install the extension from the `.vsix` (built by CI on release tags,
   published to this project's generic package registry):
   `code --install-extension plantuml-vscode-<version>.vsix`.

Settings: `plantuml.lsp.path` (default `plantuml-lsp`),
`plantuml.lsp.enabled` (default `true`).

## Development

```bash
npm install
npm test          # tsc + vitest
npm run package   # build the .vsix locally
```

## Governance

An [argos](https://gitlab.semantiqa.dev/deriva/argos/argos) NA project:
input requirements in `input/`, requirements and verifications in
`requirements/` and `verifications/`. See `CLAUDE.md`.
