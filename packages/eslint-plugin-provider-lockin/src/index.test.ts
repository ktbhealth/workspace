import { describe, expect, it } from "vitest";

import plugin from "./index";

const makeContext = (filename: string) => {
  const reports: { node: unknown; message: string }[] = [];
  return {
    filename,
    reports,
    report: (d: { node: unknown; message: string }) => reports.push(d),
  };
};

const literal = (value: unknown) => ({ type: "Literal", value });

describe("arch-provider/provider-lockin", () => {
  it("flags provider literals and ignores innocent strings", () => {
    const ctx = makeContext("packages/kernel/src/port.ts");
    const visitor = (plugin.rules as any)["provider-lockin"].create(ctx);
    visitor.Literal(literal("@cf/meta/llama-3.1-8b"));
    visitor.Literal(literal("https://api.openai.com/v1/chat"));
    visitor.Literal(literal("an innocent string"));
    visitor.Literal(literal(42));
    expect(ctx.reports).toHaveLength(2);
  });

  it("flags provider literals in template literal quasis", () => {
    const ctx = makeContext("packages/kernel/src/port.ts");
    const visitor = (plugin.rules as any)["provider-lockin"].create(ctx);
    visitor.TemplateLiteral({
      type: "TemplateLiteral",
      quasis: [
        {
          type: "TemplateElement",
          value: { cooked: "https://fonts.googleapis.com/css2?family=", raw: "" },
        },
        { type: "TemplateElement", value: { cooked: "&display=swap", raw: "" } },
      ],
      expressions: [],
    });
    expect(ctx.reports).toHaveLength(1);
  });
});
