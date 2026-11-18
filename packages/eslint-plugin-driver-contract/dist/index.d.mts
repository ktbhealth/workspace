/**
 * eslint-plugin-driver-contract — Oxlint JS plugin.
 *
 * Plugin id: `arch-driver` — rule id `arch-driver/driver-contract`.
 *
 * Any file exporting a `*Driver`/`*Drivers` descriptor (object or array
 * literal) must import `Driver` from `@ktb/driver-framework`, keeping
 * port→impl selection typed. Function exports that merely end in
 * *Driver(s) — e.g. driver-framework's own `resolveDriver` helpers —
 * are not descriptors and are ignored.
 *
 * Enable via `lint.jsPlugins` + `lint.overrides` on source trees that
 * declare driver descriptors.
 */
type AstNode = any;
type RuleContext = {
  filename: string;
  report: (diagnostic: { node: AstNode; message: string }) => void;
};
type Visitor = Record<string, ((node: AstNode) => void) | undefined>;
type Rule = {
  create: (context: RuleContext) => Visitor;
};
declare const plugin: {
  meta: {
    name: string;
  };
  rules: {
    "driver-contract": Rule;
  };
};
export { plugin as default };
