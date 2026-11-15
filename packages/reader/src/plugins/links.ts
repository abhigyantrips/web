import { parseFragment, serialize, type DefaultTreeAdapterMap } from "parse5";
import type { HastPluginDefinition, HastPluginEntry } from "satteri";

export interface LinkOptions {
	canonicalOrigin: string;
	/** Resolve the authored document's URL, not the current output page's URL. */
	documentPath: (fileURL: URL) => string | undefined;
	/** Each interface declares which destinations it can present locally. */
	isLocalPath: (pathname: string, sourcePath: string) => boolean;
}

export function resolveContentLink(href: string, sourcePath: string, options: LinkOptions) {
	if (!href || href.startsWith("#")) return { href, newTab: false };
	let url: URL;
	try {
		url = new URL(href, new URL(`${sourcePath.replace(/\/$/, "")}/`, options.canonicalOrigin));
	} catch {
		return { href, newTab: false };
	}
	if (!["https:", "http:"].includes(url.protocol)) return { href, newTab: false };
	const pathname = url.pathname.replace(/\/$/, "") || "/";
	if (
		url.origin === new URL(options.canonicalOrigin).origin &&
		options.isLocalPath(pathname, sourcePath)
	) {
		return {
			href: `${pathname === "/" ? "/" : `${pathname}/`}${url.search}${url.hash}`,
			newTab: false,
		};
	}
	return { href: url.href, newTab: true };
}

/** Handles ordinary Markdown links and literal HTML/MDX anchors at compile time. */
export function contentLinks(options: LinkOptions): HastPluginEntry {
	return ({ fileURL }) => {
		const sourcePath = fileURL && options.documentPath(fileURL);
		if (!sourcePath) return null;
		return {
			name: "reader-content-links",
			element: {
				filter: ["a"],
				visit(node, ctx) {
					if (node.tagName !== "a" || typeof node.properties.href !== "string") return;
					const link = resolveContentLink(node.properties.href, sourcePath, options);
					ctx.setProperty(node, "href", link.href);
					if (link.newTab) {
						ctx.setProperty(node, "target", "_blank");
						const rel = String(node.properties.rel ?? "")
							.split(/[\s,]+/)
							.filter(Boolean);
						ctx.setProperty(node, "rel", [...new Set([...rel, "noopener", "noreferrer"])]);
					}
				},
			},
			raw(node, ctx) {
				if (!/<a[\s>]/i.test(node.value)) return;
				// Markdown preserves authored HTML as raw nodes. Rewrite just their
				// opening anchor tags, without reparsing or serializing the page.
				const fragment = parseFragment(node.value, { sourceCodeLocationInfo: true });
				const edits: { start: number; end: number; value: string }[] = [];
				const visit = (element: DefaultTreeAdapterMap["childNode"]) => {
					if (!("tagName" in element)) return;
					const tag = element.sourceCodeLocation?.startTag;
					const href = element.attrs.find((attr) => attr.name === "href");
					if (element.tagName === "a" && href && tag) {
						const link = resolveContentLink(href.value, sourcePath, options);
						const attrs = new Map(element.attrs.map(({ name, value }) => [name, value]));
						attrs.set("href", link.href);
						if (link.newTab) {
							attrs.set("target", "_blank");
							attrs.set(
								"rel",
								[
									...new Set([
										...(attrs.get("rel") ?? "").split(/\s+/).filter(Boolean),
										"noopener",
										"noreferrer",
									]),
								].join(" ")
							);
						}
						const anchor = {
							...element,
							attrs: [...attrs].map(([name, value]) => ({ name, value })),
							childNodes: [],
						};
						edits.push({
							start: tag.startOffset,
							end: tag.endOffset,
							value: serialize({ ...fragment, childNodes: [anchor] }).replace(/<\/a>$/, ""),
						});
					}
					for (const child of element.childNodes) visit(child);
				};
				for (const child of fragment.childNodes) visit(child);
				let value = node.value;
				for (const edit of edits.sort((a, b) => b.start - a.start))
					value = value.slice(0, edit.start) + edit.value + value.slice(edit.end);
				if (value !== node.value) ctx.setField(node, "value", value);
			},
			mdxJsxFlowElement: { filter: ["a"], visit: rewriteMdx },
			mdxJsxTextElement: { filter: ["a"], visit: rewriteMdx },
		} satisfies HastPluginDefinition;

		function rewriteMdx(
			node: import("satteri").MdxJsxFlowElementHast | import("satteri").MdxJsxTextElementHast,
			ctx: import("satteri").HastVisitorContext
		) {
			if (node.name !== "a") return;
			const href = node.attributes.find(
				(attr) => attr.type === "mdxJsxAttribute" && attr.name === "href"
			);
			if (!href || href.type !== "mdxJsxAttribute" || typeof href.value !== "string") return;
			const link = resolveContentLink(href.value, sourcePath!, options);
			const updates: Record<string, string> = { href: link.href };
			if (link.newTab) {
				updates.target = "_blank";
				const rel = node.attributes.find(
					(attr) => attr.type === "mdxJsxAttribute" && attr.name === "rel"
				);
				const existing =
					rel?.type === "mdxJsxAttribute" && typeof rel.value === "string"
						? rel.value.split(/\s+/)
						: [];
				updates.rel = [...new Set([...existing, "noopener", "noreferrer"])].join(" ");
			}
			const attributes = [
				...node.attributes.filter(
					(attr) => attr.type !== "mdxJsxAttribute" || !(attr.name in updates)
				),
				...Object.entries(updates).map(([name, value]) => ({
					type: "mdxJsxAttribute" as const,
					name,
					value,
				})),
			];
			if (node.type === "mdxJsxFlowElement") ctx.setField(node, "attributes", attributes);
			else ctx.setField(node, "attributes", attributes);
		}
	};
}
