// Stages the webview runtime assets into media/: the web-tree-sitter
// runtime wasm (from node_modules) and the grammar wasm (committed at
// media/, built from the pinned grammar tag; regenerate with
// `tree-sitter build --wasm` in the grammar repo when bumping).
import { copyFileSync, existsSync } from "node:fs";

const candidates = [
  "node_modules/web-tree-sitter/web-tree-sitter.wasm",
  "node_modules/web-tree-sitter/tree-sitter.wasm",
  "node_modules/web-tree-sitter/lib/tree-sitter.wasm",
  "node_modules/web-tree-sitter/debug/tree-sitter.wasm",
];
const runtime = candidates.find((c) => existsSync(c));
if (!runtime) {
  console.error("web-tree-sitter runtime wasm not found");
  process.exit(1);
}
copyFileSync(runtime, "media/tree-sitter.wasm");
if (!existsSync("media/tree-sitter-plantuml.wasm")) {
  console.error(
    "media/tree-sitter-plantuml.wasm missing — build it in the grammar repo",
  );
  process.exit(1);
}
console.log("media staged");
