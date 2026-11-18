import { describe, expect, it } from "vitest";

import plugin from "./index";

// Same fake-Oxlint harness shape as the standalone rule packages:
// visitors are looked up by node type on the object returned from
// rule.create(context); context.report collects diagnostics.

const makeContext = (filename: string) => {
  const reports: { node: unknown; message: string }[] = [];
  return {
    filename,
    reports,
    report: (d: { node: unknown; message: string }) => reports.push(d),
  };
};

const literal = (value: unknown) => ({ type: "Literal", value });

const RULE_IDS = [
  "no-hardcoded-colors",
  "provider-lockin",
  "package-boundary",
  "tenant-scope",
  "plugin-contract",
  "plugin-route-gate",
  "plugin-api-route-gate",
  "client-contract",
  "driver-contract",
] as const;

describe("eslint-plugin-arch bundle", () => {
  it("registers all nine rules under the unified `arch` plugin id", () => {
    expect(plugin.meta.name).toBe("arch");
    expect(Object.keys(plugin.rules).sort()).toEqual([...RULE_IDS].sort());
  });

  it("arch/provider-lockin fires on provider-named literals", () => {
    const ctx = makeContext("packages/kernel/src/config.ts");
    const visitor = (plugin.rules as any)["provider-lockin"].create(ctx);
    visitor.Literal(literal("https://api.openai.com/v1"));
    expect(ctx.reports).toHaveLength(1);
  });

  it("arch/no-hardcoded-colors fires on palette utilities", () => {
    const ctx = makeContext("plugins/demo/src/views/x.tsx");
    const visitor = (plugin.rules as any)["no-hardcoded-colors"].create(ctx);
    visitor.Literal(literal("flex bg-red-500 text-white"));
    expect(ctx.reports).toHaveLength(1);
  });
});
