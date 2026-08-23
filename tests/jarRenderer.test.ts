import { chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { jarArgs, renderWithJar } from "../src/client/jarRenderer";

const FAKE_JAVA = join(__dirname, "fixtures", "fake-java.mjs");
const CFG = { javaPath: FAKE_JAVA, jarPath: "/opt/plantuml.jar" };

beforeAll(() => {
  chmodSync(FAKE_JAVA, 0o755);
});

describe("jar command line", () => {
  it("pipes svg with utf-8 and the configured jar", () => {
    expect(jarArgs(CFG)).toEqual([
      "-jar", "/opt/plantuml.jar", "-tsvg", "-pipe", "-charset", "utf-8",
    ]);
  });

  it("adds -darkmode when the editor theme is dark", () => {
    expect(jarArgs({ ...CFG, darkMode: true })).toContain("-darkmode");
  });
});

describe("renderWithJar", () => {
  const SRC = "@startuml\nclass A\n@enduml\n";

  it("returns the SVG from stdout, trimming pre-markup noise", async () => {
    const res = await renderWithJar(SRC, tmpdir(), CFG);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.svg.startsWith("<svg")).toBe(true);
      expect(res.svg).toContain(`data-len="${SRC.length}"`);
      expect(res.svg).toContain("-pipe");
    }
  });

  it("reports stderr when the jar produces no SVG", async () => {
    const res = await renderWithJar(SRC, tmpdir(), {
      ...CFG,
      javaPath: process.execPath,
      jarPath: FAKE_JAVA,
    });
    // real node runs fake-java.mjs via -jar? no — node exits with an
    // error for the unknown -jar flag, exercising the no-SVG path.
    expect(res.ok).toBe(false);
  });

  it("explains a missing java executable", async () => {
    const res = await renderWithJar(SRC, tmpdir(), {
      ...CFG,
      javaPath: "/definitely/not/java",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("java not found");
  });

  it("explains an unconfigured jar", async () => {
    const res = await renderWithJar(SRC, tmpdir(), { ...CFG, jarPath: "" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("plantuml.render.jarPath");
  });

  it("supports cancellation via AbortSignal", async () => {
    const ctl = new AbortController();
    const pending = renderWithJar(SRC, tmpdir(), CFG, ctl.signal);
    ctl.abort();
    const res = await pending;
    expect(res.ok).toBe(false);
  });
});
