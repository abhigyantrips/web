// @ts-check
import { emDashes } from "@abhi/reader/plugins/em-dashes";
import { contentLinks } from "@abhi/reader/plugins/links";
import cloudflare from "@astrojs/cloudflare";
import { satteri } from "@astrojs/markdown-satteri";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";
import satteriAutolinkParagraphs from "satteri-autolink-paragraphs";
import satteriFigure from "satteri-figure";
const contentRoot = new URL("../../content/", import.meta.url);
export default defineConfig({
	site: "https://abhi.mobile",
	output: "static",
	trailingSlash: "always",
	session: { driver: { entrypoint: "unstorage/drivers/null" } },
	adapter: cloudflare({ imageService: "cloudflare", prerenderEnvironment: "node" }),
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
								properties: { className: ["paragraph-anchor"], "aria-label": "Link to paragraph" },
							}),
				contentLinks({
					canonicalOrigin: "https://abhi.now",
					documentPath(fileURL) {
						if (!fileURL.href.startsWith(contentRoot.href)) return undefined;
						const path = decodeURIComponent(fileURL.href.slice(contentRoot.href.length));
						if (path.startsWith("computer/")) return undefined;
						return `/${path.replace(/\.(md|mdx)$/, "").replace(/\/index$/, "")}`;
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
				}),
			],
		}),
		shikiConfig: { theme: "vitesse-light" },
	},
	integrations: [mdx(), sitemap()],
	vite: { plugins: [tailwindcss()] },
});
