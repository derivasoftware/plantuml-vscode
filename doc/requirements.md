# Requirements & status

## What was asked

The system requirements, with a check for implemented (its requirements
land on diagrams that resolve to code) and one per test suite: the junit
evidence is what the last run actually executed.

<!-- folio: sreqs --junit test-results/junit.xml -->
| SREQ | Title | Implemented | UT | ST |
| --- | --- | --- | --- | --- |
| `SREQ-00001-1` | The extension shall bundle the PlantUML toolchain for VS Code | ~ | ~ | ? |
| `SREQ-00002-1` | The extension shall register the plantuml language with highlighting | ✗ | ✓ | ? |
| `SREQ-00003-1` | The extension shall launch the plantuml-lsp language client | ✓ | ✓ | ? |
| `SREQ-00004-1` | The pipeline shall package the extension as an installable vsix on release tags | ✗ | ✗ | ✗ |
| `SREQ-00005-1` | The extension shall preview diagrams interactively in a self-contained webview | ✓ | ✓ | ? |
<!-- /folio -->

## Total traceability

<!-- folio: matrix --junit test-results/junit.xml -->
| SREQ | Requirements | Diagrams | Classes | UT | ST | Verifications |
| --- | --- | --- | --- | --- | --- | --- |
| `SREQ-00001-1` | — | `CL_Client`<br>`HLD_PlantumlVscode` | `client.extension`<br>`client.preview`<br>`client.serverOptions` | 0 | ? | — |
| `SREQ-00002-1` | `REQ-00001-1` | — | — | 5 | ? | `VER-00001-1` |
| `SREQ-00003-1` | `REQ-00002-2` | `CL_Extension`<br>`CL_ServerOptions` | `client.extension`<br>`client.serverOptions` | 7 | ? | `VER-00002-2` |
| `SREQ-00004-1` | `REQ-00003-1` | — | — | 0 | ? | `VER-00003-1` |
| `SREQ-00005-1` | `REQ-00004-1`<br>`REQ-00005-1`<br>`REQ-00008-1` | `CL_Preview`<br>`CL_Webview`<br>`CL_WebviewInteraction`<br>`CL_WebviewPreview`<br>`CL_WebviewRender` | `client.preview`<br>`webview.interaction`<br>`webview.preview`<br>`webview.render` | 14 | ? | `VER-00004-2`<br>`VER-00005-1`<br>`VER-00008-1` |
<!-- /folio -->
