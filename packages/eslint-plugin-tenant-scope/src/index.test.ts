import { describe, expect, it } from "vitest";

import plugin from "./index";

// Fake Oxlint context: visitors are looked up by node type on the object
// returned from rule.create(context); context.report collects diagnostics.

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
const callExpr = (callee: string) => ({
  type: "CallExpression",
  callee: id(callee),
  arguments: [{ type: "ObjectExpression", properties: [] }],
});

const memberCall = (method: string, argName: string | null) => ({
  type: "CallExpression",
  callee: {
    type: "MemberExpression",
    computed: false,
    property: id(method),
  },
  arguments: argName === null ? [] : [id(argName)],
});

const rule = () => (plugin.rules as any)["tenant-scope"];

describe("arch-tenant/tenant-scope", () => {
  it("records tenantTable exports from schema modules", () => {
    const ctx = makeContext("/repo/plugins/demo/src/schema.ts");
    rule()
      .create(ctx)
      .Program(
        program([
          importDecl("@ktb/tenant", ["tenantTable"]),
          exportConst("docs", callExpr("tenantTable")),
        ]),
      );
    expect(ctx.reports).toHaveLength(0);
  });

  it("flags raw queries on imported tenant tables", () => {
    const ctx = makeContext("/repo/plugins/demo/src/service.ts");
    const visitor = rule().create(ctx);
    visitor.Program(program([importDecl("./schema.ts", ["docs"])]));
    visitor.CallExpression(memberCall("from", "docs"));
    visitor.CallExpression(memberCall("insert", "docs"));
    expect(ctx.reports).toHaveLength(2);
  });

  it("flags db.query.<tenantTable> relational access", () => {
    const ctx = makeContext("/repo/plugins/demo/src/rel.ts");
    const visitor = rule().create(ctx);
    visitor.Program(program([importDecl("./schema.ts", ["docs"])]));
    visitor.MemberExpression({
      type: "MemberExpression",
      computed: false,
      property: id("docs"),
      object: {
        type: "MemberExpression",
        computed: false,
        property: id("query"),
        object: id("db"),
      },
    });
    expect(ctx.reports).toHaveLength(1);
  });

  it("flags .delete(tenantTable) but not other tables", () => {
    const ctx = makeContext("/repo/plugins/demo/src/ok.ts");
    const visitor = rule().create(ctx);
    visitor.Program(program([importDecl("./schema.ts", ["docs"])]));
    visitor.CallExpression(memberCall("from", "otherTable"));
    visitor.CallExpression(memberCall("delete", "docs"));
    expect(ctx.reports).toHaveLength(1);
  });

  it("exempts test files", () => {
    const ctx = makeContext("/repo/plugins/demo/src/service.test.ts");
    const visitor = rule().create(ctx);
    visitor.Program(program([importDecl("./schema.ts", ["docs"])]));
    visitor.CallExpression(memberCall("from", "docs"));
    expect(ctx.reports).toHaveLength(0);
  });
});
