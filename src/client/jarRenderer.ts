/**
 * Official-renderer engine: spawn a user-installed plantuml.jar and
 * pipe the diagram through it. The jar is never bundled (GPL, ~11MB);
 * this module only runs what the user configured. No vscode imports —
 * unit-testable with a fake java executable.
 *
 * Includes are resolved by PlantUML itself: the child runs with the
 * document's directory as cwd and receives the raw (unexpanded)
 * source, so !include/!includesub fidelity is the jar's own.
 */

import { spawn } from "node:child_process";

export interface JarConfig {
  /** java executable; a bare name resolves through PATH. */
  javaPath: string;
  /** absolute path to plantuml.jar; empty = engine unavailable. */
  jarPath: string;
  /** render with PlantUML's dark theme variant. */
  darkMode?: boolean;
}

export type JarResult =
  | { ok: true; svg: string }
  | { ok: false; error: string };

export function jarArgs(cfg: JarConfig): string[] {
  const args = ["-jar", cfg.jarPath, "-tsvg", "-pipe", "-charset", "utf-8"];
  if (cfg.darkMode) args.push("-darkmode");
  return args;
}

export function renderWithJar(
  source: string,
  cwd: string,
  cfg: JarConfig,
  signal?: AbortSignal,
): Promise<JarResult> {
  if (!cfg.jarPath) {
    return Promise.resolve({
      ok: false,
      error:
        "plantuml.jar is not configured — set plantuml.render.jarPath " +
        "to use the official renderer.",
    });
  }
  return new Promise((resolve) => {
    const child = spawn(cfg.javaPath, jarArgs(cfg), { cwd, signal });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString("utf8")));
    child.stderr.on("data", (chunk: Buffer) => (err += chunk.toString("utf8")));
    child.on("error", (e: NodeJS.ErrnoException) => {
      resolve({
        ok: false,
        error:
          e.code === "ENOENT"
            ? `java not found (${cfg.javaPath}) — install a JRE or set plantuml.render.javaPath.`
            : e.name === "AbortError"
              ? "cancelled"
              : String(e),
      });
    });
    child.on("close", () => {
      // PlantUML draws syntax errors as diagrams and may exit non-zero;
      // any SVG on stdout is a displayable result.
      const start = out.indexOf("<svg");
      if (start >= 0) resolve({ ok: true, svg: out.slice(start) });
      else resolve({ ok: false, error: err.trim() || "plantuml.jar produced no SVG" });
    });
    child.stdin.write(source);
    child.stdin.end();
  });
}
