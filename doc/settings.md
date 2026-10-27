# Settings reference

| Setting | Default | Meaning |
|---|---|---|
| `plantuml.lsp.enabled` | `true` | start the language server for PlantUML documents |
| `plantuml.lsp.path` | `plantuml-lsp` | command used to launch the server (`pip install plantuml-lsp`) |

Language registration covers `.puml`, `.plantuml`, `.iuml`, `.wsd`
with comment toggling (`'`, `/' '/`), bracket pairs and a TextMate
grammar mirroring the tree-sitter grammar's supported subset.

## Troubleshooting

- **LSP not starting** → check `plantuml-lsp` resolves on the PATH VS
  Code sees, or point `plantuml.lsp.path` at the venv binary.
- **Aggregate renders empty** → the file is pure
  `!includesub` composition; confirm the included paths resolve
  relative to the document (the host expands them with workspace file
  access).
