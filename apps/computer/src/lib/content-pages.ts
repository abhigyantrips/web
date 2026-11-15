import { isPublished } from "@abhi/reader/publication";
import { getCollection } from "astro:content";

/** Computer chooses its routes directly from the shared collections. */
export async function getContentPages() {
	const [posts, notes, folders, projects] = await Promise.all([
		getCollection("blog", isPublished),
		getCollection("weeknotes"),
		getCollection("snippetCollections"),
		getCollection("projects"),
	]);
	return [
		...["blog", "weeknotes", "snippets", "projects"].map((id) => ({
			path: `/${id}`,
			app: id,
			entry: null,
		})),
		{ path: "/snippets/folders", app: "snippets", entry: null },
		...posts.map((entry) => ({ path: `/blog/${entry.id}`, app: "blog", entry })),
		...notes.map((entry) => ({ path: `/weeknotes/${entry.id}`, app: "weeknotes", entry })),
		...projects.map((entry) => ({ path: `/projects/${entry.id}`, app: "projects", entry })),
		...folders.map((entry) => ({
			path: `/snippets/${entry.data.permalink}`,
			app: "snippets",
			entry,
		})),
	];
}
