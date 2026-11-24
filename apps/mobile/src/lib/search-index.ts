import { getReaderContent } from "@abhi/reader/routes";
import { buildSearchIndex } from "@abhi/reader/search-index";
import { applications } from "../data/applications";
export async function getSearchIndex() {
	const c = await getReaderContent();
	return buildSearchIndex([
		...applications.map((app) => ({
			app: app.id,
			title: app.title,
			description: app.description,
			url: `/${app.id}/`,
			date: new Date(0),
		})),
		...c.blog.map(({ id, data }) => ({
			app: "blog",
			title: data.title,
			description: data.description,
			url: `/blog/${id}/`,
			date: data.date,
		})),
		...c.weeknotes.map(({ id, data }) => ({
			app: "weeknotes",
			title: data.title,
			description: data.description,
			url: `/weeknotes/${id}/`,
			date: data.publishedDate ?? data.toDate,
		})),
		...c.projects.map(({ id, data }) => ({
			app: "projects",
			title: data.title,
			description: data.description,
			url: `/projects/${id}/`,
			date: data.startDate,
		})),
		...c.things.map(({ id, data }) => ({
			app: "journal",
			title: data.title,
			description: data.description,
			url: `/things/${id}/`,
			date: data.date,
		})),
		...c.links.map(({ id, data }) => ({
			app: "journal",
			title: data.link.title,
			url: `/links/${id}/`,
			date: data.date,
		})),
	]);
}
