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

const id = (name: string) => ({ type: "Identifier", name });
const literal = (value: unknown) => ({ type: "Literal", value });

const importDecl = (source: string, names: string[], importKind = "value") => ({
  type: "ImportDeclaration",
  importKind,
  source: literal(source),
  specifiers: names.map((n) => ({
    type: "ImportSpecifier",
    local: id(n),
    imported: id(n),
  })),
});

const exportConst = (name: string, init: unknown) => ({
  type: "ExportNamedDeclaration",
  declaration: {
    type: "VariableDeclaration",
    declarations: [{ type: "VariableDeclarator", id: id(name), init }],
  },
});

const program = (body: unknown[]) => ({ type: "Program", body });

const routeFile = "/repo/plugins/demo/src/api-routes/jobs.ts";
const helperImport = () => importDecl("@ktb/server-fns", ["createPluginApiRoute"]);
const routeExport = () =>
  exportConst("Route", {
    type: "CallExpression",
    callee: id("createPluginApiRoute"),
    arguments: [literal("demo.routes")],
  });

describe("arch-api-route-gate/plugin-api-route-gate", () => {
  it("flags bare createFileRoute imports", () => {
    const ctx = makeContext(routeFile);
    const visitor = (plugin.rules as any)["plugin-api-route-gate"].create(ctx);
    visitor.Program(
      program([
        importDecl("@tanstack/react-router", ["createFileRoute"]),
        helperImport(),
        routeExport(),
      ]),
    );
    expect(ctx.reports).toHaveLength(1);
  });

  it("flags Route exports without the helper import", () => {
    const ctx = makeContext(routeFile);
    (plugin.rules as any)["plugin-api-route-gate"].create(ctx).Program(program([routeExport()]));
    expect(ctx.reports).toHaveLength(1);
  });

  it("flags wrong gate id literals", () => {
    const ctx = makeContext(routeFile);
    const visitor = (plugin.rules as any)["plugin-api-route-gate"].create(ctx);
    visitor.Program(program([helperImport(), routeExport()]));
    visitor.CallExpression({
      type: "CallExpression",
      callee: id("createPluginApiRoute"),
      arguments: [literal("other.routes")],
    });
    expect(ctx.reports).toHaveLength(1);
  });

  it("accepts a correctly gated route", () => {
    const ctx = makeContext(routeFile);
    const visitor = (plugin.rules as any)["plugin-api-route-gate"].create(ctx);
    visitor.Program(program([helperImport(), routeExport()]));
    visitor.CallExpression({
      type: "CallExpression",
      callee: id("createPluginApiRoute"),
      arguments: [literal("demo.routes")],
    });
    expect(ctx.reports).toHaveLength(0);
  });

  it("ignores page routes and test files", () => {
    for (const file of [
      "/repo/plugins/demo/src/routes/index.tsx",
      "/repo/plugins/demo/src/api-routes/jobs.test.ts",
    ]) {
      const ctx = makeContext(file);
      const visitor = (plugin.rules as any)["plugin-api-route-gate"].create(ctx);
      visitor.Program?.(program([importDecl("@tanstack/react-router", ["createFileRoute"])]));
      expect(ctx.reports).toHaveLength(0);
    }
  });
});
