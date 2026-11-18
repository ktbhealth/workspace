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

const importDecl = (source: string, names: string[] = [], importKind = "value") => ({
  type: "ImportDeclaration",
  importKind,
  source: literal(source),
  specifiers: names.map((n) => ({
    type: "ImportSpecifier",
    local: { type: "Identifier", name: n },
    imported: { type: "Identifier", name: n },
  })),
});

const filename = "/repo/plugins/consultations/src/client.ts";
const visit = (source: string, importKind = "value") => {
  const ctx = makeContext(filename);
  (plugin.rules as any)["client-contract"]
    .create(ctx)
    .ImportDeclaration(importDecl(source, ["x"], importKind));
  return ctx.reports;
};

describe("arch-client/client-contract", () => {
  it("flags server-side value imports in client.ts", () => {
    expect(visit("@ktb/db")).toHaveLength(1);
    expect(visit("@ktb/server-fns")).toHaveLength(1);
    expect(visit("effect")).toHaveLength(1);
  });

  it("allows allowlisted value imports and type imports", () => {
    expect(visit("@ktb/kernel")).toHaveLength(0);
    expect(visit("@ktbhealth/ui/components/button")).toHaveLength(0);
    expect(visit("react")).toHaveLength(0);
    expect(visit("./view.tsx")).toHaveLength(0);
    expect(visit("@ktb/db", "type")).toHaveLength(0);
  });

  it("ignores non-client entry files", () => {
    const ctx = makeContext("/repo/plugins/demo/src/index.ts");
    (plugin.rules as any)["client-contract"]
      .create(ctx)
      .ImportDeclaration(importDecl("@ktb/db", ["db"]));
    expect(ctx.reports).toHaveLength(0);
  });
});
