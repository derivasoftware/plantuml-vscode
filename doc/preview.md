# The preview — two engines, one panel

`PlantUML: Open Preview` (editor-title button) opens a live preview
that re-renders on every keystroke. A toolbar selector switches the
rendering engine **per panel**; `plantuml.render.engine` sets the
default.

## native — interactive, self-contained

The webview bundles the tree-sitter grammar compiled to **wasm** plus
the plantuml-render engine: no Java, no server, no native binaries, and
a strict CSP (`wasm-unsafe-eval`, no `eval`). The host expands
`!include`/`!includesub` before posting the source, so aggregates
render.

Interaction (all read-only — the source is never touched):

- **Drag** entities, notes and whole namespaces. Containers re-fit
  around their children; a namespace drag moves its subtree. Positions
  key on stable qualified ids, so they survive live re-renders.
- **Filters**: members / namespaces / notes checkboxes (pure IR
  projections in the engine).
- **Pan** on the background, **wheel-zoom** around the cursor
  (0.2×–4×); `reset layout` clears drags, `reset view` clears pan/zoom.
- Colors map from the editor theme onto the engine's CSS variables —
  the diagram always matches your theme.

Coverage: the class-diagram subset (grammar-complete against the
PlantUML reference); unsupported constructs simply don't draw.

## plantuml.jar — full fidelity, static

The official renderer as a **local jar** (never bundled — GPL, ~11MB;
nothing leaves the machine):

```jsonc
"plantuml.render.jarPath": "/usr/share/plantuml/plantuml.jar",
"plantuml.render.javaPath": "java",          // optional, PATH default
"plantuml.render.engine": "plantuml"         // optional default
```

Everything PlantUML draws — sequence, activity, gantt, C4 — with
PlantUML's own styling (`-darkmode` applied when your theme is dark).
The jar runs with the document's directory as cwd, so **it resolves
its own includes**, and receives the unsaved buffer, so preview stays
live. JVM startup dominates, so renders debounce (350 ms) and a newer
edit aborts the in-flight render.

In jar mode the drag and filter controls are inert and visibly
disabled (foreign SVG has no stable ids or theming contract); pan,
zoom and `reset view` still work. If the jar fails — not configured,
Java missing, crash — the panel **falls back to the native render**
with the cause in the status line, never a blank panel.

## Choosing

| you want | engine |
|---|---|
| explore/present a class diagram interactively | native |
| exact PlantUML output, any diagram type | plantuml.jar |

## Architecture (for contributors)

Host (`src/client/preview.ts`) owns config, include expansion and the
jar child (`src/client/jarRenderer.ts`, vscode-free and unit-tested
against a fake java). Webview (`src/webview/preview.ts`) owns parse →
filter → render and all interaction state. Messages: host→webview
`{source, engine}` and `{jar-svg, ok, svg|error}`; webview→host
`{ready}` and `{engine}` (toolbar override). Bundle tests assert the
shipped webview carries the parser, the engine, the interaction wiring
and no `eval`.
