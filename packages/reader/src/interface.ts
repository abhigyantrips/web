export type ReaderInterface = "computer" | "mobile";
export interface InterfaceConfig {
	current: ReaderInterface;
	enabled: boolean;
	origins: Record<ReaderInterface, string>;
	paths: string[];
	/** Only an explicit pair enables redirects on nonproduction hosts. */
	localOrigins?: Record<ReaderInterface, string>;
}
export const INTERFACE_MIN_WIDTH = 768;
// Activate only after Mobile's production deployment has been validated.
export const INTERFACE_REDIRECTS_ENABLED = false;
export const INTERFACE_ORIGINS = {
	computer: "https://abhi.computer",
	mobile: "https://abhi.mobile",
};

/** Pure decision used on initial document loads and Astro navigations. */
export function interfaceDestination(
	config: InterfaceConfig,
	href: string,
	wide: boolean,
	preference?: string
): string | null {
	const url = new URL(href);
	const origins = config.localOrigins ?? config.origins;
	if (url.origin !== origins[config.current]) return null;
	const explicit = url.searchParams.get("interface");
	const saved = preference === "computer" || preference === "mobile" ? preference : undefined;
	const choice =
		explicit === "automatic"
			? undefined
			: explicit === "computer" || explicit === "mobile"
				? explicit
				: saved;
	if (!choice && !config.enabled && !config.localOrigins) return null;
	const target =
		choice === "computer" || choice === "mobile" ? choice : wide ? "computer" : "mobile";
	if (target === config.current) return null;
	const path = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
	const mapped = path === "/desktop/" ? "/" : path === "/credits/" ? "/colophon/" : path;
	if (!config.paths.includes(mapped)) return null;
	const destination = new URL(mapped, origins[target]);
	destination.search = url.search;
	destination.hash = url.hash;
	if (choice === "computer" || choice === "mobile")
		destination.searchParams.set("interface", choice);
	return destination.href;
}

/** Self-contained because its source is embedded synchronously in each head. */
export function installInterfaceNavigation(
	config: InterfaceConfig,
	minWidth: number,
	decide: typeof interfaceDestination
) {
	const runtime = window as Window & { __abhiInterface?: boolean };
	if (runtime.__abhiInterface) return;
	runtime.__abhiInterface = true;
	const key = "abhi.reader.interface";
	let preference: string | undefined;
	try {
		preference = sessionStorage.getItem(key) ?? undefined;
	} catch {}
	const readSelection = (url: URL) => {
		const selected = url.searchParams.get("interface");
		if (selected === "computer" || selected === "mobile" || selected === "automatic") {
			preference = selected === "automatic" ? undefined : selected;
			try {
				if (preference) sessionStorage.setItem(key, preference);
				else sessionStorage.removeItem(key);
			} catch {}
		}
	};
	const navigate = (url: URL) => {
		readSelection(url);
		const target = decide(
			config,
			url.href,
			window.matchMedia(`(min-width: ${minWidth}px)`).matches,
			preference
		);
		if (!target) return false;
		try {
			window.location.replace(target);
			return true;
		} catch {
			return false;
		}
	};
	const carry = (url: URL) => {
		if (
			url.origin !== location.origin ||
			/\.[a-z0-9]+$/i.test(url.pathname) ||
			url.pathname.startsWith("/api/")
		)
			return;
		if (!url.searchParams.has("interface") && preference)
			url.searchParams.set("interface", preference);
	};
	const updateLink = (link: HTMLAnchorElement) => {
		const url = new URL(link.href, location.href);
		const carried = link.dataset.interfaceCarried;
		if (carried && url.searchParams.get("interface") === carried)
			url.searchParams.delete("interface");
		delete link.dataset.interfaceCarried;
		const hadSelection = url.searchParams.has("interface");
		carry(url);
		if (!hadSelection && url.searchParams.has("interface"))
			link.dataset.interfaceCarried = url.searchParams.get("interface")!;
		link.href = url.href;
		return url;
	};
	const decorate = () => {
		document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
			if (!link.hasAttribute("download")) updateLink(link);
		});
	};
	const current = new URL(location.href);
	if (navigate(current)) return;
	if (current.searchParams.get("interface") === "automatic") {
		current.searchParams.delete("interface");
		history.replaceState(history.state, "", current.href);
	}
	document.addEventListener("astro:before-preparation", (event) => {
		const navigation = event as Event & { to: URL; preventDefault(): void };
		if (!navigation.to || navigation.to.origin !== location.origin) return;
		carry(navigation.to);
		if (navigate(navigation.to)) navigation.preventDefault();
	});
	// Also cover dynamically created links and ordinary document navigation.
	document.addEventListener(
		"click",
		(event) => {
			const link =
				event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
			if (
				!link ||
				link.hasAttribute("download") ||
				(link.target && link.target !== "_self") ||
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			)
				return;
			const url = updateLink(link);
			if (url.origin !== location.origin) return;
			const current = new URL(location.href);
			if (
				url.pathname === current.pathname &&
				url.search === current.search &&
				url.hash !== current.hash
			)
				return;
			if (navigate(url)) event.preventDefault();
		},
		true
	);
	document.addEventListener("astro:page-load", () => {
		const url = new URL(location.href);
		readSelection(url);
		if (url.searchParams.get("interface") === "automatic") {
			url.searchParams.delete("interface");
			history.replaceState(history.state, "", url.href);
		}
		decorate();
	});
	document.addEventListener("DOMContentLoaded", decorate, { once: true });
	if (document.readyState !== "loading") decorate();
}
