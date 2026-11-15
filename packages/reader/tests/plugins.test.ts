import assert from "node:assert/strict";
import { test } from "node:test";
import { markdownToHtml, mdxToJs } from "satteri";
import { emDashes } from "../src/plugins/em-dashes.ts";
import { contentLinks, resolveContentLink } from "../src/plugins/links.ts";

const options = {
	canonicalOrigin: "https://abhi.now",
	documentPath: () => "/blog/current",
	isLocalPath: (path: string) => ["/blog", "/blog/other"].includes(path),
};

test("content destinations retain query strings and fragments; other destinations stay canonical", () => {
	assert.deepEqual(
		resolveContentLink("https://abhi.now/blog/other?q=1#paragraph-2", "/blog/current", options),
		{
			href: "/blog/other/?q=1#paragraph-2",
			newTab: false,
		}
	);
	assert.deepEqual(resolveContentLink("../other", "/blog/current", options), {
		href: "/blog/other/",
		newTab: false,
	});
	assert.deepEqual(resolveContentLink("/resume", "/blog/current", options), {
		href: "https://abhi.now/resume",
		newTab: true,
	});
	assert.deepEqual(resolveContentLink("/blog/missing", "/blog/current", options), {
		href: "https://abhi.now/blog/missing",
		newTab: true,
	});
	for (const href of ["#paragraph-1", "mailto:hello@example.com", "tel:123"]) {
		assert.deepEqual(resolveContentLink(href, "/blog/current", options), { href, newTab: false });
	}
});

test("Markdown links are rewritten during compilation and external rel attributes are preserved", () => {
	const { html } = markdownToHtml(
		'[Local](/blog/other) [Resume](/resume) <a href="https://example.com" rel="author">Author</a>',
		{
			fileURL: new URL("file:///content/blog/current.md"),
			hastPlugins: [contentLinks(options)],
		}
	);
	assert.match(html, /href="\/blog\/other\/"/);
	assert.match(html, /href="https:\/\/abhi.now\/resume" target="_blank" rel="noopener noreferrer"/);
	assert.match(html, /rel="author noopener noreferrer"/);
});

test("literal MDX anchors receive link policy while expression URLs remain authored", () => {
	const { code } = mdxToJs('<a href="/resume">Resume</a>\n\n<a href={destination}>Dynamic</a>', {
		fileURL: new URL("file:///content/blog/current.mdx"),
		hastPlugins: [contentLinks(options)],
	});
	assert.match(code, /https:\/\/abhi.now\/resume/);
	assert.match(code, /noopener noreferrer/);
	assert.match(code, /destination/);
});

test("dash conversion applies to prose and leaves inline and fenced code alone", () => {
	const { html } = markdownToHtml("one -- two\n\n`a--b`\n\n```js\na--b\n```", {
		features: { smartPunctuation: { dashes: false } },
		mdastPlugins: [emDashes()],
	});
	assert.match(html, /one — two/);
	assert.match(html, /<code>a--b<\/code>/);
	assert.match(html, /a--b\n<\/code>/);
});
