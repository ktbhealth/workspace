import { describe, expect, it } from "vitest";

import plugin from "./index";

// Fake Oxlint context: visitors are looked up by node type on the object
// returned from rule.create(context); context.report collects diagnostics.
// Same harness shape as the original smoke test (tools/check-arch.mjs).

const makeContext = (filename: string) => {
  const reports: { node: unknown; message: string }[] = [];
  return {
    filename,
    reports,
    report: (d: { node: unknown; message: string }) => reports.push(d),
  };
};

const literal = (value: unknown) => ({ type: "Literal", value });

describe("arch-colors/no-hardcoded-colors", () => {
  it("flags palette utilities, arbitrary color values and white/black fills", () => {
    const ctx = makeContext("plugins/demo/src/views/x.tsx");
    const visitor = (plugin.rules as any)["no-hardcoded-colors"].create(ctx);
    visitor.Literal(literal("flex bg-red-50 text-red-700 ring-red-200"));
    visitor.Literal(literal("dark:hover:bg-amber-200/50"));
    visitor.Literal(literal("bg-[#fff] text-[oklch(0.5_0.1_200)]"));
    visitor.Literal(literal("bg-white text-black"));
    expect(ctx.reports).toHaveLength(4);
  });

  it("flags hardcoded colors inside template literal quasis", () => {
    const ctx = makeContext("plugins/demo/src/views/x.tsx");
    const visitor = (plugin.rules as any)["no-hardcoded-colors"].create(ctx);
    visitor.TemplateLiteral({
      type: "TemplateLiteral",
      quasis: [{ type: "TemplateElement", value: { cooked: "px-2 bg-emerald-500" } }],
    });
    expect(ctx.reports).toHaveLength(1);
  });

  it("accepts theme tokens and unrelated strings", () => {
    const ctx = makeContext("plugins/demo/src/views/x.tsx");
    const visitor = (plugin.rules as any)["no-hardcoded-colors"].create(ctx);
    visitor.Literal(literal("flex bg-primary/10 text-foreground border-l-warning"));
    visitor.Literal(literal("ring-1 ring-border size-4"));
    visitor.Literal(literal("text-destructive bg-warning/10"));
    expect(ctx.reports).toHaveLength(0);
  });
});
