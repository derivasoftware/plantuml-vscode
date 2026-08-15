# plantuml-vscode

VS Code extension for the
[deriva/plantuml](https://gitlab.semantiqa.dev/deriva/plantuml) toolchain —
the pack that brings the family into the editor.

## What you get

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
