import { isPublished } from "@abhi/reader/publication";
import type { SearchEntry } from "@abhi/reader/search";
import { buildSearchIndex } from "@abhi/reader/search-index";
import { getCollection } from "astro:content";

export async function getSearchIndex(): Promise<SearchEntry[]> {
	const [things, links, blog, weeknotes] = await Promise.all([
		getCollection("things", isPublished),
		getCollection("links"),
		getCollection("blog", isPublished),
		getCollection("weeknotes"),
	]);
	return buildSearchIndex([
		...things.map(({ id, data }) => ({
			app: "journal" as const,
			title: data.title,
			url: `/things/${id}/`,
			date: data.date,
			description: data.description,
		})),
		...links.map(({ id, data }) => ({
			app: "journal" as const,
			title: data.link.title,
			url: `/links/${id}/`,
			date: data.date,
			description: "",
		})),
		...blog.map(({ id, data }) => ({
			app: "blog" as const,
			title: data.title,
			url: `https://abhi.now/blog/${id}/`,
			date: data.date,
			description: data.description,
		})),
		...weeknotes.map(({ id, data }) => ({
			app: "weeknotes" as const,
			title: data.title,
			url: `https://abhi.now/weeknotes/${id}/`,
			date: data.publishedDate ?? data.toDate,
			description: data.description,
		})),
	]);
}
