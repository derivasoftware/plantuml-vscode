/**
 * Hand-written stub of the DOM surface the webview touches: neither jsdom
 * nor happy-dom is a dependency. `installDom()` stubs the globals and returns
 * the elements so tests can fire events and read what the code wrote.
 * Pair it with `vi.unstubAllGlobals()` in `afterEach`.
 */
import { vi } from "vitest";

type Listener = (ev: never) => unknown;

class FakeClassList {
  private readonly names: Set<string>;

  constructor(names: string[] = []) {
    this.names = new Set(names);
  }

  contains(name: string): boolean {
    return this.names.has(name);
  }

  set(...names: string[]): void {
    this.names.clear();
    names.forEach((name) => this.names.add(name));
  }
}

export class FakeElement {
  id = "";
  innerHTML = "";
  checked = true;
  parentElement: FakeElement | null = null;
  classList: FakeClassList;
  style: { transform?: string } = {};
  dataset: Record<string, string> = {};
  listeners: Record<string, { handler: Listener; options?: unknown }[]> = {};
  rect = { left: 0, top: 0 };
  setPointerCapture = vi.fn();

  constructor(
    public tagName = "div",
    classes: string[] = [],
    parent: FakeElement | null = null,
  ) {
    this.classList = new FakeClassList(classes);
    this.parentElement = parent;
  }

  addEventListener(type: string, handler: Listener, options?: unknown): void {
    (this.listeners[type] ??= []).push({ handler, options });
  }

  getBoundingClientRect(): { left: number; top: number } {
    return this.rect;
  }

  fire(type: string, ev: unknown = {}): void {
    (this.listeners[type] ?? []).forEach(({ handler }) => handler(ev as never));
  }
}

/** The `SVGGElement` global: `draggableGroup` tests for it with `instanceof`. */
export class FakeSvgGroup extends FakeElement {
  constructor(classes: string[] = [], parent: FakeElement | null = null) {
    super("g", classes, parent);
  }
}

export interface FakeDom {
  root: FakeElement;
  stage: FakeElement;
  body: FakeElement;
  html: FakeElement;
  byId: Record<string, FakeElement>;
  window: FakeElement & { __PREVIEW__: { treeSitterWasm: string; grammarWasm: string } };
  observers: { callback: () => void; observe: ReturnType<typeof vi.fn> }[];
  frames: (() => void)[];
  runFrames(): void;
}

export function installDom(): FakeDom {
  const byId: Record<string, FakeElement> = {};
  for (const id of [
    "root",
    "stage",
    "f-members",
    "f-namespaces",
    "f-notes",
    "reset-layout",
    "reset-view",
  ]) {
    const element = new FakeElement();
    element.id = id;
    byId[id] = element;
  }
  const body = new FakeElement("body");
  const html = new FakeElement("html");
  const win = Object.assign(new FakeElement("window"), {
    __PREVIEW__: { treeSitterWasm: "ts.wasm", grammarWasm: "grammar.wasm" },
  });
  const observers: FakeDom["observers"] = [];
  const frames: (() => void)[] = [];

  vi.stubGlobal("document", {
    getElementById: (id: string) => byId[id] ?? null,
    body,
    documentElement: html,
  });
  vi.stubGlobal("window", win);
  vi.stubGlobal("SVGGElement", FakeSvgGroup);
  vi.stubGlobal(
    "MutationObserver",
    class {
      observe = vi.fn();
      constructor(public callback: () => void) {
        observers.push(this);
      }
    },
  );
  vi.stubGlobal("requestAnimationFrame", (cb: () => void) => {
    frames.push(cb);
    return frames.length;
  });

  return {
    root: byId["root"],
    stage: byId["stage"],
    body,
    html,
    byId,
    window: win,
    observers,
    frames,
    runFrames: () => frames.splice(0).forEach((cb) => cb()),
  };
}

export async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}
