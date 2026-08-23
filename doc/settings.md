# Settings reference

| Setting | Default | Meaning |
|---|---|---|
| `plantuml.lsp.enabled` | `true` | start the language server for PlantUML documents |
| `plantuml.lsp.path` | `plantuml-lsp` | command used to launch the server (`pip install plantuml-lsp`) |
| `plantuml.render.engine` | `native` | preview default: `native` (interactive, self-contained) or `plantuml` (official jar). The toolbar overrides per panel |
| `plantuml.render.jarPath` | `""` | absolute path to plantuml.jar — required for the `plantuml` engine; the jar is never bundled |
| `plantuml.render.javaPath` | `java` | java executable used to run the jar |

Language registration covers `.puml`, `.plantuml`, `.iuml`, `.wsd`
with comment toggling (`'`, `/' '/`), bracket pairs and a TextMate
grammar mirroring the tree-sitter grammar's supported subset.

## Troubleshooting

- **"java not found"** in the preview status line → install a JRE or
  set `plantuml.render.javaPath`.
- **"plantuml.jar is not configured"** → set
  `plantuml.render.jarPath`; the preview keeps rendering natively
  meanwhile.
- **LSP not starting** → check `plantuml-lsp` resolves on the PATH VS
  Code sees, or point `plantuml.lsp.path` at the venv binary.
- **Aggregate renders empty in native mode** → the file is pure
  `!includesub` composition; confirm the included paths resolve
  relative to the document (the host expands them with workspace file
  access).
