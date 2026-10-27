# Architecture

The extension splits into the client (activation, server options, the
jar renderer, the preview panel) and the webview (the wasm grammar plus
the render engine and the interaction shell). The figures below are the
repository's actual design, rendered from its sources on every inject.

<!-- folio: design --assets assets -->
### System view

#### HLD_PlantumlVscode

_hld · `design/hld/HLD_PlantumlVscode.puml`_

- traces to: `SREQ-00001-1`

![HLD_PlantumlVscode](assets/HLD_PlantumlVscode.svg)

### Module overview

#### CL_Client

_cl · `design/lld/client/CL_Client.puml`_

- traces to: `REQ-00001-1` `REQ-00002-1` `REQ-00003-1` `REQ-00004-1`
- implemented in: `src/client/extension.ts` · `src/client/preview.ts` · `src/client/serverOptions.ts`
- verified by: `tests/integration/clientPreview.test.ts` (5) · `tests/integration/extensionActivation.test.ts` (4) · `tests/integration/manifest.test.ts` (4) · `tests/integration/preview.test.ts` (6) · `tests/integration/serverOptions.test.ts` (3)

![CL_Client](assets/CL_Client.svg)

### Class detail

<details>
<summary><code>CL_ServerOptions</code> · traces to <code>REQ-00002-1</code></summary>
<ul>
<li>source: <code>design/lld/client/CL_ServerOptions.puml</code></li>
<li>implemented in: <code>src/client/serverOptions.ts</code></li>
<li>verified by: <code>tests/integration/extensionActivation.test.ts</code> (4), <code>tests/integration/serverOptions.test.ts</code> (3)</li>
</ul>
<p><img alt="CL_ServerOptions" src="assets/CL_ServerOptions.svg"></p>
</details>

<details>
<summary><code>CL_Extension</code> · traces to <code>REQ-00001-1</code> <code>REQ-00003-1</code></summary>
<ul>
<li>source: <code>design/lld/client/CL_Extension.puml</code></li>
<li>implemented in: <code>src/client/extension.ts</code></li>
<li>verified by: <code>tests/integration/manifest.test.ts</code> (4)</li>
</ul>
<p><img alt="CL_Extension" src="assets/CL_Extension.svg"></p>
</details>

<details>
<summary><code>CL_Preview</code> · traces to <code>REQ-00004-1</code></summary>
<ul>
<li>source: <code>design/lld/client/CL_Preview.puml</code></li>
<li>implemented in: <code>src/client/preview.ts</code></li>
<li>verified by: <code>tests/integration/clientPreview.test.ts</code> (5), <code>tests/integration/preview.test.ts</code> (6)</li>
</ul>
<p><img alt="CL_Preview" src="assets/CL_Preview.svg"></p>
</details>

### Module overview

#### CL_Webview

_cl · `design/lld/webview/CL_Webview.puml`_

- traces to: `REQ-00004-1` `REQ-00005-1`
- implemented in: `src/webview/preview.ts`
- verified by: `tests/integration/clientPreview.test.ts` (5) · `tests/integration/preview.test.ts` (9)

![CL_Webview](assets/CL_Webview.svg)

### Class detail

<details>
<summary><code>CL_WebviewPreview</code> · traces to <code>REQ-00004-1</code> <code>REQ-00005-1</code></summary>
<ul>
<li>source: <code>design/lld/webview/CL_WebviewPreview.puml</code></li>
<li>implemented in: <code>src/webview/preview.ts</code></li>
<li>verified by: <code>tests/integration/clientPreview.test.ts</code> (5), <code>tests/integration/preview.test.ts</code> (9)</li>
</ul>
<p><img alt="CL_WebviewPreview" src="assets/CL_WebviewPreview.svg"></p>
</details>
<!-- /folio -->
