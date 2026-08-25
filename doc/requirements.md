# Requirements & status

## What was asked

The system requirements, with a check for implemented and one per test
suite. No argos reader models TypeScript yet, so the implemented column
and the verification test ids read from that gap; the junit evidence
below is what the last run actually executed.

<!-- folio: sreqs --junit test-results/junit.xml -->
| SREQ | Title | Implemented | UT | ST |
| --- | --- | --- | --- | --- |
| `SREQ-00001-1` | The extension shall bundle the PlantUML toolchain for VS Code | ? | ~ | ? |
| `SREQ-00002-1` | The extension shall register the plantuml language with highlighting | ? | ✓ | ? |
| `SREQ-00003-1` | The extension shall launch the plantuml-lsp language client | ? | ✓ | ? |
| `SREQ-00004-1` | The pipeline shall package the extension as an installable vsix on release tags | ? | ✗ | ✗ |
| `SREQ-00005-1` | The extension shall preview diagrams interactively in a self-contained webview | ? | ✓ | ? |
| `SREQ-00006-1` | The preview shall render through the official PlantUML jar as a selectable engine | ? | ✓ | ? |
<!-- /folio -->

## Total traceability

<!-- folio: matrix --junit test-results/junit.xml -->
| SREQ | Requirements | Diagrams | Classes | UT | ST | Verifications |
| --- | --- | --- | --- | --- | --- | --- |
| `SREQ-00001-1` | — | `HLD_PlantumlVscode` | — | 0 | ? | — |
| `SREQ-00002-1` | `REQ-00001-1` | `CL_Client`<br>`CL_Extension` | `client.extension`<br>`client.jarRenderer`<br>`client.preview`<br>`client.serverOptions` | 1 | ? | `VER-00001-1` |
| `SREQ-00003-1` | `REQ-00002-1` | `CL_Client`<br>`CL_ServerOptions` | `client.extension`<br>`client.jarRenderer`<br>`client.preview`<br>`client.serverOptions` | 2 | ? | `VER-00002-1` |
| `SREQ-00004-1` | `REQ-00003-1` | `CL_Client`<br>`CL_Extension` | `client.extension`<br>`client.jarRenderer`<br>`client.preview`<br>`client.serverOptions` | 0 | ? | `VER-00003-1` |
| `SREQ-00005-1` | `REQ-00004-1`<br>`REQ-00005-1` | `CL_Client`<br>`CL_Preview`<br>`CL_Webview`<br>`CL_WebviewPreview` | `client.extension`<br>`client.jarRenderer`<br>`client.preview`<br>`client.serverOptions`<br>`webview.preview` | 2 | ? | `VER-00004-1`<br>`VER-00005-1` |
| `SREQ-00006-1` | `REQ-00006-1`<br>`REQ-00007-1` | `CL_Client`<br>`CL_JarRenderer`<br>`CL_Preview` | `client.extension`<br>`client.jarRenderer`<br>`client.preview`<br>`client.serverOptions` | 4 | ? | `VER-00006-1`<br>`VER-00007-1` |
<!-- /folio -->
