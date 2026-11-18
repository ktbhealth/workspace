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

const importDecl = (source: string, names: (string | { imported: string; local?: string })[]) => ({
  type: "ImportDeclaration",
  importKind: "value",
  source: literal(source),
  specifiers: names.map((n) => {
    const imported = typeof n === "string" ? n : n.imported;
    const local = typeof n === "string" ? n : (n.local ?? n.imported);
    return { type: "ImportSpecifier", local: id(local), imported: id(imported) };
  }),
});

const exportConst = (name: string, init: unknown) => ({
  type: "ExportNamedDeclaration",
  declaration: {
    type: "VariableDeclaration",
    declarations: [{ type: "VariableDeclarator", id: id(name), init }],
  },
});

const program = (body: unknown[]) => ({ type: "Program", body });
const callExpr = (callee: string) => ({
  type: "CallExpression",
  callee: id(callee),
  arguments: [{ type: "ObjectExpression", properties: [] }],
});

const runProgram = (filename: string, body: unknown[]) => {
  const ctx = makeContext(filename);
  (plugin.rules as any)["plugin-contract"].create(ctx).Program(program(body));
  return ctx.reports;
};

describe("arch-plugin-contract/plugin-contract", () => {
  it("accepts a definePlugin entry", () => {
    const reports = runProgram("/repo/plugins/demo/src/index.ts", [
      importDecl("@ktb/kernel", [{ imported: "definePlugin", local: "definePlugin" }]),
      exportConst("plugins", { type: "ArrayExpression", elements: [callExpr("definePlugin")] }),
    ]);
    expect(reports).toHaveLength(0);
  });

  it("flags missing/empty plugins export", () => {
    const reports = runProgram("/repo/plugins/demo/src/index.ts", [
      exportConst("plugins", { type: "ArrayExpression", elements: [] }),
    ]);
    expect(reports).toHaveLength(1);
  });

  it("flags non-definePlugin entries", () => {
    const reports = runProgram("/repo/plugins/demo/src/index.ts", [
      importDecl("@ktb/kernel", [{ imported: "definePlugin", local: "definePlugin" }]),
      exportConst("plugins", {
        type: "ArrayExpression",
        elements: [{ type: "Identifier", name: "notAPlugin" }],
      }),
    ]);
    expect(reports).toHaveLength(1);
  });

  it("ignores non-entry files", () => {
    const reports = runProgram("/repo/plugins/demo/src/other.ts", [
      exportConst("plugins", { type: "ArrayExpression", elements: [] }),
    ]);
    expect(reports).toHaveLength(0);
  });
});
