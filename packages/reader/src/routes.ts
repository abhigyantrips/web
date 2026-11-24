import { getCollection } from "astro:content";
import { isPublished } from "./publication";

/** Shared content inventory; each interface owns its markup and URL policy. */
export async function getReaderContent() {
	const [blog, weeknotes, projects, folders, things, links, tech, fields] = await Promise.all([
		getCollection("blog", isPublished),
		getCollection("weeknotes", isPublished),
		getCollection("projects", isPublished),
		getCollection("snippetCollections", isPublished),
		getCollection("things", isPublished),
		getCollection("links", isPublished),
		getCollection("tech", isPublished),
		getCollection("fields", isPublished),
	]);
	return { blog, weeknotes, projects, folders, things, links, tech, fields };
}

/** Exhaustive document allowlist: never infer a destination for an unknown path. */
export async function getInterfacePaths() {
	const content = await getReaderContent();
	return [
		"/",
		"/journal/",
		"/blog/",
		"/weeknotes/",
		"/projects/",
		"/snippets/",
		"/snippets/folders/",
		"/settings/",
		"/whoami/",
		"/colophon/",
		"/things/",
		"/links/",
		...(["blog", "weeknotes", "projects", "things", "links", "tech", "fields"] as const).flatMap(
			(scope) => content[scope].map((entry) => `/${scope}/${entry.id}/`)
		),
		...content.folders.map((entry) => `/snippets/${entry.data.permalink}/`),
	];
}
