import type { MdastPluginDefinition } from "satteri";

/** Text visitors leave code blocks and inline code untouched. */
export function emDashes(): MdastPluginDefinition {
	return {
		name: "en-dash-conversion",
		text(node, ctx) {
			if (node.value.includes("--")) {
				ctx.setProperty(node, "value", node.value.replaceAll("--", "—"));
			}
		},
	};
}
