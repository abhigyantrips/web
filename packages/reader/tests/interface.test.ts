import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import {
	installInterfaceNavigation,
	INTERFACE_MIN_WIDTH,
	INTERFACE_ORIGINS,
	interfaceDestination,
	type InterfaceConfig,
} from "../src/interface.ts";
const config: InterfaceConfig = {
	current: "computer",
	enabled: true,
	origins: INTERFACE_ORIGINS,
	paths: ["/", "/blog/deep/", "/settings/", "/colophon/"],
};
test("complementary viewport choices preserve deep links, query and fragments", () => {
	assert.equal(INTERFACE_MIN_WIDTH, 768);
	for (const width of [767, 768]) {
		assert.equal(
			interfaceDestination(
				config,
				"https://abhi.computer/blog/deep/?q=hello#paragraph",
				width >= INTERFACE_MIN_WIDTH
			),
			width === 767 ? "https://abhi.mobile/blog/deep/?q=hello#paragraph" : null
		);
		assert.equal(
			interfaceDestination(
				{ ...config, current: "mobile" },
				"https://abhi.mobile/blog/deep/?q=hello#paragraph",
				width >= INTERFACE_MIN_WIDTH
			),
			width === 768 ? "https://abhi.computer/blog/deep/?q=hello#paragraph" : null
		);
	}
});
test("explicit selections override viewport and propagate across origins", () => {
	assert.equal(
		interfaceDestination(config, "https://abhi.computer/settings/?interface=computer", false),
		null
	);
	assert.equal(
		interfaceDestination(config, "https://abhi.computer/settings/?interface=mobile&x=1#hash", true),
		"https://abhi.mobile/settings/?interface=mobile&x=1#hash"
	);
	assert.equal(
		interfaceDestination(config, "https://abhi.computer/settings/", true, "mobile"),
		"https://abhi.mobile/settings/?interface=mobile"
	);
	assert.equal(
		interfaceDestination(
			config,
			"https://abhi.computer/settings/?interface=automatic",
			true,
			"mobile"
		),
		null
	);
});
test("unknown documents and nonproduction hosts never redirect by default", () => {
	for (const path of ["/missing/", "/rss.xml", "/search-index.json", "/api/hello/"])
		assert.equal(interfaceDestination(config, `https://abhi.computer${path}`, false), null);
	for (const origin of [
		"http://localhost:4322",
		"https://preview.workers.dev",
		"https://abhi.now",
		"https://chhotu.abhi.now",
	])
		assert.equal(interfaceDestination(config, `${origin}/`, false), null);
	assert.equal(
		interfaceDestination({ ...config, enabled: false }, "https://abhi.computer/", false),
		null
	);
	assert.equal(
		interfaceDestination({ ...config, enabled: false }, "https://abhi.computer/", false, "bad"),
		null
	);
	assert.equal(
		interfaceDestination(
			{
				...config,
				localOrigins: { computer: "http://localhost:4322", mobile: "http://localhost:4324" },
			},
			"http://localhost:4322/",
			false
		),
		"http://localhost:4324/"
	);
});
test("interface-only paths have explicit mappings", () => {
	assert.equal(
		interfaceDestination(config, "https://abhi.computer/desktop/?q=1#x", false),
		"https://abhi.mobile/?q=1#x"
	);
	assert.equal(
		interfaceDestination(config, "https://abhi.computer/credits/", false),
		"https://abhi.mobile/colophon/"
	);
});

function browser(href: string, wide = false, storageBlocked = false) {
	const handlers = new Map<string, ((e: any) => void)[]>();
	const replaced: string[] = [];
	const stored = new Map<string, string>();
	const location = {
		...new URL(href),
		href,
		origin: new URL(href).origin,
		replace: (url: string) => replaced.push(url),
	};
	const links: {
		href: string;
		dataset: Record<string, string>;
		hasAttribute: (name: string) => boolean;
	}[] = [];
	const document = {
		readyState: "complete",
		querySelectorAll: () => links,
		addEventListener: (name: string, fn: (e: any) => void) =>
			handlers.set(name, [...(handlers.get(name) ?? []), fn]),
	};
	const window = {
		location,
		matchMedia: (query: string) => {
			assert.equal(query, "(min-width: 768px)");
			return { matches: wide };
		},
	};
	const sandbox = {
		window,
		location,
		document,
		URL,
		Element: class {},
		sessionStorage: {
			getItem: (key: string) => {
				if (storageBlocked) throw Error();
				return stored.get(key);
			},
			setItem: (key: string, value: string) => {
				if (storageBlocked) throw Error();
				stored.set(key, value);
			},
			removeItem: (key: string) => stored.delete(key),
		},
		history: {
			state: null,
			replaceState: (_a: any, _b: any, url: string) => {
				location.href = url;
			},
		},
	};
	const run = () =>
		vm.runInNewContext(
			`(${installInterfaceNavigation.toString()})(${JSON.stringify(config)},${INTERFACE_MIN_WIDTH},${interfaceDestination.toString()})`,
			sandbox
		);
	return { run, window, handlers, replaced, stored, location, links };
}
test("serialized early script redirects using replace before registering shell handlers", () => {
	const b = browser("https://abhi.computer/blog/deep/?q=1#x");
	b.run();
	assert.deepEqual(b.replaced, ["https://abhi.mobile/blog/deep/?q=1#x"]);
});
test("Astro handlers register once and only evaluate a changed viewport on navigation", () => {
	const b = browser("https://abhi.computer/", true, true);
	b.run();
	b.run();
	assert.equal(b.handlers.get("astro:before-preparation")?.length, 1);
	assert.equal(b.handlers.has("resize"), false);
	b.window.matchMedia = () => ({ matches: false });
	assert.equal(b.replaced.length, 0);
	let prevented = false;
	b.handlers.get("astro:before-preparation")![0]({
		to: new URL("https://abhi.computer/blog/deep/?q=1#x"),
		preventDefault: () => {
			prevented = true;
		},
	});
	assert.equal(prevented, true);
	assert.deepEqual(b.replaced, ["https://abhi.mobile/blog/deep/?q=1#x"]);
});
test("automatic clears a saved override before redirecting", () => {
	const b = browser("https://abhi.computer/settings/?interface=computer", false);
	b.run();
	assert.equal(b.stored.get("abhi.reader.interface"), "computer");
	b.handlers.get("astro:before-preparation")![0]({
		to: new URL("https://abhi.computer/settings/?interface=automatic"),
		preventDefault: () => {},
	});
	assert.equal(b.stored.has("abhi.reader.interface"), false);
	assert.deepEqual(b.replaced, ["https://abhi.mobile/settings/?interface=automatic"]);
});
test("a failed replace leaves the document visible and installs normal navigation", () => {
	const b = browser("https://abhi.computer/");
	b.window.location.replace = () => {
		throw Error("blocked");
	};
	b.run();
	assert.equal(b.handlers.get("DOMContentLoaded")?.length, 1);
});

test("carried preferences clear without overwriting dynamic desktop links", () => {
	const b = browser("https://abhi.computer/settings/?interface=computer", true);
	const link = {
		href: "https://abhi.computer/blog/deep/",
		dataset: {} as Record<string, string>,
		hasAttribute: () => false,
	};
	b.links.push(link);
	b.run();
	assert.equal(new URL(link.href).searchParams.get("interface"), "computer");
	link.href = "https://abhi.computer/blog/deep/?dynamic=1#updated";
	b.handlers.get("astro:page-load")![0]({});
	assert.equal(new URL(link.href).searchParams.get("dynamic"), "1");
	assert.equal(new URL(link.href).hash, "#updated");
	b.location.href = "https://abhi.computer/settings/?interface=automatic";
	b.handlers.get("astro:page-load")![0]({});
	assert.equal(new URL(link.href).searchParams.has("interface"), false);
	assert.equal(new URL(b.location.href).searchParams.has("interface"), false);
});
