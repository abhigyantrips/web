// @ts-check
import { defineConfig, fontProviders } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import cloudflare from "@astrojs/cloudflare";

import { emDashes } from "@abhi/reader/plugins/em-dashes";
import { contentLinks } from "@abhi/reader/plugins/links";
import { satteri } from "@astrojs/markdown-satteri";
import satteriAutolinkParagraphs from "satteri-autolink-paragraphs";
import satteriFigure from "satteri-figure";

import { codeMetaTransformer } from "./src/lib/shiki-transformers.ts";

import mdx from "@astrojs/mdx";

import sitemap from "@astrojs/sitemap";
// Source documents belong to the shared content tree. Route policy belongs to this reader.
const contentRoot = new URL("../../content/", import.meta.url);
const links = contentLinks({
	canonicalOrigin: "https://abhi.now",
	documentPath(fileURL) {
		if (!fileURL.href.startsWith(contentRoot.href)) return undefined;
		const relative = decodeURIComponent(fileURL.href.slice(contentRoot.href.length));
		// Journal content has its own routes and presentation.
		if (relative.startsWith("computer/")) return undefined;
		return `/${relative.replace(/\.(md|mdx)$/, "").replace(/\/index$/, "")}`;
	},
	isLocalPath(pathname, sourcePath) {
		const scope = sourcePath.split("/")[1];
		if (pathname.split("/")[1] !== scope || /\.[a-z0-9]+$/i.test(pathname)) return false;
		if (scope === "blog") return /^\/blog(?:\/[^/]+)?$/.test(pathname);
		if (scope === "weeknotes") return /^\/weeknotes(?:\/\d{4}\/\d+)?$/.test(pathname);
		if (scope === "projects")
			return pathname === "/projects" || /^\/projects\/[^/]+\/[^/]+$/.test(pathname);
		if (scope === "snippets") return /^\/snippets(?:\/[^/]+)?$/.test(pathname);
		return false;
	},
});

// https://astro.build/config
export default defineConfig({
	site: "https://abhi.computer",
	output: "static",
	trailingSlash: "always",

	session: {
		driver: {
			entrypoint: "unstorage/drivers/null",
		},
	},

	adapter: cloudflare({
		imageService: "cloudflare",
		// Static content routes use Astro's Node renderer in development and at build time.
		prerenderEnvironment: "node",
	}),

	fonts: [
		{
			provider: fontProviders.fontsource(),
			name: "Sour Gummy",
			cssVariable: "--font-gummy",
			weights: [400, 600],
			styles: ["normal", "italic"],
			formats: ["woff2"],
		},
		{
			provider: fontProviders.fontsource(),
			name: "Atkinson Hyperlegible",
			cssVariable: "--font-atkinson",
			weights: [400, 700],
			styles: ["normal", "italic"],
			formats: ["woff2"],
		},
		{
			provider: fontProviders.fontsource(),
			name: "Maple Mono",
			cssVariable: "--font-mono",
		},
	],

	markdown: {
		processor: satteri({
			features: { smartPunctuation: { dashes: false } },
			mdastPlugins: [emDashes()],
			hastPlugins: [
				({ fileURL }) =>
					fileURL?.pathname.includes("/content/snippets/") ? null : satteriFigure(),
				({ fileURL }) =>
					fileURL?.pathname.includes("/content/snippets/")
						? null
						: satteriAutolinkParagraphs({
								paragraphProperties: { className: ["group"] },
								properties: {
									className: [
										"hidden md:inline invisible group-hover:visible no-underline text-(--color-text)/50",
									],
								},
							}),
				links,
			],
		}),
		shikiConfig: {
			themes: {
				light: "vitesse-light",
				dark: "vitesse-dark",
			},
			transformers: [codeMetaTransformer],
		},
	},

	integrations: [mdx(), sitemap()],

	vite: {
		plugins: [tailwindcss()],
	},
});
