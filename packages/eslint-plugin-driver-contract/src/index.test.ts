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

const importDecl = (source: string, names: string[]) => ({
  type: "ImportDeclaration",
  importKind: "value",
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

const runProgram = (filename: string, body: unknown[]) => {
  const ctx = makeContext(filename);
  (plugin.rules as any)["driver-contract"].create(ctx).Program(program(body));
  return ctx.reports;
};

const descriptor = exportConst("recallDriver", { type: "ObjectExpression", properties: [] });

describe("arch-driver/driver-contract", () => {
  it("flags untyped driver descriptors", () => {
    expect(runProgram("/repo/packages/bot/src/drivers.ts", [descriptor])).toHaveLength(1);
  });

  it("accepts descriptors when Driver is imported", () => {
    expect(
      runProgram("/repo/packages/bot/src/drivers.ts", [
        importDecl("@ktb/driver-framework", ["Driver"]),
        descriptor,
      ]),
    ).toHaveLength(0);
  });

  it("ignores function exports but still flags descriptors in any file", () => {
    const fnExport = {
      type: "ExportNamedDeclaration",
      declaration: {
        type: "FunctionDeclaration",
        id: id("resolveDriver"),
      },
    };
    expect(runProgram("/repo/packages/bot/src/drivers.ts", [fnExport])).toHaveLength(0);
    expect(runProgram("/repo/packages/bot/src/other.ts", [descriptor])).toHaveLength(1);
  });
});
