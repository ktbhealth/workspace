// src/index.ts
const COLOR_UTILITY_RE = new RegExp(`(?:^|[\\s"'\`{(:])(?:[a-zA-Z-]+:)*(?:bg|text|border(?:-[tblrxyse])?|ring|fill|stroke|from|via|to|divide|outline|decoration|caret|accent|shadow|placeholder)-(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}|\\[(?:#|oklch|oklab|rgb|hsl|hwb|lab|lch|color-mix)[^\\]]*\\]|white|black)(?:\\/[\\d.]+%?)?(?![\\w-])`);
const COLOR_MESSAGE = "hardcoded color utility — use theme tokens (bg-primary, text-foreground, bg-destructive, bg-warning/10, …) so runtime themes and WCAG foreground pairs stay automatic (arch-colors/no-hardcoded-colors)";
const plugin = {
	meta: { name: "arch-colors" },
	rules: { "no-hardcoded-colors": { create(context) {
		const check = (node, value) => {
			if (typeof value !== "string" || !COLOR_UTILITY_RE.test(value)) return;
			context.report({
				node,
				message: COLOR_MESSAGE
			});
		};
		return {
			Literal(node) {
				check(node, node.value);
			},
			TemplateLiteral(node) {
				for (const quasi of node.quasis ?? []) {
					const cooked = quasi.value?.cooked ?? quasi.value?.raw;
					if (typeof cooked === "string" && COLOR_UTILITY_RE.test(cooked)) {
						context.report({
							node: quasi,
							message: COLOR_MESSAGE
						});
						return;
					}
				}
			}
		};
	} } }
};
export { plugin as default };
