# plantuml-vscode

<!-- folio: colophon --project plantuml-vscode --junit test-results/junit.xml --coverage_ut test-results/coverage/cobertura-coverage.xml -->
![powered by: argos](https://img.shields.io/badge/powered%20by-argos-1f6feb) ![traced: 67%](https://img.shields.io/badge/traced-67%25-e05d44) ![verified: 100%](https://img.shields.io/badge/verified-100%25-2ea44f) ![tests: 100%](https://img.shields.io/badge/tests-100%25-2ea44f) ![UT: 43%](https://img.shields.io/badge/UT-43%25-e05d44) ![ST: n/a](https://img.shields.io/badge/ST-n%2Fa-lightgrey) ![diagnostics: 0](https://img.shields.io/badge/diagnostics-0-2ea44f)

> **plantuml-vscode** is powered by **argos**. **folio** generates this documentation from the repository's model: 6 requirements · 6 verifications · 0 constraints. Quality: 67% traced to code · 100% verified · 100% tests passing · 43% UT coverage.
<!-- /folio -->

VS Code extension for the
[deriva/plantuml](https://github.com/derivasoftware) toolchain:
the family in the editor.

## Install

1. Install the language server:
   `pip install git+https://github.com/derivasoftware/plantuml-lsp.git@v0.8.6`
   (or point `plantuml.lsp.path` at a venv binary).
2. Install the extension from the `.vsix` attached to the
   [GitHub release](https://github.com/derivasoftware/plantuml-vscode/releases):

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

**Language intelligence**: spawns
[plantuml-lsp](https://github.com/derivasoftware/plantuml-lsp)
for parse diagnostics and semantic lints, completion, hover,
go-to-definition across includes, entities and calls, workspace-wide
references and rename, and formatting through plantuml-fmt. Language registration for
`.puml`, `.plantuml`, `.iuml` and `.wsd`, with TextMate highlighting
mirroring the grammar's subset.

## Scope

The family covers a standard-driven subset of PlantUML, never the whole
language. Class diagrams: 125 of 149 standard constructs structural;
sequence: participants, arrows, frames, notes and the lifecycle verbs
(activate, create, destroy, return, ref, box, delays, spacers)
structural, with autonumber, autoactivate and the styling surface raw;
activity: actions, swimlanes and the whole new-syntax control flow
structural, with the legacy syntax and the braced drawing blocks raw;
state: declarations, descriptions and the composite block structural,
with concurrent regions raw. Everything else (deployment, components,
mindmaps, gantt) parses lossless as raw lines, never an ERROR, but gets
no structure.
The preview draws class, sequence, activity and state diagrams; a kind
it does not draw shows a notice saying so instead of a blank panel.

## Documentation

- [Preview guide](doc/preview.md): what it draws, interaction, limits
- [Settings reference](doc/settings.md): every setting and its default
- [Architecture](doc/architecture.md): the model's diagrams, rendered from source
- [Requirements & status](doc/requirements.md): what was asked and the traceability matrix
- [Repo quality](doc/quality.md): artefact inventory and health metrics

*Not affiliated with or endorsed by the PlantUML project.*
