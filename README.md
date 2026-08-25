# plantuml-vscode

<!-- folio: colophon --project plantuml-vscode --junit test-results/junit.xml --coverage_ut test-results/coverage/cobertura-coverage.xml -->
![powered by: argos](https://img.shields.io/badge/powered%20by-argos-1f6feb) ![verified: 100%](https://img.shields.io/badge/verified-100%25-2ea44f) ![tests: 100%](https://img.shields.io/badge/tests-100%25-2ea44f) ![UT: 54%](https://img.shields.io/badge/UT-54%25-e05d44) ![ST: n/a](https://img.shields.io/badge/ST-n%2Fa-lightgrey) ![diagnostics: 0](https://img.shields.io/badge/diagnostics-0-2ea44f)

> **plantuml-vscode** is powered by **argos**. **folio** generates this documentation from the repository's model: 7 requirements · 7 verifications · 0 constraints. Quality: 100% verified · 100% tests passing · 54% UT coverage.
<!-- /folio -->

VS Code extension for the
[deriva/plantuml](https://gitlab.semantiqa.dev/deriva/plantuml) toolchain:
the family in the editor.

## Install

1. Install the language server:
   `pip install git+https://gitlab.semantiqa.dev/deriva/plantuml/plantuml-lsp.git@v0.7.1`
   (or point `plantuml.lsp.path` at a venv binary).
2. Install the extension from the `.vsix` the CI builds on release tags
   (published to the project's generic package registry):

```bash
code --install-extension plantuml-vscode-<version>.vsix
```

Or build it from a clone: `npm ci && npm run package`.

## Use cases

**Live preview** (`PlantUML: Open Preview`): the tree-sitter grammar
compiled to wasm plus the plantuml-render engine run inside the webview.
Deterministic SVG on every keystroke; no Java, no server, no native
binaries. Interactive and read-only: drag entities, notes and whole
namespaces, filter members and containers, pan and zoom; includes expand
before rendering and the source is never touched.

**Full-fidelity fallback**: the toolbar switches to the official
`plantuml.jar` (configure `plantuml.render.jarPath`). The jar renders
with the document's directory as cwd, follows the editor theme, and if
it fails the preview falls back to the native render and says why.
Nothing leaves the machine.

**Language intelligence**: spawns
[plantuml-lsp](https://gitlab.semantiqa.dev/deriva/plantuml/plantuml-lsp)
for parse diagnostics, document symbols, go-to-definition across
includes and formatting through plantuml-fmt. Language registration for
`.puml`, `.plantuml`, `.iuml` and `.wsd`, with TextMate highlighting
mirroring the grammar's subset.

## Scope

The family covers a standard-driven subset of PlantUML, never the whole
language. Class diagrams: 125 of 149 standard constructs structural;
sequence: 70 of 111, with the lifecycle verbs (activate, ref, box,
delays) still raw; activity: actions and swimlanes structural, control
flow raw. Everything else (deployment, components, state, mindmaps,
gantt) parses lossless as raw lines, never an ERROR, but gets no
structure. The native preview draws the class subset
interactively; the `plantuml.jar` fallback covers full fidelity.

## Documentation

- [Preview guide](doc/preview.md): the two engines, interaction, limits
- [Settings reference](doc/settings.md): every setting and its default
- [Architecture](doc/architecture.md): the model's diagrams, rendered from source
- [Requirements & status](doc/requirements.md): what was asked and the traceability matrix
- [Repo quality](doc/quality.md): artefact inventory and health metrics

*Not affiliated with or endorsed by the PlantUML project.*
