# The preview

`PlantUML: Open Preview` (editor-title button) opens a live preview
that re-renders on every keystroke.

## What runs

The webview bundles the tree-sitter grammar compiled to **wasm** plus
the plantuml-render engine: no Java, no server, no native binaries, and
a strict CSP (`wasm-unsafe-eval`, no `eval`). The host expands
`!include`/`!includesub` before posting the source, so aggregates
render. Nothing leaves the machine.

It draws class, sequence, activity and state diagrams. A kind it does
not draw (use case, component, deployment, the legacy activity syntax,
mindmap, gantt and the other special formats) shows a notice inside the
drawing saying so, never a blank panel.

## Interaction

All read-only — the source is never touched:

- **Drag** entities, notes and whole namespaces. Containers re-fit
  around their children; a namespace drag moves its subtree. Positions
  key on stable qualified ids, so they survive live re-renders.
- **Filters**: members / namespaces / notes checkboxes (pure IR
  projections in the engine).
- **Pan** on the background, **wheel-zoom** around the cursor
  (0.2×–4×); `reset layout` clears drags, `reset view` clears pan/zoom.
- The drawing follows the editor theme, light or dark, and switches
  with it.

## Architecture (for contributors)

Host (`src/client/preview.ts`) owns the panel and include expansion.
Webview (`src/webview/preview.ts`) owns parse → filter → render and all
interaction state. Messages: host→webview `{source}`; webview→host
`{ready}`. Layout is asynchronous, so only the latest render writes the
stage. Bundle tests assert the shipped webview carries the parser, the
engine, the interaction wiring and no `eval`.
